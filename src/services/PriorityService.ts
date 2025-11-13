/**
 * Local Priority Scoring Service
 * Calculates task priority scores based on multiple factors
 * Fully offline algorithm
 */

import { TaskType } from '../types';
import {
  PriorityScore,
  PriorityWeights,
  KeywordDict,
} from '../types/priority.types';
import { getStats } from '../database/operations';

class PriorityServiceClass {
  // Default weights
  private readonly WEIGHTS: PriorityWeights = {
    deadline: 0.42,
    keyword: 0.25,
    category: 0.18,
    streak: 0.1,
    duration: 0.05,
  };

  // Keyword importance dictionary
  private readonly KEYWORD_WEIGHTS: KeywordDict = {
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
    call: 0.5,
    email: 0.4,
    review: 0.5,
    submit: 0.7,
    send: 0.6,
  };

  // Category importance weights
  private readonly CATEGORY_WEIGHTS: { [category: string]: number } = {
    'Medical / Doctors / Tests': 0.9,
    'Banking / Payments': 0.8,
    'Car Service / Insurance / Taxes': 0.7,
    Legal: 0.8,
    Work: 0.7,
    Meetings: 0.7,
    'Important but Not Urgent': 0.6,
    Family: 0.6,
    Health: 0.7,
    Fitness: 0.5,
    Personal: 0.4,
    Hobbies: 0.3,
    Entertainment: 0.2,
  };

  // Tau for deadline pressure decay (in minutes)
  private readonly TAU = 720; // 12 hours

  /**
   * Calculate comprehensive priority score for a task
   */
  calculateScore(task: TaskType): PriorityScore {
    const deadlinePressure = this.calculateDeadlinePressure(task);
    const keywordWeight = this.calculateKeywordWeight(task);
    const categoryWeight = this.calculateCategoryWeight(task);
    const streakWeight = this.calculateStreakWeight();
    const durationPenalty = this.calculateDurationPenalty(task);

    const score = this.clamp01(
      this.WEIGHTS.deadline * deadlinePressure +
        this.WEIGHTS.keyword * keywordWeight +
        this.WEIGHTS.category * categoryWeight +
        this.WEIGHTS.streak * streakWeight +
        this.WEIGHTS.duration * durationPenalty,
    );

    return {
      score,
      deadlinePressure,
      keywordWeight,
      categoryWeight,
      streakWeight,
      durationPenalty,
    };
  }

  /**
   * Calculate deadline pressure using exponential decay
   * Returns 0..1, higher = more urgent
   */
  private calculateDeadlinePressure(task: TaskType): number {
    if (!task.dueDate) return 0.3; // No deadline = low pressure

    const now = new Date();
    const due = new Date(task.dueDate);
    const minutesToDue = (due.getTime() - now.getTime()) / (1000 * 60);

    if (minutesToDue < 0) return 1.0; // Overdue = max pressure

    // Exponential decay: pressure = exp(-minutesToDue / tau)
    const pressure = Math.exp(-Math.max(0, minutesToDue) / this.TAU);

    return this.clamp01(pressure);
  }

  /**
   * Calculate keyword weight from title and notes
   */
  private calculateKeywordWeight(task: TaskType): number {
    const text = `${task.title} ${task.notes || ''}`.toLowerCase();
    let weight = 0;

    for (const [keyword, value] of Object.entries(this.KEYWORD_WEIGHTS)) {
      if (text.includes(keyword)) {
        weight += value;
      }
    }

    return this.clamp01(weight);
  }

  /**
   * Calculate category weight
   */
  private calculateCategoryWeight(task: TaskType): number {
    if (!task.category) return 0.4; // Default
    return this.CATEGORY_WEIGHTS[task.category] || 0.4;
  }

  /**
   * Calculate streak weight (motivation factor)
   */
  private calculateStreakWeight(): number {
    try {
      const stats = getStats();
      const streakDays = stats.currentStreak;

      // Logarithmic scaling: log(1 + days) / log(1 + 30)
      // Max out at 30 days
      const weight = Math.log1p(streakDays) / Math.log1p(30);

      return this.clamp01(weight);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate duration penalty (shorter tasks = higher priority)
   */
  private calculateDurationPenalty(task: TaskType): number {
    // Estimate duration from title length and complexity
    const titleLength = task.title.length;
    const hasNotes = !!task.notes;

    // Simple heuristic: 15-60 minutes for most tasks
    const estimatedMinutes = Math.min(
      120,
      titleLength * 2 + (hasNotes ? 30 : 0),
    );

    // Penalty: 1 - (minutes / 120)
    // Shorter tasks get higher scores
    const penalty = 1 - this.clamp01(estimatedMinutes / 120);

    return penalty;
  }

  /**
   * Sort tasks by priority score
   */
  sortByPriority(tasks: TaskType[]): TaskType[] {
    const scored = tasks.map(task => ({
      task,
      score: this.calculateScore(task).score,
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.map(item => item.task);
  }

  /**
   * Get top N priority tasks for today
   */
  getTopTasksForToday(tasks: TaskType[], n: number = 3): TaskType[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Filter tasks due today
    const todayTasks = tasks.filter(task => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      return due >= today && due < tomorrow;
    });

    // Sort by priority
    const sorted = this.sortByPriority(todayTasks);

    return sorted.slice(0, n);
  }

  /**
   * Get priority label from score
   */
  getPriorityLabel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  /**
   * Stabilize score using EMA (Exponential Moving Average)
   * Prevents sudden jumps in priority
   */
  stabilizeScore(
    currentScore: number,
    previousScore: number,
    alpha: number = 0.3,
  ): number {
    return alpha * currentScore + (1 - alpha) * previousScore;
  }

  /**
   * Clamp value to 0..1 range
   */
  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}

export const PriorityService = new PriorityServiceClass();
