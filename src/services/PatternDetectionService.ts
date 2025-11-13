/**
 * Pattern Detection Service
 * Detects recurring patterns, chains, and habits
 * Fully offline using local history
 */

import { TaskType } from '../types';
import {
  TaskChain,
  RecurringCreationPattern,
  SequencePattern,
} from '../types/pattern.types';
import {
  normalizeTitle,
  calculateTitleSimilarity,
} from '../utils/textNormalization';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'pattern-detection' });

class PatternDetectionServiceClass {
  private readonly MIN_SUPPORT = 0.4;
  private readonly MIN_CONFIDENCE = 0.6;
  private readonly SIMILARITY_THRESHOLD = 0.9;
  private readonly HISTORY_WINDOW_DAYS = 30;

  /**
   * Detect task chains (sequences that often occur together)
   * Simplified PrefixSpan algorithm
   */
  detectChains(completedTasks: TaskType[]): TaskChain[] {
    // Group tasks by day
    const tasksByDay = this.groupTasksByDay(completedTasks);

    // Find sequences of length 2-3
    const sequences: Map<string, SequencePattern> = new Map();

    for (const dayTasks of tasksByDay) {
      if (dayTasks.length < 2) continue;

      // Generate all subsequences
      for (let i = 0; i < dayTasks.length; i++) {
        for (let j = i + 1; j < Math.min(i + 4, dayTasks.length); j++) {
          const subseq = dayTasks.slice(i, j + 1);
          const key = subseq.map(t => normalizeTitle(t.title)).join('→');

          const existing = sequences.get(key);
          if (existing) {
            existing.support += 1;
          } else {
            sequences.set(key, {
              sequence: subseq.map(t => normalizeTitle(t.title)),
              support: 1,
              confidence: 0,
              avgGapDays: 0,
            });
          }
        }
      }
    }

    // Calculate support and confidence
    const totalDays = tasksByDay.length;
    const chains: TaskChain[] = [];

    for (const [key, pattern] of sequences.entries()) {
      const support = pattern.support / totalDays;

      if (support < this.MIN_SUPPORT || pattern.sequence.length < 2) continue;

      // Calculate confidence: P(rest | anchor)
      const anchor = pattern.sequence[0];
      const anchorCount = this.countOccurrences(tasksByDay, anchor);
      const confidence = anchorCount > 0 ? pattern.support / anchorCount : 0;

      if (confidence < this.MIN_CONFIDENCE) continue;

      chains.push({
        id: this.generateId(key),
        anchor,
        suggestions: pattern.sequence.slice(1),
        support,
        confidence,
        lastSeen: Date.now(),
        acceptCount: 0,
        rejectCount: 0,
        frozen: false,
      });
    }

    // Save chains
    this.saveChains(chains);

    return chains;
  }

  /**
   * Detect recurring creation patterns
   * Finds tasks that are usually created at specific day/time
   */
  detectRecurringCreation(tasks: TaskType[]): RecurringCreationPattern[] {
    const patterns: Map<string, RecurringCreationPattern> = new Map();

    // Group by normalized title
    const tasksByTitle: Map<string, TaskType[]> = new Map();

    for (const task of tasks) {
      const normalized = normalizeTitle(task.title);
      const existing = tasksByTitle.get(normalized);
      if (existing) {
        existing.push(task);
      } else {
        tasksByTitle.set(normalized, [task]);
      }
    }

    // Analyze each title group
    for (const [normalized, titleTasks] of tasksByTitle.entries()) {
      if (titleTasks.length < 3) continue; // Need at least 3 occurrences

      // Extract creation day-of-week and time bins
      const creationData = titleTasks.map(task => ({
        dow: new Date(task.createdAt).getDay(),
        bin: this.getTimeBin(new Date(task.createdAt)),
        timestamp: task.createdAt.getTime(),
      }));

      // Find dominant day-of-week
      const dowCounts: { [dow: number]: number } = {};
      for (const data of creationData) {
        dowCounts[data.dow] = (dowCounts[data.dow] || 0) + 1;
      }

      const dominantDow = parseInt(
        Object.entries(dowCounts).sort((a, b) => b[1] - a[1])[0][0],
      );

      // Find dominant time bin for that day
      const dowBins = creationData
        .filter(d => d.dow === dominantDow)
        .map(d => d.bin);

      if (dowBins.length === 0) continue;

      const binCounts: { [bin: number]: number } = {};
      for (const bin of dowBins) {
        binCounts[bin] = (binCounts[bin] || 0) + 1;
      }

      const dominantBin = parseInt(
        Object.entries(binCounts).sort((a, b) => b[1] - a[1])[0][0],
      );

      // Detect rhythm (weekly, biweekly, monthly)
      const rhythm = this.detectRhythm(creationData);

      // Calculate confidence
      const confidence = dowCounts[dominantDow] / titleTasks.length;

      if (confidence < 0.5) continue; // Not consistent enough

      const key = `${normalized}::${dominantDow}`;
      patterns.set(key, {
        key,
        targetDow: dominantDow,
        creationBins: dowBins,
        dominantBin,
        rhythm,
        lastCreated: Math.max(...creationData.map(d => d.timestamp)),
        missedCount: 0,
        confidence,
      });
    }

    // Save patterns
    this.saveRecurringPatterns(Array.from(patterns.values()));

    return Array.from(patterns.values());
  }

