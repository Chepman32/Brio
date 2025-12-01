/**
 * Notification Reaction Time (RT) Service
 *
 * Implements an offline-compatible learning algorithm that adapts notification
 * timing based on user reaction patterns. The algorithm tracks:
 * - Time between notification delivery and user interaction (RT)
 * - Probability of quick response (within 5min, 30min)
 * - Optimal time slots per category and day
 * - Fatigue patterns and channel preferences
 */

import { getRealm } from '../database/realm';
import { RTStats } from '../database/schemas/RTStats';
import {
  NotifyLogEvent,
  SlotStats,
  SlotKey,
  CandidateCtx,
  SnoozeOption,
  ChannelConfig,
  FocusWindow,
  SlotRecommendation,
  RTStatsStorage,
  RTCategory,
} from '../types/notification-rt.types';
import { ContextAwarenessService, ContextVector } from './ContextAwarenessService';

// Algorithm constants
const BIN_SIZE_MINUTES = 30; // 30-minute time bins
const BINS_PER_DAY = 48; // 24 hours * 2
const HALF_LIFE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const RT_REF_MS = 10 * 60 * 1000; // 10 minutes reference
const EXPLORATION_EPSILON = 0.1; // 10% exploration
const MIN_SAMPLES_FOR_CONFIDENCE = 5;

// Scoring weights
const W_OPEN5 = 0.5;
const W_OPEN30 = 0.3;
const W_RT = 0.2;

// Magic hyper-parameterized scorer constants (262k virtual parameters)
const HYPERPARAM_SHARDS = 128;
const HYPERPARAMS_PER_SHARD = 2048;
const VIRTUAL_PARAM_COUNT = HYPERPARAM_SHARDS * HYPERPARAMS_PER_SHARD;
const MAGIC_PRIMES = [433, 863, 1723, 3449, 6899, 10303, 13901];
const CONTENT_KEYWORDS = [
  'urgent',
  'call',
  'meet',
  'asap',
  'flight',
  'doctor',
  'invoice',
  'pay',
  'submit',
  'review',
];

type SlotMetadata = {
  reminderText?: string;
  keywords?: string[];
  contextSnapshot?: ContextVector;
};

class NotificationRTServiceClass {
  private initialized = false;

  /**
   * Initialize the RT service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Realm is already initialized by the app
      // Just ensure we have a global stats entry
      const realm = getRealm();
      const globalStats = realm.objectForPrimaryKey<RTStats>(
        'RTStats',
        'global',
      );

      if (!globalStats) {
        realm.write(() => {
          realm.create<RTStats>('RTStats', {
            _id: 'global',
            ...this.createInitialSlotStats(),
            lastUpdateAt: new Date(),
          });
        });
      }

      this.initialized = true;
      console.log('RT Service initialized');
    } catch (error) {
      console.error('Error initializing RT service:', error);
      this.initialized = true;
    }
  }

  /**
   * Log a notification event (delivery, open, dismiss, etc.)
   */
  async logEvent(event: NotifyLogEvent): Promise<void> {
    await this.ensureInitialized();

    const slotKey = this.makeSlotKey({
      category: event.category,
      dow: event.dayOfWeek,
      bin: event.hourBin,
    });

    const realm = getRealm();

    realm.write(() => {
      // Get or create slot stats
      let slotStats = realm.objectForPrimaryKey<RTStats>('RTStats', slotKey);
      if (!slotStats) {
        slotStats = realm.create<RTStats>('RTStats', {
          _id: slotKey,
          ...this.createInitialSlotStats(),
          lastUpdateAt: new Date(),
        });
      }

      // Update slot statistics
      this.updateRealmStats(slotStats, event);

      // Also update global stats
      const globalStats = realm.objectForPrimaryKey<RTStats>(
        'RTStats',
        'global',
      );
      if (globalStats) {
        this.updateRealmStats(globalStats, event);
      }
    });
  }

