/**
 * NLP Parser Types
 */

export type CategoryId = string;

export interface ParsedIntent {
  title: string;
  when?: Date;
  repeat?: {
    freq: 'daily' | 'weekly' | 'monthly';
    byWeekday?: number[];
    interval?: number;
  };
  category?: CategoryId;
  priority01: number; // 0..1
  tags: string[];
  errors?: string[];
}

export interface TimeSlot {
  hour: number;
  minute: number;
}

export interface DatePattern {
  type: 'absolute' | 'relative' | 'recurring';
  date?: Date;
  offset?: number; // minutes
  dow?: number; // day of week
}

export interface RepeatPattern {
  freq: 'daily' | 'weekly' | 'monthly';
  interval: number;
  byWeekday?: number[];
  count?: number;
  until?: Date;
}
