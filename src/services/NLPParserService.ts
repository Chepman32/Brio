/**
 * Local NLP Parser Service
 * Parses free-form text into structured task intents
 * Fully offline, no external dependencies
 */

import {
  ParsedIntent,
  TimeSlot,
  DatePattern,
  RepeatPattern,
} from '../types/nlp.types';
import { normalizeTitle } from '../utils/textNormalization';

class NLPParserServiceClass {
  // Keyword dictionaries
  private readonly PRIORITY_KEYWORDS: { [key: string]: number } = {
    urgent: 0.9,
    asap: 0.9,
    critical: 0.9,
    important: 0.8,
    doctor: 0.8,
    hospital: 0.9,
    bill: 0.7,
    due: 0.7,
    deadline: 0.8,
    emergency: 1.0,
    meeting: 0.6,
    interview: 0.8,
    exam: 0.8,
    test: 0.7,
    payment: 0.7,
    tax: 0.8,
  };

  private readonly CATEGORY_KEYWORDS: { [key: string]: string } = {
    // Work
    work: 'Work',
    office: 'Work',
    meeting: 'Meetings',
    call: 'Calls',
    email: 'Email',
    project: 'Project A',

    // Health
    doctor: 'Medical / Doctors / Tests',
    hospital: 'Medical / Doctors / Tests',
    gym: 'Fitness',
    workout: 'Fitness',
    exercise: 'Fitness',
    run: 'Fitness',
    health: 'Health',
    medicine: 'Medical / Doctors / Tests',

    // Finance
    pay: 'Banking / Payments',
    bill: 'Banking / Payments',
    bank: 'Banking / Payments',
    money: 'Finance',
    budget: 'Finance',
    tax: 'Car Service / Insurance / Taxes',

    // Home
    clean: 'Cleaning / Organization',
    organize: 'Cleaning / Organization',
    fix: 'Home Maintenance',
    repair: 'Home Maintenance',

    // Shopping
    buy: 'Shopping',
    shop: 'Shopping',
    grocery: 'Shopping',
    order: 'Online Orders / Deliveries',

    // Family
    family: 'Family',
    kids: 'Family',
    parents: 'Family',

    // Personal
    read: 'Reading',
    study: 'Study',
    learn: 'Courses / Learning',
    hobby: 'Hobbies',
  };

  private readonly TIME_PATTERNS = [
    // Absolute times
    { regex: /(\d{1,2}):(\d{2})\s*(am|pm)?/i, type: 'absolute' },
    { regex: /(\d{1,2})\s*(am|pm)/i, type: 'absolute' },

    // Relative times
    {
      regex: /in\s+(\d+)\s*(min|minute|minutes|m)/i,
      type: 'relative',
      unit: 'minutes',
    },
    { regex: /in\s+(\d+)\s*(hour|hours|h)/i, type: 'relative', unit: 'hours' },
    { regex: /in\s+(\d+)\s*(day|days|d)/i, type: 'relative', unit: 'days' },

    // Named times
    { regex: /\b(morning)\b/i, hour: 9, minute: 0 },
    { regex: /\b(afternoon)\b/i, hour: 14, minute: 0 },
    { regex: /\b(evening)\b/i, hour: 19, minute: 0 },
    { regex: /\b(night)\b/i, hour: 21, minute: 0 },
    { regex: /\b(noon)\b/i, hour: 12, minute: 0 },
    { regex: /\b(midnight)\b/i, hour: 0, minute: 0 },
  ];