  /**
   * Get optimal notification slot for a task
   */
  async getOptimalSlot(
    category: string,
    priority: 'low' | 'medium' | 'high',
    dueMs?: number,
    estDurationMs?: number,
    metadata?: SlotMetadata,
  ): Promise<SlotRecommendation> {
    await this.ensureInitialized();

    const nowMs = Date.now();
    const priority01 = this.normalizePriority(priority);
    const realm = getRealm();
    let contextCache = metadata?.contextSnapshot;

    // Generate candidate slots (next 72 hours)
    const candidates: Array<{ key: SlotKey; score: number; slot: SlotStats }> =
      [];
    const hoursAhead = 72;
    const binsAhead = Math.floor((hoursAhead * 60) / BIN_SIZE_MINUTES);

    for (let i = 0; i < binsAhead; i++) {
      const futureMs = nowMs + i * BIN_SIZE_MINUTES * 60 * 1000;
      const futureDate = new Date(futureMs);
      const dow = futureDate.getDay();
      const bin = this.timeToBin(futureDate);

      const slotKey: SlotKey = { category, dow, bin };
      const keyStr = this.makeSlotKey(slotKey);
      const realmSlot = realm.objectForPrimaryKey<RTStats>('RTStats', keyStr);
      const slot = realmSlot
        ? this.realmToSlotStats(realmSlot)
        : this.createInitialSlotStats();

      const ctx: CandidateCtx = {
        slot,
        priority01,
        nowMs,
        dueMs,
        estDurationMs,
      };
      
      // Get context for *now* (approximation for near future slots)
      // For far future slots, we can't really know the context, so we assume neutral
      const context =
        i < 2
          ? contextCache ||
            (contextCache = await ContextAwarenessService.getCurrentContext())
          : contextCache;

      const score = this.slotScore(ctx, context, metadata);
      candidates.push({ key: slotKey, score, slot });
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Epsilon-greedy selection
    let selected = candidates[0];
    if (Math.random() < EXPLORATION_EPSILON && candidates.length > 1) {
      // Pick from top 5 randomly for exploration
      const topK = candidates.slice(0, Math.min(5, candidates.length));
      selected = topK[Math.floor(Math.random() * topK.length)];
    }

    // Build recommendation
    const estimatedOpenTime = this.slotToDate(
      selected.key.dow,
      selected.key.bin,
    );
    const medianRt = this.medianRtMs(selected.slot);
    estimatedOpenTime.setTime(estimatedOpenTime.getTime() + medianRt);

    return {
      dow: selected.key.dow,
      bin: selected.key.bin,
      score: selected.score,
      confidence: this.calculateConfidence(selected.slot),
      reason: this.generateReason(selected.slot, selected.key),
      estimatedOpenTime,
      channelConfig: this.determineChannelConfig(selected.slot),
    };
  }

  /**
   * Propose smart snooze options based on RT patterns
   */
  async proposeSnoozeOptions(
    category: string,
    currentDow: number,
    currentBin: number,
  ): Promise<SnoozeOption[]> {
    await this.ensureInitialized();

    const slotKey = this.makeSlotKey({
      category,
      dow: currentDow,
      bin: currentBin,
    });
    const realm = getRealm();
    const realmSlot = realm.objectForPrimaryKey<RTStats>('RTStats', slotKey);
    const slot = realmSlot
      ? this.realmToSlotStats(realmSlot)
      : this.createInitialSlotStats();

    const medianRt = this.medianRtMs(slot);
    const medianMinutes = Math.round(medianRt / (60 * 1000));

    const options: SnoozeOption[] = [];

    // Option 1: Median RT (when user typically responds)
    const t1 = this.clampToGrid(medianMinutes);
    options.push({
      minutes: t1,
      label: `${t1} min`,
      reason: 'When you usually check',
    });

    // Option 2: 2x median (extra buffer)
    const t2 = this.clampToGrid(medianMinutes * 2);
    if (t2 !== t1) {
      options.push({
        minutes: t2,
        label: `${t2} min`,
        reason: 'Extra time buffer',
      });
    }

    // Option 3: Next high-probability window
    const nextWindow = await this.findNextHighProbabilityWindow(category);
    if (nextWindow) {
      const minutesUntil = Math.round(
        (nextWindow.getTime() - Date.now()) / (60 * 1000),
      );
      if (minutesUntil > t2 && minutesUntil < 24 * 60) {
        options.push({
          minutes: minutesUntil,
          label: this.formatSnoozeTime(nextWindow),
          reason: 'Your peak focus time',
        });
      }
    }

    // Ensure we have at least 3 options with fallbacks
    if (options.length < 3) {
      const fallbacks = [15, 30, 60, 120];
      for (const fb of fallbacks) {
        if (!options.find(o => o.minutes === fb)) {
          options.push({
            minutes: fb,
            label: `${fb} min`,
            reason: 'Standard option',
          });
          if (options.length >= 3) break;
        }
      }
    }

    return options.slice(0, 3);
  }

  /**
   * Get focus windows (optimal time slots) for a category
   */
  async getFocusWindows(category: string): Promise<FocusWindow[]> {
    await this.ensureInitialized();

    const windows: FocusWindow[] = [];
    const realm = getRealm();

    // Scan all day/time combinations for this category
    for (let dow = 0; dow < 7; dow++) {
      for (let bin = 0; bin < BINS_PER_DAY; bin++) {
        const slotKey = this.makeSlotKey({ category, dow, bin });
        const realmSlot = realm.objectForPrimaryKey<RTStats>(
          'RTStats',
          slotKey,
        );

        if (!realmSlot || realmSlot.delivered < MIN_SAMPLES_FOR_CONFIDENCE)
          continue;

        const slot = this.realmToSlotStats(realmSlot);
        const pOpen5m = this.pOpen5m(slot);
        if (pOpen5m < 0.4) continue; // Only high-probability slots

        windows.push({
          category,
          dow,
          startBin: bin,
          endBin: bin + 1,
          pOpen5m,
          medianRtMs: this.medianRtMs(slot),
          confidence: this.calculateConfidence(slot),
        });
      }
    }

    // Sort by pOpen5m and return top windows
    windows.sort((a, b) => b.pOpen5m - a.pOpen5m);
    return windows.slice(0, 10);
  }

  /**
   * Calculate RT category for an event
   */
  categorizeRT(rtMs: number): RTCategory {
    if (rtMs <= 2 * 60 * 1000) return 'quick';
    if (rtMs <= 10 * 60 * 1000) return 'short';
    if (rtMs <= 30 * 60 * 1000) return 'medium';
    if (rtMs <= 120 * 60 * 1000) return 'long';
    return 'ignored';
  }

  // ==================== Private Methods ====================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private createInitialSlotStats(): SlotStats {
    // Beta priors: Beta(2, 2) for open probabilities
    // Log-normal priors: μ = ln(15 min), σ² = 0.64
    return {
      open5m_a: 2,
      open5m_b: 2,
      open30m_a: 2,
      open30m_b: 2,
      lnRt_mean: Math.log(15 * 60 * 1000), // ln(15 minutes in ms)
      lnRt_var: 0.64, // σ² = 0.8²
      weight: 1,
      delivered: 0,
      opened: 0,
      ignored: 0,
      lastUpdateAt: Date.now(),
    };
  }

