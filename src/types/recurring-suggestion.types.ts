/**
 * Recurring Task Suggestion Algorithm Types
 *
 * Pattern-learning system that detects recurring task creation patterns
 * and suggests tasks when the user hasn't added them at the expected time.
 */

export type ISODate = string; // "2025-11-13T15:00:00.000Z"
export type CategoryId = string;

/**
 * Creation event logged each time a task is added
 */
export interface CreationEvent {
  key: string; // pattern key (normalizedTitle::targetDow)
  createdAt: number; // ms epoch
  creationDow: 0 | 1 | 2 | 3 | 4 | 5 | 6; // day-of-week of creation time (0=Sun, 6=Sat)
  creationBin: number; // half-hour bin of creation time (0..47)
  targetDow: 0 | 1 | 2 | 3 | 4 | 5 | 6; // day-of-week the task is FOR
  yearWeek: string; // e.g. "2025-W46" (ISO week)
  titleHash: string; // stable hash of normalizedTitle
}

/**
 * Time cluster for detecting creation time patterns
 */
export interface TimeCluster {
  bin: number; // center bin (0..47)
  weight: number; // accumulated weight
  lastSeenAt: number; // timestamp of last occurrence
}

/**
 * Cadence types for recurring patterns
 */
export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'irregular';

/**
 * User response to suggestion
 */
export type SuggestionResponse = 'accepted' | 'dismissed' | 'ignored';

/**
 * Pattern model for a recurring task
 */
export interface PatternModel {
  key: string; // "buy milk::1" (1=Mon target)
  category: CategoryId;
  displayTitle: string; // most frequent wording
  normalizedTitle: string; // normalized version

  // Historical occurrences (capped to last 32)
  occurrences: Array<{
    yearWeek: string;
    creationDow: number;
    creationBin: number;
    createdAt: number;
  }>;

  // Time-of-creation distribution (EWMA + clustering)
  ewmaBin: number; // exponential moving average bin
  ewmaWeight: number; // total weight
  clusters: TimeCluster[]; // max 3 clusters

  // Cadence detection
  cadence: Cadence;

  // Suggestion tracking
  lastSuggestedAt?: number;
  lastUserResponse?: SuggestionResponse;
  ignoredCount: number; // consecutive ignores

  // Metadata
  createdAt: number;
  updatedAt: number;
}

/**
 * Learned creation slot (day + time)
 */
export interface LearnedSlot {
  dow: number; // day of week
  bin: number; // time bin (0..47)
  confidence: number; // 0..1
}

/**
 * Suggestion notification data
 */
export interface SuggestionNotification {
  id: string;
  patternKey: string;
  title: string;
  displayTitle: string;
  targetDow: number;
  targetLabel: string; // "Monday", "Tuesday", etc.
  rationale: string;
  fireDate: number; // timestamp
  actions: SuggestionAction[];
}

/**
 * Actions available in suggestion notification
 */
export type SuggestionAction =
  | 'add' // Add for target day
  | 'addToday' // Add for today
  | 'skip' // Skip this week
  | 'setRepeat'; // Set as repeating task

/**
 * Configuration for suggestion algorithm
 */
export interface SuggestionConfig {
  minOccurrences: number; // min occurrences to start suggesting (default: 3)
  binSizeMinutes: number; // time bin size (default: 30)
  ewmaHalfLifeWeeks: number; // EWMA half-life (default: 6)
  clusterMergeRadius: number; // bins within this are merged (default: 2)
  shiftPromotionThreshold: number; // consecutive occurrences to promote new cluster (default: 2)
  dismissCooldownWeeks: number; // weeks to wait after dismiss (default: 2)
  maxSuggestionsPerDay: number; // max suggestions per day (default: 2)
  maxIgnoresBeforePause: number; // max ignores before pausing pattern (default: 3)
  quietHoursStart?: number; // quiet hours start bin (optional)
  quietHoursEnd?: number; // quiet hours end bin (optional)
}

/**
 * Statistics for pattern analysis
 */
export interface PatternStats {
  totalPatterns: number;
  activePatterns: number; // patterns being watched
  weeklyPatterns: number;
  biweeklyPatterns: number;
  monthlyPatterns: number;
  pausedPatterns: number; // ignored too many times
}

/**
 * Fuzzy match result for title similarity
 */
export interface FuzzyMatch {
  patternKey: string;
  similarity: number; // 0..1 (Jaccard similarity)
  shouldMerge: boolean; // similarity >= 0.9
}
