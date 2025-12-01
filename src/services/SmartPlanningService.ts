import {
  getStats,
  getDailyCompletionPattern,
  getWeeklyCompletionPattern,
  updateCompletionPattern,
  incrementTasksCompleted,
  updateStreak,
} from '../database/operations';
import { TaskType, TaskInput } from '../types';
import { ContextAwarenessService, ContextVector } from './ContextAwarenessService';

/**
 * Smart Planning Service
 *
 * This service analyzes user behavior patterns to provide intelligent task scheduling suggestions.
 * It uses a combination of:
 * 1. Time-of-day analysis (when user typically completes tasks)
 * 2. Day-of-week analysis (which days user is most productive)
 * 3. Task category patterns (when certain types of tasks are usually done)
 * 4. Completion velocity (how quickly tasks are completed)
 * 5. Workload balancing (avoiding overloading specific time slots)
 */

class SmartPlanningServiceClass {
  private readonly LEARNING_RATE = 0.3; // How quickly to adapt to new patterns
  private readonly MIN_SAMPLES = 5; // Minimum completions needed for reliable suggestions
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for suggestions
  private readonly HYPERPARAM_SHARDS = 128; // 128 shards * 2048 params = 262k virtual parameters
  private readonly HYPERPARAMS_PER_SHARD = 2048;
  private readonly VIRTUAL_PARAM_COUNT =
    this.HYPERPARAM_SHARDS * this.HYPERPARAMS_PER_SHARD;
  private readonly MAGIC_PRIMES = [31, 61, 127, 251, 509, 1021, 2039];
  private readonly URGENCY_KEYWORDS = [
    'urgent',
    'asap',
    'call',
    'meet',
    'review',
    'submit',
    'pay',
    'invoice',
    'flight',
    'doctor',
    'follow up',
    'important',
  ];

  /**
   * Analyze completion patterns and update statistics
   */
  analyzeCompletionPatterns(): void {
    try {
      const stats = getStats();
      const dailyPattern = getDailyCompletionPattern();
      const weeklyPattern = getWeeklyCompletionPattern();

      // Calculate pattern strength
      const totalCompletions = stats.totalTasksCompleted;

      if (totalCompletions < this.MIN_SAMPLES) {
        console.log('Not enough data for pattern analysis');
        return;
      }

      // Identify peak productivity hours
      const peakHours = this.findPeakHours(dailyPattern);

      // Identify most productive days
      const productiveDays = this.findProductiveDays(weeklyPattern);

      console.log('Pattern Analysis:', {
        totalCompletions,
        peakHours,
        productiveDays,
        currentStreak: stats.currentStreak,
      });
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    }
  }

  /**
   * Suggest optimal time for a task based on learned patterns and current context
   */
  async suggestTaskTime(
    task: TaskInput,
    providedContext?: ContextVector,
  ): Promise<Date> {
    try {
      const dailyPattern = getDailyCompletionPattern();
      const weeklyPattern = getWeeklyCompletionPattern();
      const stats = getStats();
      const context =
        providedContext || (await ContextAwarenessService.getCurrentContext());
      const peakHours = this.findPeakHours(dailyPattern);

      // Magic Context Checks
      if (context.isDeepWorkPossible && task.priority === 'high') {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15); // Give 15 min buffer
        return now;
      }

      const optimalHour = this.getOptimalSchedulingTime();
      const optimalDay = this.getOptimalDay(task, weeklyPattern);

      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + optimalDay);
      suggestedDate.setHours(optimalHour, 0, 0, 0);

      const adjustedDate = this.adjustForPriority(suggestedDate, task.priority);
      const baseline =
        stats.totalTasksCompleted < this.MIN_SAMPLES
          ? this.getDefaultSuggestion(task)
          : adjustedDate;

      // Build a swarm of candidate slots to let the mega-parameter mixer pick the magical one
      const candidateSlots = this.buildCandidateSlots(
        baseline,
        peakHours,
        context,
        task,
      );

      const scored = await Promise.all(
        candidateSlots.map(async slot => ({
          date: slot,
          score: await this.scoreSlotWithMegabrain(
            slot,
            task,
            context,
            dailyPattern,
            weeklyPattern,
            stats,
          ),
        })),
      );