  private readonly DATE_PATTERNS = [
    // Relative dates
    { regex: /\b(today)\b/i, offset: 0 },
    { regex: /\b(tomorrow)\b/i, offset: 1 },
    { regex: /\b(yesterday)\b/i, offset: -1 },
    { regex: /in\s+(\d+)\s*days?/i, offsetDays: true },

    // Day names
    { regex: /\b(monday|mon)\b/i, dow: 1 },
    { regex: /\b(tuesday|tue|tues)\b/i, dow: 2 },
    { regex: /\b(wednesday|wed)\b/i, dow: 3 },
    { regex: /\b(thursday|thu|thur|thurs)\b/i, dow: 4 },
    { regex: /\b(friday|fri)\b/i, dow: 5 },
    { regex: /\b(saturday|sat)\b/i, dow: 6 },
    { regex: /\b(sunday|sun)\b/i, dow: 0 },

    // Specific dates
    { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i, type: 'specific' },
    {
      regex: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      type: 'monthDay',
    },
  ];

  private readonly REPEAT_PATTERNS = [
    { regex: /\b(every|each)\s+(day|daily)\b/i, freq: 'daily' as const },
    { regex: /\b(every|each)\s+(week|weekly)\b/i, freq: 'weekly' as const },
    { regex: /\b(every|each)\s+(month|monthly)\b/i, freq: 'monthly' as const },
    {
      regex: /\b(every|each)\s+(\d+)\s+(days?|weeks?|months?)\b/i,
      interval: true,
    },
    {
      regex:
        /\b(every|each)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      weekday: true,
    },
  ];

