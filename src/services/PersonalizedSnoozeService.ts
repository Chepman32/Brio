/**
 * Personalized Snooze Service
 * Suggests optimal snooze intervals based on user behavior
 */

import { MMKV } from 'react-native-mmkv';
import { NotificationRTService } from './NotificationRTService';

const storage = new MMKV({ id: 'snooze-service' });

interface SnoozeHistory {
  taskId: string;
  category: string;
  dow: number;
  bin: number;
  snoozeMinutes: number;
  wasOpened: boolean;
  timestamp: number;
}

interface SnoozePreference {
  category: string;
  dow: number;
  preferredMinutes: number[];
  useCount: { [minutes: number]: number };
}

class PersonalizedSnoozeServiceClass {
  /**
   * Get personalized snooze suggestions
   */
  getSuggestions(taskId: string, category: string): number[] {
    const now = new Date();
    const dow = now.getDay();
    const bin = this.getTimeBin(now);

    // Get RT stats for this category/time
    const rtStats = NotificationRTService.getSlotStats(category, dow, bin);

    // Get user's snooze preferences
    const preferences = this.getPreferences(category, dow);

    const suggestions: number[] = [];

    // Suggestion 1: Median RT from stats
    if (rtStats && rtStats.delivered > 0) {
      const medianRT = Math.exp(rtStats.lnRt_mean); // Convert from log-normal
      suggestions.push(Math.round(medianRT));
    }

    // Suggestion 2: 2x median RT
    if (suggestions.length > 0) {
      suggestions.push(suggestions[0] * 2);
    }

    // Suggestion 3: Next high-probability window
    const nextWindow = this.findNextHighProbWindow(category, now);
    if (nextWindow) {
      const minutesUntil = (nextWindow.getTime() - now.getTime()) / (1000 * 60);
      if (minutesUntil > 0 && minutesUntil < 480) {
        // Within 8 hours
        suggestions.push(Math.round(minutesUntil));
      }
    }

    // Suggestion 4: User's most common snooze for this context
    if (preferences && preferences.preferredMinutes.length > 0) {
      suggestions.push(preferences.preferredMinutes[0]);
    }

    // Default suggestions if nothing else
    if (suggestions.length === 0) {
      suggestions.push(30, 60, 120);
    }

    // Remove duplicates and sort
    const unique = Array.from(new Set(suggestions)).sort((a, b) => a - b);

    // Return top 3
    return unique.slice(0, 3);
  }

  /**
   * Record snooze action
   */
  recordSnooze(
    taskId: string,
    category: string,
    snoozeMinutes: number,
    wasOpened: boolean,
  ): void {
    const now = new Date();
    const history: SnoozeHistory = {
      taskId,
      category,
      dow: now.getDay(),
      bin: this.getTimeBin(now),
      snoozeMinutes,
      wasOpened,
      timestamp: now.getTime(),
    };

    // Save to history
    const historyKey = 'snooze-history';
    const existing = storage.getString(historyKey);
    const historyList: SnoozeHistory[] = existing ? JSON.parse(existing) : [];
    historyList.push(history);

    // Keep last 100 entries
    if (historyList.length > 100) {
      historyList.shift();
    }

    storage.set(historyKey, JSON.stringify(historyList));

    // Update preferences
    this.updatePreferences(category, now.getDay(), snoozeMinutes);
  }

  /**
   * Get snooze preferences for category/day
   */
  private getPreferences(
    category: string,
    dow: number,
  ): SnoozePreference | null {
    const key = `snooze-pref::${category}::${dow}`;
    const data = storage.getString(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Update snooze preferences
   */
  private updatePreferences(
    category: string,
    dow: number,
    minutes: number,
  ): void {
    const key = `snooze-pref::${category}::${dow}`;
    const existing = this.getPreferences(category, dow);

    if (existing) {
      existing.useCount[minutes] = (existing.useCount[minutes] || 0) + 1;

      // Recalculate preferred minutes
      const sorted = Object.entries(existing.useCount)
        .sort((a, b) => b[1] - a[1])
        .map(([min]) => parseInt(min));

      existing.preferredMinutes = sorted.slice(0, 3);
    } else {
      const pref: SnoozePreference = {
        category,
        dow,
        preferredMinutes: [minutes],
        useCount: { [minutes]: 1 },
      };
      storage.set(key, JSON.stringify(pref));
    }

    if (existing) {
      storage.set(key, JSON.stringify(existing));
    }
  }

  /**
   * Find next high-probability window for opening tasks
   */
  private findNextHighProbWindow(category: string, from: Date): Date | null {
    const currentBin = this.getTimeBin(from);
    const dow = from.getDay();

    // Check next 16 bins (8 hours)
    for (let i = 1; i <= 16; i++) {
      const checkBin = (currentBin + i) % 48;
      const checkDow = dow + Math.floor((currentBin + i) / 48);

      const stats = NotificationRTService.getSlotStats(
        category,
        checkDow % 7,
        checkBin,
      );

      if (stats && stats.delivered > 5) {
        const pOpen5m = this.betaMean(stats.open5m_a, stats.open5m_b);

        if (pOpen5m > 0.6) {
          // High probability
          const result = new Date(from);
          result.setMinutes(result.getMinutes() + i * 30);
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Get 30-minute time bin
   */
  private getTimeBin(date: Date): number {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return hours * 2 + (minutes >= 30 ? 1 : 0);
  }

  /**
   * Calculate Beta distribution mean
   */
  private betaMean(a: number, b: number): number {
    return a / (a + b);
  }

  /**
   * Format snooze duration for display
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days}d`;
    }
  }
}

export const PersonalizedSnoozeService = new PersonalizedSnoozeServiceClass();
