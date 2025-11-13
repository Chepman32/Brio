/**
 * Enhanced Day Vibe Service
 * Analyzes day character with load analysis and z-score
 */

import { TaskType } from '../types';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'day-vibe' });

interface DayVibeResult {
  vibe: string;
  label: 'Busy' | 'Focus' | 'Balanced' | 'Chill' | 'Free';
  zScore: number;
  load: number;
  expectedLoad: number;
  gradientColors: string[];
}

interface LoadHistory {
  date: string; // YYYY-MM-DD
  dow: number;
  load: number;
}

class EnhancedDayVibeServiceClass {
  // Category weights for load calculation
  private readonly CATEGORY_WEIGHTS: { [category: string]: number } = {
    'Medical / Doctors / Tests': 3.0,
    'Banking / Payments': 2.5,
    Legal: 2.5,
    Work: 2.0,
    Meetings: 2.0,
    'Car Service / Insurance / Taxes': 2.0,
    'Important but Not Urgent': 1.8,
    Family: 1.5,
    Health: 1.5,
    Fitness: 1.2,
    Study: 1.5,
    Personal: 1.0,
    Hobbies: 0.8,
    Entertainment: 0.5,
  };

  // Weekday bias (some days naturally busier)
  private readonly WEEKDAY_BIAS: { [dow: number]: number } = {
    0: -0.3, // Sunday - lighter
    1: 0.2, // Monday - heavier
    2: 0.1, // Tuesday
    3: 0.0, // Wednesday - neutral
    4: 0.1, // Thursday
    5: -0.1, // Friday - slightly lighter
    6: -0.2, // Saturday - lighter
  };

  /**
   * Analyze day vibe with load calculation
   */
  analyzeDayVibe(tasks: TaskType[], date: Date = new Date()): DayVibeResult {
    const dow = date.getDay();

    // Calculate current load
    const load = this.calculateLoad(tasks);

    // Get expected load for this day of week
    const expectedLoad = this.getExpectedLoad(dow);

    // Calculate z-score
    const sigma = this.getLoadStdDev(dow);
    const zScore = sigma > 0 ? (load - expectedLoad) / sigma : 0;

    // Determine label and vibe
    let label: DayVibeResult['label'];
    let vibe: string;
    let gradientColors: string[];

    if (tasks.length === 0) {
      label = 'Free';
      vibe = 'Свободный день';
      gradientColors = ['#E5E7EB', '#FFFFFF'];
    } else if (zScore >= 1.0) {
      label = 'Busy';
      vibe = this.getBusyVibe(tasks);
      gradientColors = ['#6B7280', '#9CA3AF'];
    } else if (zScore >= 0.5) {
      label = 'Focus';
      vibe = this.getFocusVibe(tasks);
      gradientColors = ['#3B82F6', '#60A5FA'];
    } else if (zScore <= -1.0) {
      label = 'Chill';
      vibe = this.getChillVibe(tasks);
      gradientColors = ['#10B981', '#34D399'];
    } else {
      label = 'Balanced';
      vibe = this.getBalancedVibe(tasks);
      gradientColors = ['#14B8A6', '#5EEAD4'];
    }

    // Save load history
    this.saveLoadHistory(date, dow, load);

    return {
      vibe,
      label,
      zScore,
      load,
      expectedLoad,
      gradientColors,
    };
  }

  /**
   * Calculate load for a set of tasks
   */
  private calculateLoad(tasks: TaskType[]): number {
    let load = 0;

    // Count by category
    const categoryCounts: { [category: string]: number } = {};
    for (const task of tasks) {
      const category = task.category || 'Personal';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }

    // Calculate weighted sum
    for (const [category, count] of Object.entries(categoryCounts)) {
      const weight = this.CATEGORY_WEIGHTS[category] || 1.0;
      load += weight * count;
    }

    return load;
  }

  /**
   * Get expected load for day of week
   */
  private getExpectedLoad(dow: number): number {
    const history = this.getLoadHistory();

    // Filter by day of week
    const dowHistory = history.filter(h => h.dow === dow);

    if (dowHistory.length < 4) {
      // Not enough data, use default
      return 5.0 + (this.WEEKDAY_BIAS[dow] || 0) * 2;
    }

    // Calculate EMA (Exponential Moving Average)
    const alpha = 0.3;
    let ema = dowHistory[0].load;

    for (let i = 1; i < dowHistory.length; i++) {
      ema = alpha * dowHistory[i].load + (1 - alpha) * ema;
    }

    return ema;
  }

  /**
   * Get standard deviation of load for day of week
   */
  private getLoadStdDev(dow: number): number {
    const history = this.getLoadHistory();
    const dowHistory = history.filter(h => h.dow === dow);

    if (dowHistory.length < 4) return 2.0; // Default

    const mean =
      dowHistory.reduce((sum, h) => sum + h.load, 0) / dowHistory.length;
    const variance =
      dowHistory.reduce((sum, h) => sum + Math.pow(h.load - mean, 2), 0) /
      dowHistory.length;

    return Math.sqrt(variance);
  }

  /**
   * Get vibe descriptions based on label and tasks
   */
  private getBusyVibe(tasks: TaskType[]): string {
    const categories = this.getDominantCategories(tasks, 2);
    if (categories.includes('Work') || categories.includes('Meetings')) {
      return 'Рабочий марафон';
    }
    if (categories.includes('Medical / Doctors / Tests')) {
      return 'День здоровья';
    }
    return 'Насыщенный день';
  }

  private getFocusVibe(tasks: TaskType[]): string {
    const categories = this.getDominantCategories(tasks, 1);
    if (categories.includes('Work')) return 'Фокус на работе';
    if (categories.includes('Study')) return 'День учёбы';
    if (categories.includes('Health') || categories.includes('Fitness'))
      return 'Фокус на здоровье';
    return 'Продуктивный день';
  }

  private getBalancedVibe(tasks: TaskType[]): string {
    return 'Сбалансированный день';
  }

  private getChillVibe(tasks: TaskType[]): string {
    const categories = this.getDominantCategories(tasks, 1);
    if (categories.includes('Hobbies')) return 'День для хобби';
    if (categories.includes('Family')) return 'Семейный день';
    if (categories.includes('Entertainment')) return 'Отдых и развлечения';
    return 'Спокойный день';
  }

  /**
   * Get dominant categories
   */
  private getDominantCategories(tasks: TaskType[], n: number): string[] {
    const counts: { [category: string]: number } = {};

    for (const task of tasks) {
      const category = task.category || 'Personal';
      counts[category] = (counts[category] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([category]) => category);
  }

  /**
   * Save load history
   */
  private saveLoadHistory(date: Date, dow: number, load: number): void {
    const dateStr = this.formatDate(date);
    const history = this.getLoadHistory();

    // Remove existing entry for this date
    const filtered = history.filter(h => h.date !== dateStr);

    // Add new entry
    filtered.push({ date: dateStr, dow, load });

    // Keep last 60 days
    const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date));
    const trimmed = sorted.slice(0, 60);

    storage.set('load-history', JSON.stringify(trimmed));
  }

  /**
   * Get load history
   */
  private getLoadHistory(): LoadHistory[] {
    const data = storage.getString('load-history');
    return data ? JSON.parse(data) : [];
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get vibe emoji
   */
  getVibeEmoji(label: DayVibeResult['label']): string {
    const emojis = {
      Busy: '🔥',
      Focus: '🎯',
      Balanced: '⚖️',
      Chill: '😌',
      Free: '🌟',
    };
    return emojis[label];
  }
}

export const EnhancedDayVibeService = new EnhancedDayVibeServiceClass();
