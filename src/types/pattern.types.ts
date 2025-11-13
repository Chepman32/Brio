/**
 * Pattern Detection Types
 */

export interface TaskChain {
  id: string;
  anchor: string; // normalized title
  suggestions: string[]; // normalized titles
  support: number; // 0..1
  confidence: number; // 0..1
  lastSeen: number; // timestamp
  acceptCount: number;
  rejectCount: number;
  frozen: boolean;
}

export interface RecurringCreationPattern {
  key: string; // normalizedTitle::dow
  targetDow: number;
  creationBins: number[]; // 30-min bins
  dominantBin: number;
  rhythm: 'weekly' | 'biweekly' | 'monthly';
  lastCreated?: number; // timestamp
  missedCount: number;
  confidence: number;
}

export interface SequencePattern {
  sequence: string[]; // normalized titles
  support: number;
  confidence: number;
  avgGapDays: number;
}