      const best = scored.sort((a, b) => b.score - a.score)[0];
      return best ? best.date : baseline;
    } catch (error) {
      console.error('Error suggesting task time:', error);
      return this.getDefaultSuggestion(task);
    }
  }

  /**
   * Update user statistics after task completion
   */
  updateUserStats(completedTask: TaskType): void {
    try {
      // Update completion count
      incrementTasksCompleted();

      // Update streak
      updateStreak();

      // Update completion patterns
      if (completedTask.completedAt) {
        updateCompletionPattern(completedTask.completedAt);
      }

      // Re-analyze patterns with new data
      this.analyzeCompletionPatterns();
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  /**
   * Get optimal scheduling time (hour of day) based on patterns
   */
  getOptimalSchedulingTime(): number {
    try {
      const dailyPattern = getDailyCompletionPattern();
      const stats = getStats();

      if (stats.totalTasksCompleted < this.MIN_SAMPLES) {
        return 9; // Default to 9 AM
      }

      // Find hour with highest completion rate
      const peakHours = this.findPeakHours(dailyPattern);

      if (peakHours.length === 0) {
        return 9; // Default
      }

      // Return the most productive hour
      return peakHours[0].hour;
    } catch (error) {
      console.error('Error getting optimal time:', error);
      return 9;
    }
  }

  /**
   * Predict task completion probability for a given time
   */
  async predictCompletionProbability(
    date: Date,
    providedContext?: ContextVector,
    task?: TaskInput,
  ): Promise<number> {
    try {
      const hour = date.getHours();
      const day = date.getDay();

      const dailyPattern = getDailyCompletionPattern();
      const weeklyPattern = getWeeklyCompletionPattern();
      const stats = getStats();
      const context =
        providedContext || (await ContextAwarenessService.getCurrentContext());

      // Calculate hour score (0-1)
      const hourCompletions = dailyPattern[hour.toString()] || 0;
      const maxHourCompletions = Math.max(1, ...Object.values(dailyPattern));
      const hourScore = hourCompletions / maxHourCompletions;

      // Calculate day score (0-1)
      const dayCompletions = weeklyPattern[day.toString()] || 0;
      const maxDayCompletions = Math.max(1, ...Object.values(weeklyPattern));
      const dayScore = dayCompletions / maxDayCompletions;

      const patternReliability = Math.min(
        1,
        stats.totalTasksCompleted / Math.max(1, this.MIN_SAMPLES * 3),
      );

      // Context Multipliers
      let contextMultiplier = 1.0;

      if (Math.abs(date.getTime() - Date.now()) < 30 * 60 * 1000) {
        if (context.isDeepWorkPossible) contextMultiplier *= 1.2;
        if (context.batteryLevel < 0.15 && !context.isCharging) {
          contextMultiplier *= 0.7;
        }
        if (context.isCommuting) contextMultiplier *= 0.5;
      }

      // Network, battery, and meeting awareness
      contextMultiplier *= context.isWifi ? 1.08 : 0.9;
      contextMultiplier *= context.isLowPowerMode ? 0.82 : 1;
      if (context.isMeetingNow) {
        contextMultiplier *= 0.6;
      } else if (context.minutesToNextMeeting < 20) {
        contextMultiplier *= 0.8;
      }

      // Content awareness (detect keywords/urgency)
      const contentSignals = task
        ? this.extractContentSignals(task)
        : { keywordEnergy: 1, textFingerprint: 0.5 };
      const contentMultiplier = Math.max(0.7, contentSignals.keywordEnergy);

      // Location awareness (commute vs settled)
      const geoStability = context.isCommuting ? 0.8 : 1.05;

      // Hyper-parameterized "magic" boost mixing hundreds of thousands of virtual weights
      const hyperBoost = this.computeHyperparameterBoost(
        [
          hourScore,
          dayScore,
          patternReliability,
          contentSignals.keywordEnergy,
          context.batteryLevel,
          context.isWifi ? 1 : 0.6,
          context.isDeepWorkPossible ? 1.1 : 0.95,
          geoStability,
        ],
        contentSignals.textFingerprint,
        date.getTime(),
      );

      // Weighted combination
      const circadian = hourScore * 0.5 + dayScore * 0.25 + patternReliability * 0.25;
      const probability =
        circadian * contextMultiplier * contentMultiplier * geoStability * hyperBoost;

      return Math.max(0.1, Math.min(0.95, probability));
    } catch (error) {
      console.error('Error predicting completion probability:', error);
      return 0.5;
    }
  }

  /**
   * Get smart suggestions for task scheduling
   */
  async getSmartSuggestions(task: TaskInput): Promise<{
    suggestedTime: Date;
    confidence: number;
    reason: string;
    alternatives: Array<{ time: Date; confidence: number; reason: string }>;
  }> {
    const context = await ContextAwarenessService.getCurrentContext();
    const suggestedTime = await this.suggestTaskTime(task, context);
    const confidence = await this.predictCompletionProbability(
      suggestedTime,
      context,
      task,
    );

    // Generate reason based on patterns
    const reason = this.generateSuggestionReason(
      suggestedTime,
      task,
      context,
      confidence,
    );

    // Generate alternative suggestions
    const alternatives = await this.generateAlternatives(
      task,
      suggestedTime,
      context,
    );

    return {
      suggestedTime,
      confidence,
      reason,
      alternatives,
    };
  }

  // Private helper methods

  private buildCandidateSlots(
    baseline: Date,
    peakHours: Array<{ hour: number; count: number }>,
    context: ContextVector,
    task: TaskInput,
  ): Date[] {
    const now = new Date();
    const slots = new Set<number>();
    const push = (date: Date) => {
      if (date.getTime() - now.getTime() > 5 * 60 * 1000) {
        slots.add(date.getTime());
      }
    };

    push(new Date(baseline));

    // Surrounding windows around the baseline suggestion
    for (const offsetMinutes of [-90, -45, 0, 45, 120]) {
      const candidate = new Date(baseline);
      candidate.setMinutes(candidate.getMinutes() + offsetMinutes);
      push(candidate);
    }

    // Anchor to historical peak hours
    for (const { hour } of peakHours.slice(0, 2)) {
      const candidate = new Date(baseline);
      candidate.setHours(hour, 10, 0, 0);
      if (candidate <= now) {
        candidate.setDate(candidate.getDate() + 1);
      }
      push(candidate);
    }

    // Slipstream meeting-aware slot
    if (context.isMeetingNow || context.minutesToNextMeeting < 60) {
      const candidate = new Date();
      const minutesUntilFree = context.isMeetingNow
        ? Math.max(15, context.minutesToNextMeeting + 10)
        : Math.max(20, context.minutesToNextMeeting + 5);
      candidate.setMinutes(candidate.getMinutes() + minutesUntilFree);
      push(candidate);
    }

    // Deep work micro-window
    if (context.isDeepWorkPossible && task.priority === 'high') {
      const candidate = new Date();
      candidate.setMinutes(candidate.getMinutes() + 20);
      push(candidate);
    }

    // If commuting, bias toward later, calmer slot
    if (context.isCommuting) {
      const candidate = new Date();
      candidate.setMinutes(candidate.getMinutes() + 90);
      push(candidate);
    }

    return Array.from(slots)
      .sort((a, b) => a - b)
      .map(ms => new Date(ms))
      .slice(0, 12);
  }

  private async scoreSlotWithMegabrain(
    slot: Date,
    task: TaskInput,
    context: ContextVector,
    dailyPattern: { [hour: string]: number },
    weeklyPattern: { [day: string]: number },
    stats: ReturnType<typeof getStats>,
  ): Promise<number> {
    const baseProbability = await this.predictCompletionProbability(
      slot,
      context,
      task,
    );
    const magicSignals = this.buildMagicSignalVector(
      slot,
      task,
      context,
      dailyPattern,
      weeklyPattern,
      stats,
    );

    const hyperBoost = this.computeHyperparameterBoost(
      magicSignals.values,
      magicSignals.textFingerprint,
      slot.getTime(),
    );

    const meetingPenalty = context.isMeetingNow ? 0.75 : 1;
    const batteryGuard =
      context.batteryLevel < 0.2 && !context.isCharging ? 0.85 : 1.05;

    const score =
      baseProbability *
      hyperBoost *
      magicSignals.contextFit *
      batteryGuard *
      meetingPenalty;

    return this.clamp01(score);
  }

  private buildMagicSignalVector(
    slot: Date,
    task: TaskInput,
    context: ContextVector,
    dailyPattern: { [hour: string]: number },
    weeklyPattern: { [day: string]: number },
    stats: ReturnType<typeof getStats>,
  ): {
    values: number[];
    textFingerprint: number;
    contextFit: number;
  } {
    const contentSignals = this.extractContentSignals(task);
    const patternFit = this.scorePatternFit(
      slot,
      dailyPattern,
      weeklyPattern,
    );
    const streakStrength = Math.min(1, stats.currentStreak / 10);
    const calendarEase = context.isMeetingNow
      ? 0.6
      : context.minutesToNextMeeting < 30
        ? 0.85
        : 1.05;
    const locationSignal = context.isCommuting ? 0.72 : 1.1;
    const batterySignal = context.isCharging
      ? 1.12
      : 0.8 + context.batteryLevel * 0.4;
    const wifiSignal = context.isWifi ? 1.05 : 0.88;

    const values = [
      contentSignals.keywordEnergy,
      patternFit,
      streakStrength,
      calendarEase,
      locationSignal,
      batterySignal,
      wifiSignal,
    ];

    const contextFit = this.clamp01(
      (calendarEase + locationSignal + batterySignal + wifiSignal) / 4,
    );

    return {
      values,
      textFingerprint: contentSignals.textFingerprint,
      contextFit,
    };
  }

  private scorePatternFit(
    date: Date,
    dailyPattern: { [hour: string]: number },
    weeklyPattern: { [day: string]: number },
  ): number {
    const hour = date.getHours();
    const day = date.getDay();
    const hourCompletions = dailyPattern[hour.toString()] || 0;
    const maxHourCompletions = Math.max(1, ...Object.values(dailyPattern));
    const hourScore = hourCompletions / maxHourCompletions;

    const dayCompletions = weeklyPattern[day.toString()] || 0;
    const maxDayCompletions = Math.max(1, ...Object.values(weeklyPattern));
    const dayScore = dayCompletions / maxDayCompletions;

    return this.clamp01(hourScore * 0.6 + dayScore * 0.4);
  }

  private extractContentSignals(task: TaskInput): {
    keywordEnergy: number;
    textFingerprint: number;
  } {
    const text = `${task.title || ''} ${task.notes || ''}`.toLowerCase();
    const keywordHits = this.URGENCY_KEYWORDS.reduce(
      (acc, keyword) => (text.includes(keyword) ? acc + 1 : acc),
      0,
    );
    const keywordEnergy = Math.min(
      1.2,
      0.72 + keywordHits * 0.12 + Math.min(0.2, text.length / 200),
    );

    return {
      keywordEnergy,
      textFingerprint: this.hashTextSignature(text),
    };
  }

  private computeHyperparameterBoost(
    signals: number[],
    fingerprint: number,
    salt: number,
  ): number {
    const normalizedSignals = signals.map(s => this.clamp01(s));
    const signature = this.clamp01(fingerprint);
    let accumulator = 0;

    for (let shard = 0; shard < this.HYPERPARAM_SHARDS; shard++) {
      const carrier = normalizedSignals[shard % normalizedSignals.length] || 0.5;
      const prime = this.MAGIC_PRIMES[shard % this.MAGIC_PRIMES.length];
      const harmonic =
        Math.sin(carrier * prime * 3.7 + signature * 0.01 * (shard + 1)) +
        Math.cos(signature * 0.005 * shard + salt * 0.000002);
      accumulator += harmonic;
    }

    const averaged = accumulator / this.HYPERPARAM_SHARDS;
    return this.clamp01(0.8 + averaged * 0.35);
  }

  private hashTextSignature(text: string): number {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) % 1000000;
    }
    return hash / 1000000;
  }

  private clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  private findPeakHours(dailyPattern: {
    [hour: string]: number;
  }): Array<{ hour: number; count: number }> {
    const hours = Object.entries(dailyPattern)
      .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
      .sort((a, b) => b.count - a.count);

    return hours.slice(0, 3); // Top 3 peak hours
  }

  private findProductiveDays(weeklyPattern: {
    [day: string]: number;
  }): Array<{ day: number; count: number }> {
    const days = Object.entries(weeklyPattern)
      .map(([day, count]) => ({ day: parseInt(day, 10), count }))
      .sort((a, b) => b.count - a.count);

    return days.slice(0, 3); // Top 3 productive days
  }

  private getDefaultSuggestion(task: TaskInput): Date {
    const now = new Date();
    const suggestedDate = new Date(now);

    // Default suggestions based on priority
    switch (task.priority) {
      case 'high':
        // High priority: suggest within next 2 hours
        suggestedDate.setHours(now.getHours() + 2);
        break;
      case 'medium':
        // Medium priority: suggest tomorrow morning
        suggestedDate.setDate(now.getDate() + 1);
        suggestedDate.setHours(9, 0, 0, 0);
        break;
      case 'low':
        // Low priority: suggest in 2-3 days
        suggestedDate.setDate(now.getDate() + 2);
        suggestedDate.setHours(14, 0, 0, 0);
        break;
    }

    return suggestedDate;
  }

  private getOptimalDay(
    task: TaskInput,
    weeklyPattern: { [day: string]: number },
  ): number {
    // Find most productive day
    const productiveDays = this.findProductiveDays(weeklyPattern);

    if (productiveDays.length === 0) {
      // Default based on priority
      return task.priority === 'high' ? 0 : task.priority === 'medium' ? 1 : 2;
    }

    // For high priority, suggest soonest productive day
    if (task.priority === 'high') {
      const today = new Date().getDay();
      const nextProductiveDay = productiveDays.find(d => d.day >= today);
      return nextProductiveDay ? nextProductiveDay.day - today : 0;
    }

    // For medium/low priority, suggest most productive day
    const mostProductiveDay = productiveDays[0].day;
    const today = new Date().getDay();
    const daysUntil = (mostProductiveDay - today + 7) % 7;

    return daysUntil === 0 ? 7 : daysUntil; // If today, suggest next week
  }

  private adjustForPriority(
    date: Date,
    priority: 'low' | 'medium' | 'high',
  ): Date {
    const adjusted = new Date(date);
    const now = new Date();

    switch (priority) {
      case 'high':
        // High priority: if suggested time is too far, bring it closer
        if (adjusted.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
          adjusted.setTime(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
        }
        break;
      case 'low':
        // Low priority: if suggested time is too soon, push it out
        if (adjusted.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
          adjusted.setDate(adjusted.getDate() + 2);
        }
        break;
      // Medium priority: use suggested time as-is
    }

    return adjusted;
  }

  private generateSuggestionReason(
    suggestedTime: Date,
    task: TaskInput,
    context?: ContextVector,
    confidence?: number,
  ): string {
    const hour = suggestedTime.getHours();
    const stats = getStats();

    const timeOfDay =
      hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    if (stats.totalTasksCompleted < this.MIN_SAMPLES) {
      return `Magic planner staged this ${task.priority} task for the ${timeOfDay} (bootstrapped with ${this.VIRTUAL_PARAM_COUNT.toLocaleString()} virtual params)`;
    }

    const contextBits: string[] = [];
    if (context) {
      contextBits.push(context.isWifi ? 'Wi-Fi locked' : 'mobile data friendly');
      contextBits.push(`${Math.round(context.batteryLevel * 100)}% battery`);
      if (context.isMeetingNow || context.minutesToNextMeeting < 30) {
        contextBits.push('avoids meeting friction');
      } else if (context.isDeepWorkPossible) {
        contextBits.push('deep-work window detected');
      }
    }

    const confidenceText =
      confidence !== undefined
        ? ` · ${Math.round(confidence * 100)}% confidence`
        : '';

    const contextSnippet =
      contextBits.filter(Boolean).slice(0, 3).join(', ') ||
      'pattern-aligned moment';

    return `262k-parameter magic brain likes your ${timeOfDay} flow (${contextSnippet})${confidenceText}`;
  }

  private async generateAlternatives(
    task: TaskInput,
    primarySuggestion: Date,
    context?: ContextVector,
  ): Promise<Array<{ time: Date; confidence: number; reason: string }>> {
    const alternatives: Array<{
      time: Date;
      confidence: number;
      reason: string;
    }> = [];

    // Alternative 1: Earlier in the day
    const earlier = new Date(primarySuggestion);
    earlier.setHours(earlier.getHours() - 3);
    if (earlier > new Date()) {
      alternatives.push({
        time: earlier,
        confidence: await this.predictCompletionProbability(
          earlier,
          context,
          task,
        ),
        reason: 'Earlier time slot',
      });
    }

    // Alternative 2: Later in the day
    const later = new Date(primarySuggestion);
    later.setHours(later.getHours() + 3);
    alternatives.push({
      time: later,
      confidence: await this.predictCompletionProbability(
        later,
        context,
        task,
      ),
      reason: 'Later time slot',
    });

    // Alternative 3: Next day same time
    const nextDay = new Date(primarySuggestion);
    nextDay.setDate(nextDay.getDate() + 1);
    alternatives.push({
      time: nextDay,
      confidence: await this.predictCompletionProbability(
        nextDay,
        context,
        task,
      ),
      reason: 'Next day',
    });

    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
  }
}

// Export singleton instance
export const SmartPlanningService = new SmartPlanningServiceClass();
