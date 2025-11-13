/**
 * Recurring Task Suggestion Service
 *
 * Learns patterns from user task creation behavior and suggests tasks
 * when they haven't been added at the expected time.
 */

import Realm from 'realm';
import {
  PatternModel,
  Occurrence,
  TimeCluster,
} from '../database/schemas/PatternModel';
import {
  CreationEvent,
  SuggestionConfig,
  LearnedSlot,
  PatternStats,
  FuzzyMatch,
  SuggestionNotification,
} from '../types/recurring-suggestion.types';
import {
  normalizeTitle,
  hashTitle,
  extractDayFromTitle,
  getDayName,
  calculateTitleSimilarity,
} from '../utils/textNormalization';
import {
  getISOWeek,
  getDayOfWeek,
  getTimeBin,
  binToTimeString,
  getNextDateWithDow,
  dateAndBinToTimestamp,
  weeksBetween,
  isInQuietHours,
  shiftAfterQuietHours,
} from '../utils/dateHelpers.recurring';

class RecurringSuggestionServiceClass {
  private realm: Realm | null = null;
  private config: SuggestionConfig = {
    minOccurrences: 3,
    binSizeMinutes: 30,
    ewmaHalfLifeWeeks: 6,
    clusterMergeRadius: 2,
    shiftPromotionThreshold: 2,
    dismissCooldownWeeks: 2,
    maxSuggestionsPerDay: 2,
    maxIgnoresBeforePause: 3,
  };

  /**
   * Initialize the service with Realm instance
   */
  async initialize(
    realm: Realm,
    config?: Partial<SuggestionConfig>,
  ): Promise<void> {
    this.realm = realm;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.log('RecurringSuggestionService initialized');
  }

  /**
   * Log a task creation event and update pattern model
   */
  async logTaskCreation(
    title: string,
    category: string,
    dueDate?: Date,
    createdAt: Date = new Date(),
  ): Promise<void> {
    if (!this.realm) throw new Error('Service not initialized');

    const normalizedTitle = normalizeTitle(title);
    if (!normalizedTitle) return; // Empty after normalization

    // Determine target day-of-week
    let targetDow = getDayOfWeek(createdAt);
    if (dueDate) {
      targetDow = getDayOfWeek(dueDate);
    } else {
      const extractedDow = extractDayFromTitle(title);
      if (extractedDow >= 0) {
        targetDow = extractedDow as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      }
    }

    const key = `${normalizedTitle}::${targetDow}`;
    const creationDow = getDayOfWeek(createdAt);
    const creationBin = getTimeBin(createdAt, this.config.binSizeMinutes);
    const yearWeek = getISOWeek(createdAt);
    const titleHash = hashTitle(normalizedTitle);

    const event: CreationEvent = {
      key,
      createdAt: createdAt.getTime(),
      creationDow,
      creationBin,
      targetDow,
      yearWeek,
      titleHash,
    };

    // Check for fuzzy matches
    const fuzzyMatch = await this.findFuzzyMatch(
      normalizedTitle,
      targetDow,
      category,
    );
    const patternKey = fuzzyMatch?.shouldMerge ? fuzzyMatch.patternKey : key;

    await this.updatePatternModel(
      patternKey,
      event,
      title,
      category,
      normalizedTitle,
    );
  }