  /**
   * Parse free-form text into structured intent
   */
  parse(text: string): ParsedIntent {
    const normalized = text.toLowerCase().trim();
    const errors: string[] = [];

    // Extract date/time
    const when = this.extractDateTime(normalized);

    // Extract repeat pattern
    const repeat = this.extractRepeat(normalized);

    // Extract category
    const category = this.extractCategory(normalized);

    // Calculate priority
    const priority01 = this.calculatePriority(normalized, when);

    // Extract tags
    const tags = this.extractTags(normalized);

    // Clean title (remove parsed elements)
    const title = this.cleanTitle(text, { when, repeat, category, tags });

    return {
      title,
      when,
      repeat,
      category,
      priority01,
      tags,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Extract date and time from text
   */
  private extractDateTime(text: string): Date | undefined {
    const now = new Date();
    let date: Date | undefined;
    let time: TimeSlot | undefined;

    // Extract date
    for (const pattern of this.DATE_PATTERNS) {
      const match = text.match(pattern.regex);
      if (match) {
        if ('offset' in pattern) {
          date = new Date(now);
          date.setDate(date.getDate() + pattern.offset);
        } else if ('offsetDays' in pattern && match[1]) {
          date = new Date(now);
          date.setDate(date.getDate() + parseInt(match[1]));
        } else if ('dow' in pattern) {
          date = this.getNextDayOfWeek(pattern.dow);
        } else if (pattern.type === 'specific' && match[1] && match[2]) {
          const month = parseInt(match[1]) - 1;
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : now.getFullYear();
          date = new Date(year, month, day);
        } else if (pattern.type === 'monthDay' && match[1] && match[2]) {
          const day = parseInt(match[1]);
          const monthMap: { [key: string]: number } = {
            jan: 0,
            feb: 1,
            mar: 2,
            apr: 3,
            may: 4,
            jun: 5,
            jul: 6,
            aug: 7,
            sep: 8,
            oct: 9,
            nov: 10,
            dec: 11,
          };
          const month = monthMap[match[2].toLowerCase()];
          date = new Date(now.getFullYear(), month, day);
        }
        break;
      }
    }

    // Extract time
    for (const pattern of this.TIME_PATTERNS) {
      const match = text.match(pattern.regex);
      if (match) {
        if (pattern.type === 'absolute' && match[1]) {
          let hour = parseInt(match[1]);
          const minute = match[2] ? parseInt(match[2]) : 0;
          const meridiem = match[3]?.toLowerCase();

          if (meridiem === 'pm' && hour < 12) hour += 12;
          if (meridiem === 'am' && hour === 12) hour = 0;

          time = { hour, minute };
        } else if (pattern.type === 'relative' && match[1]) {
          const value = parseInt(match[1]);
          const offset =
            pattern.unit === 'minutes'
              ? value
              : pattern.unit === 'hours'
              ? value * 60
              : value * 24 * 60;

          const futureDate = new Date(now.getTime() + offset * 60 * 1000);
          return futureDate;
        } else if ('hour' in pattern) {
          time = { hour: pattern.hour, minute: pattern.minute };
        }
        break;
      }
    }

    // Combine date and time
    if (date || time) {
      const result = date || new Date(now);
      if (time) {
        result.setHours(time.hour, time.minute, 0, 0);
      }
      return result;
    }

    return undefined;
  }

  /**
   * Extract repeat pattern from text
   */
  private extractRepeat(text: string): ParsedIntent['repeat'] {
    for (const pattern of this.REPEAT_PATTERNS) {
      const match = text.match(pattern.regex);
      if (match) {
        if ('freq' in pattern) {
          return { freq: pattern.freq, interval: 1 };
        } else if (pattern.interval && match[2]) {
          const interval = parseInt(match[2]);
          const unit = match[3].toLowerCase();
          const freq = unit.includes('day')
            ? 'daily'
            : unit.includes('week')
            ? 'weekly'
            : 'monthly';
          return { freq, interval };
        } else if (pattern.weekday && match[2]) {
          const dowMap: { [key: string]: number } = {
            monday: 1,
            tuesday: 2,
            wednesday: 3,
            thursday: 4,
            friday: 5,
            saturday: 6,
            sunday: 0,
          };
          const dow = dowMap[match[2].toLowerCase()];
          return { freq: 'weekly', byWeekday: [dow], interval: 1 };
        }
      }
    }
    return undefined;
  }

  /**
   * Extract category from text
   */
  private extractCategory(text: string): string | undefined {
    for (const [keyword, category] of Object.entries(this.CATEGORY_KEYWORDS)) {
      if (text.includes(keyword)) {
        return category;
      }
    }
    return undefined;
  }

  /**
   * Calculate priority based on keywords and deadline
   */
  private calculatePriority(text: string, when?: Date): number {
    let score = 0.4; // base priority

    // Keyword weights
    for (const [keyword, weight] of Object.entries(this.PRIORITY_KEYWORDS)) {
      if (text.includes(keyword)) {
        score += weight * 0.3;
      }
    }

    // Deadline pressure
    if (when) {
      const now = new Date();
      const hoursUntil = (when.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntil < 2) score += 0.3;
      else if (hoursUntil < 24) score += 0.2;
      else if (hoursUntil < 72) score += 0.1;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Extract hashtags as tags
   */
  private extractTags(text: string): string[] {
    const tagRegex = /#(\w+)/g;
    const tags: string[] = [];
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      tags.push(match[1]);
    }

    return tags;
  }

  /**
   * Clean title by removing parsed elements
   */
  private cleanTitle(
    original: string,
    parsed: { when?: Date; repeat?: any; category?: string; tags: string[] },
  ): string {
    let cleaned = original;

    // Remove time patterns
    for (const pattern of this.TIME_PATTERNS) {
      cleaned = cleaned.replace(pattern.regex, '');
    }

    // Remove date patterns
    for (const pattern of this.DATE_PATTERNS) {
      cleaned = cleaned.replace(pattern.regex, '');
    }

    // Remove repeat patterns
    for (const pattern of this.REPEAT_PATTERNS) {
      cleaned = cleaned.replace(pattern.regex, '');
    }

    // Remove tags
    cleaned = cleaned.replace(/#\w+/g, '');

    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned || original;
  }

  /**
   * Get next occurrence of a day of week
   */
  private getNextDayOfWeek(targetDow: number): Date {
    const now = new Date();
    const currentDow = now.getDay();
    let daysUntil = targetDow - currentDow;

    if (daysUntil <= 0) daysUntil += 7;

    const result = new Date(now);
    result.setDate(result.getDate() + daysUntil);
    return result;
  }
}

export const NLPParserService = new NLPParserServiceClass();
