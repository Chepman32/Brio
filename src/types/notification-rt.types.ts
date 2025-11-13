/**
 * Reaction Time (RT) Based Notification Algorithm Types
 *
 * This module defines types for the RT-based notification learning system
 * that adapts notification timing based on user interaction patterns.
 */

export type NotifyAction =
  | 'open'
  | 'completeFromPush'
  | 'snooze'
  | 'dismiss'
  | 'ignore';
export type CategoryId = string;

/**
 * Log event for each notification interaction
 */
export interface NotifyLogEvent {
  id: string;
  taskId: string;
  category: CategoryId;
  deliveredAt: number; // timestamp in ms
  openedAt?: number; // timestamp in ms (if action involves opening)
  action: NotifyAction;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // system time at delivery
  hourBin: number; // 0..47 for 30-min intervals (or 0..95 for 15 min)
  priority01: number; // 0..1 normalized priority
  dueInMinAtDelivery: number; // deadline remaining in minutes
  isSilent: boolean;
}

/**
 * RT categories based on response time
 */
export type RTCategory = 'quick' | 'short' | 'medium' | 'long' | 'ignored';

/**
 * Key for identifying a time slot (category × day × hour bin)
 */
export interface SlotKey {
  category: CategoryId;
  dow: number; // day of week
  bin: number; // time bin
}

/**
 * Statistics for a specific time slot
 * Uses Beta distribution for probabilities and log-normal for RT modeling
 */
export interface SlotStats {
  // Beta distribution parameters for open probability within time thresholds
  open5m_a: number; // alpha parameter for 5-min threshold
  open5m_b: number; // beta parameter for 5-min threshold
  open30m_a: number; // alpha parameter for 30-min threshold
  open30m_b: number; // beta parameter for 30-min threshold

  // Log-normal model for RT (for opened notifications)
  lnRt_mean: number; // μ (mean of log(RT))
  lnRt_var: number; // σ² (variance of log(RT))
  weight: number; // cumulative weight for EWMA

  // Counters
  delivered: number;
  opened: number;
  ignored: number;

  // Freshness tracking
  lastUpdateAt: number;
}

/**
 * Context for scoring a candidate notification slot
 */
export interface CandidateCtx {
  slot: SlotStats;
  nowMs: number;
  dueMs?: number; // deadline timestamp
  estDurationMs?: number; // estimated task duration
  priority01: number; // normalized priority 0..1
}

/**
 * Snooze suggestion with reasoning
 */
export interface SnoozeOption {
  minutes: number;
  label: string;
  reason: string;
}

/**
 * Notification channel configuration based on slot performance
 */
export interface ChannelConfig {
  volume: 'silent' | 'quiet' | 'normal' | 'loud';
  allowEarlyReminders: boolean;
  preferDigest: boolean;
}

/**
 * Focus window - optimal time slot for a category
 */
export interface FocusWindow {
  category: CategoryId;
  dow: number;
  startBin: number;
  endBin: number;
  pOpen5m: number;
  medianRtMs: number;
  confidence: number;
}

/**
 * Heatmap data for visualization
 */
export interface HeatmapData {
  category: CategoryId;
  dow: number;
  bin: number;
  score: number; // 0..1
  pOpen5m: number;
  medianRtMs: number;
}

/**
 * Slot recommendation with scoring details
 */
export interface SlotRecommendation {
  dow: number;
  bin: number;
  score: number;
  confidence: number;
  reason: string;
  estimatedOpenTime: Date;
  channelConfig: ChannelConfig;
}

/**
 * Storage structure for all slot statistics
 */
export interface RTStatsStorage {
  version: number;
  slots: { [key: string]: SlotStats }; // key = `${category}:${dow}:${bin}`
  globalStats: SlotStats; // aggregated across all slots
  lastCleanupAt: number;
}