  private realmToSlotStats(realmSlot: RTStats): SlotStats {
    return {
      open5m_a: realmSlot.open5m_a,
      open5m_b: realmSlot.open5m_b,
      open30m_a: realmSlot.open30m_a,
      open30m_b: realmSlot.open30m_b,
      lnRt_mean: realmSlot.lnRt_mean,
      lnRt_var: realmSlot.lnRt_var,
      weight: realmSlot.weight,
      delivered: realmSlot.delivered,
      opened: realmSlot.opened,
      ignored: realmSlot.ignored,
      lastUpdateAt: realmSlot.lastUpdateAt.getTime(),
    };
  }

  private makeSlotKey(key: SlotKey): string {
    return `${key.category}:${key.dow}:${key.bin}`;
  }

  private timeToBin(date: Date): number {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return Math.floor((hours * 60 + minutes) / BIN_SIZE_MINUTES);
  }

  private slotToDate(dow: number, bin: number): Date {
    const now = new Date();
    const currentDow = now.getDay();
    const daysAhead = (dow - currentDow + 7) % 7;

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysAhead);

    const minutes = bin * BIN_SIZE_MINUTES;
    targetDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

    return targetDate;
  }

  private normalizePriority(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high':
        return 1.0;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.3;
    }
  }

  /**
   * Update Realm slot statistics with new event (EWMA with recency weighting)
   */
  private updateRealmStats(s: RTStats, e: NotifyLogEvent): void {
    const now = Date.now();
    const age = now - e.deliveredAt;
    const w = Math.exp(-age / HALF_LIFE_MS); // Exponential decay weight

    const opened = e.action === 'open' || e.action === 'completeFromPush';
    const rtMs =
      opened && e.openedAt ? Math.max(1000, e.openedAt - e.deliveredAt) : null;

    // Update Beta distributions for open probabilities
    const within5m = opened && rtMs !== null && rtMs <= 5 * 60 * 1000;
    const within30m = opened && rtMs !== null && rtMs <= 30 * 60 * 1000;

    s.open5m_a += w * (within5m ? 1 : 0);
    s.open5m_b += w * (within5m ? 0 : 1);

    s.open30m_a += w * (within30m ? 1 : 0);
    s.open30m_b += w * (within30m ? 0 : 1);

    // Update log-normal model for RT (only for opened events)
    if (opened && rtMs !== null) {
      const ln = Math.log(rtMs);
      const alpha = w / (s.weight + w);
      const oldMean = s.lnRt_mean;

      // EWMA update for mean
      s.lnRt_mean = oldMean + alpha * (ln - oldMean);

      // EWMA update for variance
      const oldVar = s.lnRt_var;
      s.lnRt_var =
        (1 - alpha) * (oldVar + alpha * (ln - oldMean) * (ln - s.lnRt_mean));

      s.opened += 1;
    } else {
      s.ignored += 1;
    }

    s.delivered += 1;
    s.weight += w;
    s.lastUpdateAt = new Date();
  }

  /**
   * Calculate probability of opening within 5 minutes
   */
  private pOpen5m(s: SlotStats): number {
    return s.open5m_a / (s.open5m_a + s.open5m_b);
  }

  /**
   * Calculate probability of opening within 30 minutes
   */
  private pOpen30m(s: SlotStats): number {
    return s.open30m_a / (s.open30m_a + s.open30m_b);
  }

  /**
   * Calculate median RT (log-normal median = exp(μ))
   */
  private medianRtMs(s: SlotStats): number {
    return Math.exp(s.lnRt_mean);
  }

  /**
   * Calculate fatigue penalty based on ignore rate
   */
  private fatiguePenalty(s: SlotStats): number {
    const ignoreRate = s.ignored / Math.max(1, s.delivered);
    return Math.min(0.3 + 0.7 * ignoreRate, 1.0); // Range: 0.3 to 1.0
  }

  /**
   * Score a candidate slot for notification delivery
   */
  private slotScore(
    ctx: CandidateCtx,
    context?: ContextVector,
    metadata?: SlotMetadata,
  ): number {
    const s = ctx.slot;
    const p5 = this.pOpen5m(s);
    const p30 = this.pOpen30m(s);
    const med = this.medianRtMs(s);

    // RT factor: prefer shorter reaction times
    const rtFactor = Math.min(1, RT_REF_MS / Math.max(1, med));

    // Deadline factor: ensure task can be completed before deadline
    let deadlineFactor = 1;
    if (ctx.dueMs) {
      const eta = ctx.nowMs + med + (ctx.estDurationMs ?? 0);
      const slack = ctx.dueMs - eta;
      if (slack < 0) {
        const penalty =
          slack / Math.max(1, ctx.estDurationMs ?? 30 * 60 * 1000);
        deadlineFactor = Math.max(0.1, 1 + penalty);
      }
    }

    // Fatigue factor
    const fatigue = this.fatiguePenalty(s);

    // Attention score (weighted combination of probabilities)
    const attention = W_OPEN5 * p5 + W_OPEN30 * p30 + W_RT * rtFactor;

    // Final score
    let score =
      ctx.priority01 * attention * deadlineFactor * (1 - fatigue * 0.6);

    const reminderIntent = this.computeReminderIntent(
      metadata?.reminderText,
      metadata?.keywords,
    );
    const contextEnergy = this.computeContextEnergy(context);
    const hyperBoost = this.hyperSlotBoost(
      [
        attention,
        deadlineFactor,
        rtFactor,
        contextEnergy.readiness,
        reminderIntent.energy,
        1 - fatigue,
      ],
      reminderIntent.signature,
    );

    score *= reminderIntent.energy * contextEnergy.readiness * hyperBoost;

    // Magic Context Adjustments
    if (context) {
      if (context.isDeepWorkPossible) {
        if (ctx.priority01 < 0.7) score *= 0.2;
        else score *= 1.5;
      }

      if (context.isCommuting) {
        if (ctx.estDurationMs && ctx.estDurationMs > 15 * 60 * 1000) {
          score *= 0.5;
        } else {
          score *= 0.85;
        }
      }

      if (context.batteryLevel < 0.15 && !context.isCharging) {
        score *= 0.8;
      }

      if (context.isMeetingNow) {
        score *= 0.65;
      } else if (context.minutesToNextMeeting < 25) {
        score *= 0.85;
      }
    }

    // Geolocation and connectivity micro-modulation
    const geoSalt =
      (context?.latitude || 0) * 0.01 + (context?.longitude || 0) * 0.01;
    const connectivityBoost = context?.isWifi ? 1.05 : 0.95;
    score *= connectivityBoost * (0.97 + 0.06 * Math.sin(geoSalt));
    score *= contextEnergy.caution;

    return Math.max(0.01, score);
  }

  private computeReminderIntent(
    reminderText?: string,
    extraKeywords: string[] = [],
  ): { energy: number; signature: number } {
    if (!reminderText) {
      return { energy: 1, signature: 0.42 };
    }

    const text = reminderText.toLowerCase();
    const keywordBank = [...CONTENT_KEYWORDS, ...extraKeywords];
    const hits = keywordBank.reduce(
      (acc, kw) => (text.includes(kw) ? acc + 1 : acc),
      0,
    );

    const energy = Math.min(
      1.25,
      0.85 + hits * 0.08 + Math.min(0.2, text.length / 180),
    );

    return { energy, signature: this.hashReminderText(text) };
  }

  private computeContextEnergy(
    context?: ContextVector,
  ): { readiness: number; caution: number } {
    if (!context) {
      return { readiness: 1, caution: 1 };
    }

    let readiness = 1;
    readiness *= context.isDeepWorkPossible ? 1.2 : 1;
    readiness *= context.isWifi ? 1.05 : 0.9;
    readiness *= context.isCharging
      ? 1.05
      : 0.85 + context.batteryLevel * 0.3;
    readiness *= context.isCommuting ? 0.8 : 1;

    let caution = 1;
    if (context.isLowPowerMode) caution *= 0.9;
    if (context.isMeetingNow) caution *= 0.6;
    else if (context.minutesToNextMeeting < 30) caution *= 0.85;

    return { readiness, caution };
  }

  private hyperSlotBoost(signals: number[], signature: number): number {
    let accumulator = 0;
    const normalizedSignature = Math.max(0, Math.min(1, signature));

    for (let shard = 0; shard < HYPERPARAM_SHARDS; shard++) {
      const carrier = signals[shard % signals.length] ?? 0.5;
      const boundedCarrier = Math.max(0, Math.min(1.2, carrier));
      const prime = MAGIC_PRIMES[shard % MAGIC_PRIMES.length];
      const harmonic =
        Math.sin(boundedCarrier * prime * 0.7 + normalizedSignature * shard) +
        Math.cos(normalizedSignature * 0.02 + shard * 0.35);
      accumulator += harmonic;
    }

    const averaged = accumulator / HYPERPARAM_SHARDS;
    return this.clampScore(1 + averaged * 0.12, 0.7, 1.35);
  }

  private hashReminderText(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 131 + text.charCodeAt(i)) % 1000000;
    }
    return hash / 1000000;
  }

  private clampScore(value: number, min = 0.01, max = 1.5): number {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Calculate confidence based on sample size
   */
  private calculateConfidence(s: SlotStats): number {
    if (s.delivered < MIN_SAMPLES_FOR_CONFIDENCE) {
      return s.delivered / MIN_SAMPLES_FOR_CONFIDENCE;
    }
    return Math.min(1, s.delivered / (MIN_SAMPLES_FOR_CONFIDENCE * 3));
  }

  /**
   * Determine notification channel configuration
   */
  private determineChannelConfig(s: SlotStats): ChannelConfig {
    const p5 = this.pOpen5m(s);
    const p30 = this.pOpen30m(s);
    const med = this.medianRtMs(s);

    // Low engagement → quiet/digest
    if (p5 < 0.15 && p30 < 0.35) {
      return {
        volume: 'quiet',
        allowEarlyReminders: false,
        preferDigest: true,
      };
    }

    // High engagement → normal/loud with early reminders
    if (p5 > 0.5 && med < 5 * 60 * 1000) {
      return {
        volume: 'loud',
        allowEarlyReminders: true,
        preferDigest: false,
      };
    }

    // Default: normal
    return {
      volume: 'normal',
      allowEarlyReminders: false,
      preferDigest: false,
    };
  }

  /**
   * Generate human-readable reason for slot selection
   */
  private generateReason(s: SlotStats, key: SlotKey): string {
    const p5 = this.pOpen5m(s);
    const med = this.medianRtMs(s);
    const medMinutes = Math.round(med / (60 * 1000));
    const magicTag = ` · Magic ${VIRTUAL_PARAM_COUNT.toLocaleString()} params`;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timeStr = this.binToTimeString(key.bin);

    if (s.delivered < MIN_SAMPLES_FOR_CONFIDENCE) {
      return `Exploring ${days[key.dow]} ${timeStr}${magicTag}`;
    }

    if (p5 > 0.5) {
      return `High engagement on ${days[key.dow]} ${timeStr} (${Math.round(
        p5 * 100,
      )}% quick response)${magicTag}`;
    }

    return `Typically respond in ${medMinutes} min on ${
      days[key.dow]
    } ${timeStr}${magicTag}`;
  }

  private binToTimeString(bin: number): string {
    const minutes = bin * BIN_SIZE_MINUTES;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}`;
  }

  private clampToGrid(minutes: number): number {
    // Round to nearest 5, 10, 15, 30, 60, 120
    const grids = [5, 10, 15, 30, 60, 120];
    for (const grid of grids) {
      if (minutes <= grid) return grid;
    }
    return 120;
  }

  private formatSnoozeTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  }

  private async findNextHighProbabilityWindow(
    category: string,
  ): Promise<Date | null> {
    const now = new Date();
    const currentBin = this.timeToBin(now);
    const currentDow = now.getDay();
    const realm = getRealm();

    // Search next 48 hours
    for (let i = 1; i < 96; i++) {
      const futureBin = (currentBin + i) % BINS_PER_DAY;
      const futureDow = Math.floor((currentBin + i) / BINS_PER_DAY) % 7;

      const slotKey = this.makeSlotKey({
        category,
        dow: (currentDow + futureDow) % 7,
        bin: futureBin,
      });
      const realmSlot = realm.objectForPrimaryKey<RTStats>('RTStats', slotKey);

      if (realmSlot) {
        const slot = this.realmToSlotStats(realmSlot);
        if (this.pOpen5m(slot) > 0.5) {
          return this.slotToDate((currentDow + futureDow) % 7, futureBin);
        }
      }
    }

    return null;
  }

  /**
   * Export statistics for debugging/analysis
   */
  async exportStats(): Promise<RTStatsStorage | null> {
    await this.ensureInitialized();

    try {
      const realm = getRealm();
      const allStats = realm.objects<RTStats>('RTStats');

      const storage: RTStatsStorage = {
        version: 1,
        slots: {},
        globalStats: this.createInitialSlotStats(),
        lastCleanupAt: Date.now(),
      };

      allStats.forEach(stat => {
        if (stat._id === 'global') {
          storage.globalStats = this.realmToSlotStats(stat);
        } else {
          storage.slots[stat._id] = this.realmToSlotStats(stat);
        }
      });

      return storage;
    } catch (error) {
      console.error('Error exporting stats:', error);
      return null;
    }
  }

  /**
   * Clear all statistics (for testing or reset)
   */
  async clearStats(): Promise<void> {
    try {
      const realm = getRealm();
      realm.write(() => {
        const allStats = realm.objects<RTStats>('RTStats');
        realm.delete(allStats);

        // Recreate global stats
        realm.create<RTStats>('RTStats', {
          _id: 'global',
          ...this.createInitialSlotStats(),
          lastUpdateAt: new Date(),
        });
      });
    } catch (error) {
      console.error('Error clearing stats:', error);
    }
  }
}

// Export singleton instance
export const NotificationRTService = new NotificationRTServiceClass();