  /**
   * Update or create pattern model with new event
   */
  private async updatePatternModel(
    key: string,
    event: CreationEvent,
    displayTitle: string,
    category: string,
    normalizedTitle: string,
  ): Promise<void> {
    if (!this.realm) return;

    this.realm.write(() => {
      let pattern = this.realm!.objectForPrimaryKey<PatternModel>(
        'PatternModel',
        key,
      );

      if (!pattern) {
        // Create new pattern
        pattern = this.realm!.create<PatternModel>('PatternModel', {
          _id: key,
          key,
          category,
          displayTitle,
          normalizedTitle,
          occurrences: [],
          ewmaBin: event.creationBin,
          ewmaWeight: 1,
          clusters: [],
          cadence: 'irregular',
          ignoredCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      // Add occurrence (keep last 32)
      const newOccurrence = {
        yearWeek: event.yearWeek,
        creationDow: event.creationDow,
        creationBin: event.creationBin,
        createdAt: event.createdAt,
      };

      pattern.occurrences.push(newOccurrence);
      if (pattern.occurrences.length > 32) {
        pattern.occurrences.splice(0, pattern.occurrences.length - 32);
      }

      // Update EWMA
      this.updateEWMA(pattern, event);

      // Update clusters
      this.updateClusters(pattern, event);

      // Update cadence
      this.updateCadence(pattern);

      pattern.updatedAt = Date.now();
    });
  }

  /**
   * Update EWMA bin with new event
   */
  private updateEWMA(pattern: PatternModel, event: CreationEvent): void {
    const lastOccurrence = pattern.occurrences[pattern.occurrences.length - 2];
    if (!lastOccurrence) {
      pattern.ewmaBin = event.creationBin;
      pattern.ewmaWeight = 1;
      return;
    }

    const deltaWeeks = weeksBetween(
      new Date(lastOccurrence.createdAt),
      new Date(event.createdAt),
    );
    const alpha = Math.exp(-deltaWeeks / this.config.ewmaHalfLifeWeeks);

    pattern.ewmaBin = Math.round(
      (1 - alpha) * pattern.ewmaBin + alpha * event.creationBin,
    );
    pattern.ewmaWeight += 1;
  }

  /**
   * Update time clusters with new event
   */
  private updateClusters(pattern: PatternModel, event: CreationEvent): void {
    const now = Date.now();
    let foundCluster = false;

    // Try to merge with existing cluster
    for (let i = 0; i < pattern.clusters.length; i++) {
      const cluster = pattern.clusters[i];
      if (
        Math.abs(cluster.bin - event.creationBin) <=
        this.config.clusterMergeRadius
      ) {
        // Merge into this cluster
        const oldWeight = cluster.weight;
        const newWeight = oldWeight + 1;
        cluster.bin = Math.round(
          (cluster.bin * oldWeight + event.creationBin) / newWeight,
        );
        cluster.weight = newWeight;
        cluster.lastSeenAt = now;
        foundCluster = true;
        break;
      }
    }

    if (!foundCluster) {
      // Create new cluster
      pattern.clusters.push({
        bin: event.creationBin,
        weight: 1,
        lastSeenAt: now,
      });

      // Keep top 3 by weight
      if (pattern.clusters.length > 3) {
        const sorted = Array.from(pattern.clusters).sort(
          (a, b) => b.weight - a.weight,
        );
        pattern.clusters.splice(0, pattern.clusters.length);
        sorted.slice(0, 3).forEach(c => pattern.clusters.push(c));
      }
    }

    // Decay inactive clusters
    this.decayClusters(pattern);
  }

  /**
   * Decay cluster weights based on inactivity
   */
  private decayClusters(pattern: PatternModel): void {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    for (const cluster of pattern.clusters) {
      const weeksInactive = (now - cluster.lastSeenAt) / weekMs;
      cluster.weight *= Math.pow(0.9, weeksInactive);
    }
  }

  /**
   * Update cadence detection
   */
  private updateCadence(pattern: PatternModel): void {
    const occurrences = Array.from(pattern.occurrences);
    if (occurrences.length < 3) {
      pattern.cadence = 'irregular';
      return;
    }

    // Check for weekly pattern (last 3 distinct weeks, 1 week apart)
    const lastThree = occurrences.slice(-3);
    const weeks = lastThree.map(o => o.yearWeek);
    const uniqueWeeks = new Set(weeks);

    if (uniqueWeeks.size === 3) {
      const dates = lastThree.map(o => new Date(o.createdAt));
      const gap1 = weeksBetween(dates[0], dates[1]);
      const gap2 = weeksBetween(dates[1], dates[2]);

      if (Math.abs(gap1 - 1) < 0.3 && Math.abs(gap2 - 1) < 0.3) {
        pattern.cadence = 'weekly';
        return;
      }
    }

    // Check for biweekly pattern
    if (occurrences.length >= 4) {
      const lastSix = occurrences.slice(-6);
      const dates = lastSix.map(o => new Date(o.createdAt));
      const gaps: number[] = [];

      for (let i = 1; i < dates.length; i++) {
        gaps.push(weeksBetween(dates[i - 1], dates[i]));
      }

      const biweeklyGaps = gaps.filter(g => Math.abs(g - 2) < 0.5);
      if (biweeklyGaps.length >= gaps.length * 0.66) {
        pattern.cadence = 'biweekly';
        return;
      }
    }

    // Check for monthly pattern
    if (occurrences.length >= 3) {
      const lastFour = occurrences.slice(-4);
      const dates = lastFour.map(o => new Date(o.createdAt));
      const gaps: number[] = [];

      for (let i = 1; i < dates.length; i++) {
        gaps.push(weeksBetween(dates[i - 1], dates[i]));
      }

      const monthlyGaps = gaps.filter(g => g >= 3.5 && g <= 5); // 4 weeks ± tolerance
      if (monthlyGaps.length >= gaps.length * 0.66) {
        pattern.cadence = 'monthly';
        return;
      }
    }

    pattern.cadence = 'irregular';
  }

  /**
   * Find fuzzy match for title
   */
  private async findFuzzyMatch(
    normalizedTitle: string,
    targetDow: number,
    category: string,
  ): Promise<FuzzyMatch | null> {
    if (!this.realm) return null;

    const patterns = this.realm
      .objects<PatternModel>('PatternModel')
      .filtered('category == $0', category);

    let bestMatch: FuzzyMatch | null = null;
    let bestSimilarity = 0;

    for (const pattern of patterns) {
      // Extract target dow from pattern key
      const patternTargetDow = parseInt(pattern.key.split('::')[1]);
      if (patternTargetDow !== targetDow) continue;

      const similarity = calculateTitleSimilarity(
        normalizedTitle,
        pattern.normalizedTitle,
      );

      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = {
          patternKey: pattern.key,
          similarity,
          shouldMerge: similarity >= 0.9,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Check if pattern should be watched for suggestions
   */
  private shouldWatch(pattern: PatternModel, now: Date): boolean {
    // Only watch recurring patterns
    if (pattern.cadence === 'irregular') return false;

    // Check if pattern has enough occurrences
    if (pattern.occurrences.length < this.config.minOccurrences) return false;

    // Check cool-down after dismiss
    if (pattern.lastUserResponse === 'dismissed' && pattern.lastSuggestedAt) {
      const cooldownMs =
        this.config.dismissCooldownWeeks * 7 * 24 * 60 * 60 * 1000;
      if (now.getTime() - pattern.lastSuggestedAt < cooldownMs) {
        return false;
      }
    }

    // Check if paused due to too many ignores
    if (pattern.ignoredCount >= this.config.maxIgnoresBeforePause) {
      return false;
    }

    return true;
  }

  /**
   * Learn the creation slot (day + time) for a pattern
   */
  learnedCreationSlot(pattern: PatternModel): LearnedSlot | null {
    if (pattern.occurrences.length < this.config.minOccurrences) {
      return null;
    }

    const now = Date.now();

    // Determine dominant day-of-week (recency-weighted)
    const dowCounts = new Map<number, number>();
    const recentOccurrences = Array.from(pattern.occurrences).slice(-8);

    for (const occ of recentOccurrences) {
      const weight = Math.exp(
        -(now - occ.createdAt) / (14 * 24 * 60 * 60 * 1000),
      ); // 14-day half-life
      dowCounts.set(
        occ.creationDow,
        (dowCounts.get(occ.creationDow) || 0) + weight,
      );
    }

    const dow = Array.from(dowCounts.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0][0];

    // Choose best cluster
    const clusters = Array.from(pattern.clusters)
      .map(c => ({
        bin: c.bin,
        score:
          c.weight *
          Math.exp(-(now - c.lastSeenAt) / (21 * 24 * 60 * 60 * 1000)), // 21-day half-life
      }))
      .sort((a, b) => b.score - a.score);

    let bin: number;
    let confidence: number;

    if (clusters.length === 0) {
      bin = pattern.ewmaBin || 24; // Default to noon
      confidence = 0.3;
    } else if (clusters.length === 1) {
      bin = clusters[0].bin;
      confidence = Math.min(0.9, clusters[0].score / 5);
    } else {
      const [c1, c2] = clusters;
      // If top 2 within merge radius, average them
      if (Math.abs(c1.bin - c2.bin) <= this.config.clusterMergeRadius) {
        bin = Math.round((c1.bin + c2.bin) / 2);
        confidence = Math.min(0.95, (c1.score + c2.score) / 8);
      } else {
        // Pick top cluster (handles shift case)
        bin = c1.bin;
        confidence = Math.min(0.9, c1.score / 5);
      }
    }

    return { dow, bin, confidence };
  }

  /**
   * Get all patterns that should be watched
   */
  async getWatchedPatterns(now: Date = new Date()): Promise<PatternModel[]> {
    if (!this.realm) return [];

    const allPatterns = this.realm.objects<PatternModel>('PatternModel');
    const watched: PatternModel[] = [];

    for (const pattern of allPatterns) {
      if (this.shouldWatch(pattern, now)) {
        watched.push(pattern);
      }
    }

    return watched;
  }

  /**
   * Plan suggestion notifications for upcoming days
   */
  async planSuggestionNotifications(
    daysAhead: number = 7,
  ): Promise<SuggestionNotification[]> {
    if (!this.realm) return [];

    const now = new Date();
    const watched = await this.getWatchedPatterns(now);
    const suggestions: SuggestionNotification[] = [];

    for (const pattern of watched) {
      const slot = this.learnedCreationSlot(pattern);
      if (!slot) continue;

      // Get next creation date
      const nextCreationDate = getNextDateWithDow(slot.dow, now);

      // Check if within planning window
      const daysUntil = Math.floor(
        (nextCreationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (daysUntil > daysAhead) continue;

      // Calculate fire timestamp
      let fireMs = dateAndBinToTimestamp(
        nextCreationDate,
        slot.bin,
        this.config.binSizeMinutes,
      );

      // Handle quiet hours
      if (
        this.config.quietHoursStart !== undefined &&
        this.config.quietHoursEnd !== undefined
      ) {
        const shifted = shiftAfterQuietHours(
          fireMs,
          this.config.quietHoursStart,
          this.config.quietHoursEnd,
          this.config.binSizeMinutes,
        );
        if (shifted === -1) continue; // Drop this cycle
        fireMs = shifted;
      }

      // Extract target dow from pattern key
      const targetDow = parseInt(pattern.key.split('::')[1]);

      const suggestion: SuggestionNotification = {
        id: `suggest_${pattern.key}_${getISOWeek(nextCreationDate)}`,
        patternKey: pattern.key,
        title: `Add "${pattern.displayTitle}"?`,
        displayTitle: pattern.displayTitle,
        targetDow,
        targetLabel: getDayName(targetDow),
        rationale: this.buildRationale(pattern, slot),
        fireDate: fireMs,
        actions: this.getActions(pattern),
      };

      suggestions.push(suggestion);
    }

    // Sort by fire date and limit per day
    return this.limitSuggestionsPerDay(suggestions);
  }

  /**
   * Build rationale text for suggestion
   */
  private buildRationale(pattern: PatternModel, slot: LearnedSlot): string {
    const dayName = getDayName(slot.dow);
    const timeStr = binToTimeString(slot.bin, this.config.binSizeMinutes);
    const count = pattern.occurrences.length;

    if (pattern.cadence === 'weekly') {
      return `You usually add this ${dayName}s at ${timeStr} (${count} times)`;
    } else if (pattern.cadence === 'biweekly') {
      return `You add this every other week on ${dayName} at ${timeStr}`;
    } else if (pattern.cadence === 'monthly') {
      return `You add this monthly, usually ${dayName}s at ${timeStr}`;
    }

    return `You've added this ${count} times, usually ${dayName}s at ${timeStr}`;
  }

  /**
   * Get available actions for suggestion
   */
  private getActions(
    pattern: PatternModel,
  ): Array<'add' | 'addToday' | 'skip' | 'setRepeat'> {
    const actions: Array<'add' | 'addToday' | 'skip' | 'setRepeat'> = [
      'add',
      'addToday',
      'skip',
    ];

    if (pattern.cadence === 'biweekly' || pattern.cadence === 'monthly') {
      actions.push('setRepeat');
    }

    return actions;
  }

  /**
   * Limit suggestions per day
   */
  private limitSuggestionsPerDay(
    suggestions: SuggestionNotification[],
  ): SuggestionNotification[] {
    const sorted = suggestions.sort((a, b) => a.fireDate - b.fireDate);
    const byDay = new Map<string, SuggestionNotification[]>();

    for (const suggestion of sorted) {
      const date = new Date(suggestion.fireDate);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, []);
      }
      byDay.get(dayKey)!.push(suggestion);
    }

    const limited: SuggestionNotification[] = [];
    for (const daySuggestions of byDay.values()) {
      limited.push(
        ...daySuggestions.slice(0, this.config.maxSuggestionsPerDay),
      );
    }

    return limited;
  }

  /**
   * Check if task already exists for pattern this cycle
   */
  async taskExistsForPattern(
    patternKey: string,
    targetWeek: string,
  ): Promise<boolean> {
    if (!this.realm) return false;

    const pattern = this.realm.objectForPrimaryKey<PatternModel>(
      'PatternModel',
      patternKey,
    );
    if (!pattern) return false;

    // Check if there's an occurrence in the target week
    const hasOccurrence = pattern.occurrences.some(
      occ => occ.yearWeek === targetWeek,
    );
    return hasOccurrence;
  }

  /**
   * Handle user response to suggestion
   */
  async handleSuggestionResponse(
    patternKey: string,
    response: 'accepted' | 'dismissed' | 'ignored',
  ): Promise<void> {
    if (!this.realm) return;

    this.realm.write(() => {
      const pattern = this.realm!.objectForPrimaryKey<PatternModel>(
        'PatternModel',
        patternKey,
      );
      if (!pattern) return;

      pattern.lastSuggestedAt = Date.now();
      pattern.lastUserResponse = response;

      if (response === 'ignored') {
        pattern.ignoredCount += 1;
      } else if (response === 'accepted') {
        pattern.ignoredCount = 0; // Reset on acceptance
      }

      pattern.updatedAt = Date.now();
    });
  }

  /**
   * Get pattern statistics
   */
  async getPatternStats(): Promise<PatternStats> {
    if (!this.realm) {
      return {
        totalPatterns: 0,
        activePatterns: 0,
        weeklyPatterns: 0,
        biweeklyPatterns: 0,
        monthlyPatterns: 0,
        pausedPatterns: 0,
      };
    }

    const allPatterns = this.realm.objects<PatternModel>('PatternModel');
    const now = new Date();

    let activePatterns = 0;
    let weeklyPatterns = 0;
    let biweeklyPatterns = 0;
    let monthlyPatterns = 0;
    let pausedPatterns = 0;

    for (const pattern of allPatterns) {
      if (this.shouldWatch(pattern, now)) {
        activePatterns++;
      }

      if (pattern.ignoredCount >= this.config.maxIgnoresBeforePause) {
        pausedPatterns++;
      }

      switch (pattern.cadence) {
        case 'weekly':
          weeklyPatterns++;
          break;
        case 'biweekly':
          biweeklyPatterns++;
          break;
        case 'monthly':
          monthlyPatterns++;
          break;
      }
    }

    return {
      totalPatterns: allPatterns.length,
      activePatterns,
      weeklyPatterns,
      biweeklyPatterns,
      monthlyPatterns,
      pausedPatterns,
    };
  }

  /**
   * Unpause a pattern (reset ignore count)
   */
  async unpausePattern(patternKey: string): Promise<void> {
    if (!this.realm) return;

    this.realm.write(() => {
      const pattern = this.realm!.objectForPrimaryKey<PatternModel>(
        'PatternModel',
        patternKey,
      );
      if (!pattern) return;

      pattern.ignoredCount = 0;
      pattern.lastUserResponse = undefined;
      pattern.updatedAt = Date.now();
    });
  }

  /**
   * Delete a pattern
   */
  async deletePattern(patternKey: string): Promise<void> {
    if (!this.realm) return;

    this.realm.write(() => {
      const pattern = this.realm!.objectForPrimaryKey<PatternModel>(
        'PatternModel',
        patternKey,
      );
      if (pattern) {
        this.realm!.delete(pattern);
      }
    });
  }

  /**
   * Get all patterns (for debugging/UI)
   */
  async getAllPatterns(): Promise<PatternModel[]> {
    if (!this.realm) return [];
    return Array.from(this.realm.objects<PatternModel>('PatternModel'));
  }
}

// Export singleton instance
export const RecurringSuggestionService = new RecurringSuggestionServiceClass();