  /**
   * Check if a pattern should trigger a suggestion
   */
  shouldSuggestRecurring(pattern: RecurringCreationPattern): boolean {
    const now = new Date();
    const currentDow = now.getDay();
    const currentBin = this.getTimeBin(now);

    // Check if we're in the target day and time window
    if (currentDow !== pattern.targetDow) return false;

    // Check if we're within ±2 bins of dominant bin
    const binDiff = Math.abs(currentBin - pattern.dominantBin);
    if (binDiff > 2) return false;

    // Check if already created recently
    if (pattern.lastCreated) {
      const daysSinceCreation =
        (now.getTime() - pattern.lastCreated) / (1000 * 60 * 60 * 24);

      if (pattern.rhythm === 'weekly' && daysSinceCreation < 6) return false;
      if (pattern.rhythm === 'biweekly' && daysSinceCreation < 13) return false;
      if (pattern.rhythm === 'monthly' && daysSinceCreation < 28) return false;
    }

    return true;
  }

  /**
   * Get chain suggestions for a completed task
   */
  getChainSuggestions(completedTask: TaskType): string[] {
    const chains = this.loadChains();
    const normalized = normalizeTitle(completedTask.title);

    const matching = chains.filter(
      chain =>
        !chain.frozen &&
        calculateTitleSimilarity(chain.anchor, normalized) > 0.8,
    );

    if (matching.length === 0) return [];

    // Return suggestions from highest confidence chain
    matching.sort((a, b) => b.confidence - a.confidence);
    return matching[0].suggestions;
  }

  /**
   * Record user response to chain suggestion
   */
  recordChainResponse(chainId: string, accepted: boolean): void {
    const chains = this.loadChains();
    const chain = chains.find(c => c.id === chainId);

    if (!chain) return;

    if (accepted) {
      chain.acceptCount++;
    } else {
      chain.rejectCount++;
    }

    // Freeze if rejected 3 times in a row
    if (chain.rejectCount >= 3 && chain.acceptCount === 0) {
      chain.frozen = true;
    }

    this.saveChains(chains);
  }

  /**
   * Find duplicate/similar tasks
   */
  findDuplicates(
    tasks: TaskType[],
  ): Array<{ task1: TaskType; task2: TaskType; similarity: number }> {
    const duplicates: Array<{
      task1: TaskType;
      task2: TaskType;
      similarity: number;
    }> = [];

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const similarity = calculateTitleSimilarity(
          tasks[i].title,
          tasks[j].title,
        );

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          // Check if due dates are close (within 1 day)
          const date1 = new Date(tasks[i].dueDate);
          const date2 = new Date(tasks[j].dueDate);
          const daysDiff =
            Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);

          if (daysDiff <= 1 && tasks[i].category === tasks[j].category) {
            duplicates.push({ task1: tasks[i], task2: tasks[j], similarity });
          }
        }
      }
    }

    return duplicates;
  }

  // Helper methods

  private groupTasksByDay(tasks: TaskType[]): TaskType[][] {
    const groups: Map<string, TaskType[]> = new Map();

    for (const task of tasks) {
      if (!task.completedAt) continue;

      const date = new Date(task.completedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      const existing = groups.get(key);
      if (existing) {
        existing.push(task);
      } else {
        groups.set(key, [task]);
      }
    }

    // Sort each day by completion time
    for (const dayTasks of groups.values()) {
      dayTasks.sort(
        (a, b) =>
          (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0),
      );
    }

    return Array.from(groups.values());
  }

  private countOccurrences(
    tasksByDay: TaskType[][],
    normalized: string,
  ): number {
    let count = 0;
    for (const dayTasks of tasksByDay) {
      if (dayTasks.some(t => normalizeTitle(t.title) === normalized)) {
        count++;
      }
    }
    return count;
  }

  private getTimeBin(date: Date): number {
    // 30-minute bins: 0-47 (48 bins per day)
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours * 2 + (minutes >= 30 ? 1 : 0);
  }

  private detectRhythm(
    creationData: Array<{ timestamp: number }>,
  ): 'weekly' | 'biweekly' | 'monthly' {
    if (creationData.length < 2) return 'weekly';

    // Calculate average gap between creations
    const gaps: number[] = [];
    for (let i = 1; i < creationData.length; i++) {
      const gap =
        (creationData[i].timestamp - creationData[i - 1].timestamp) /
        (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    if (avgGap < 10) return 'weekly';
    if (avgGap < 20) return 'biweekly';
    return 'monthly';
  }

  private generateId(key: string): string {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  // Storage methods

  private saveChains(chains: TaskChain[]): void {
    storage.set('task-chains', JSON.stringify(chains));
  }

  private loadChains(): TaskChain[] {
    const data = storage.getString('task-chains');
    return data ? JSON.parse(data) : [];
  }

  private saveRecurringPatterns(patterns: RecurringCreationPattern[]): void {
    storage.set('recurring-patterns', JSON.stringify(patterns));
  }

  loadRecurringPatterns(): RecurringCreationPattern[] {
    const data = storage.getString('recurring-patterns');
    return data ? JSON.parse(data) : [];
  }
}

export const PatternDetectionService = new PatternDetectionServiceClass();
