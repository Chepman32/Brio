/**
 * AI Coordinator Service
 * Central hub for all AI-powered features
 * Coordinates NLP, priority, patterns, RT, snooze, vibe, search
 */

import { TaskType, TaskInput, ParsedIntent } from '../types';
import { NLPParserService } from './NLPParserService';
import { PriorityService } from './PriorityService';
import { PatternDetectionService } from './PatternDetectionService';
import { NotificationRTService } from './NotificationRTService';
import { PersonalizedSnoozeService } from './PersonalizedSnoozeService';
import { EnhancedDayVibeService } from './EnhancedDayVibeService';
import { SearchAndDedupeService } from './SearchAndDedupeService';
import { SmartPlanningService } from './SmartPlanningService';
import { AchievementService } from './AchievementService';

interface AITaskSuggestion {
  parsedIntent: ParsedIntent;
  priorityScore: number;
  suggestedTime?: Date;
  chainSuggestions?: string[];
  duplicateWarning?: {
    existingTask: TaskType;
    similarity: number;
  };
}

interface AIDashboard {
  topPriorities: TaskType[];
  dayVibe: {
    label: string;
    emoji: string;
    zScore: number;
    gradientColors: string[];
  };
  recurringReminders: Array<{
    pattern: any;
    suggestion: string;
  }>;
  chainSuggestions: Array<{
    anchor: string;
    suggestions: string[];
  }>;
  duplicates: Array<{
    task1: TaskType;
    task2: TaskType;
    similarity: number;
  }>;
  achievements: any[];
}

class AICoordinatorServiceClass {
  /**
   * Process natural language input into task suggestion
   */
  async processNaturalLanguage(
    text: string,
    existingTasks: TaskType[],
  ): Promise<AITaskSuggestion> {
    // Parse with NLP
    const parsedIntent = NLPParserService.parse(text);

    // Calculate priority
    const tempTask: Partial<TaskType> = {
      title: parsedIntent.title,
      dueDate: parsedIntent.when,
      category: parsedIntent.category,
      priority: 'medium',
    };
    const priorityScore = PriorityService.calculateScore(
      tempTask as TaskType,
    ).score;

    // Get suggested time from smart planning
    const taskInput: TaskInput = {
      title: parsedIntent.title,
      dueDate: parsedIntent.when || new Date(),
      category: parsedIntent.category,
      priority: PriorityService.getPriorityLabel(priorityScore),
    };
    const suggestedTime = await SmartPlanningService.suggestTaskTime(taskInput);

    // Check for duplicates
    const duplicates = SearchAndDedupeService.findDuplicates([
      ...existingTasks,
      { ...tempTask, _id: 'temp' } as TaskType,
    ]);

    const duplicateWarning =
      duplicates.length > 0
        ? {
            existingTask: duplicates[0].task1,
            similarity: duplicates[0].similarity,
          }
        : undefined;

    return {
      parsedIntent,
      priorityScore,
      suggestedTime,
      duplicateWarning,
    };
  }

  /**
   * Get AI-powered dashboard data
   */
  async getDashboard(
    tasks: TaskType[],
    date: Date = new Date(),
  ): Promise<AIDashboard> {
    // Get top priorities
    const incompleteTasks = tasks.filter(t => !t.completed);
    const topPriorities = PriorityService.getTopTasksForToday(
      incompleteTasks,
      3,
    );

    // Get day vibe
    const todayTasks = this.getTasksForDate(tasks, date);
    const vibeResult = EnhancedDayVibeService.analyzeDayVibe(todayTasks, date);
    const dayVibe = {
      label: vibeResult.vibe,
      emoji: EnhancedDayVibeService.getVibeEmoji(vibeResult.label),
      zScore: vibeResult.zScore,
      gradientColors: vibeResult.gradientColors,
    };

    // Get recurring reminders
    const patterns = PatternDetectionService.loadRecurringPatterns();
    const recurringReminders: Array<{
      pattern: any;
      suggestion: string;
    }> = [];

    for (const p of patterns) {
      if (await PatternDetectionService.shouldSuggestRecurring(p)) {
        recurringReminders.push({
          pattern: p,
          suggestion: `Обычно вы создаёте "${p.key.split('::')[0]}" в это время`,
        });
      }
    }

    // Get chain suggestions from recently completed
    const recentlyCompleted = tasks
      .filter(t => t.completed && t.completedAt)
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0),
      )
      .slice(0, 5);

    const chainSuggestions: Array<{ anchor: string; suggestions: string[] }> =
      [];
    for (const task of recentlyCompleted) {
      const suggestions = PatternDetectionService.getChainSuggestions(task);
      if (suggestions.length > 0) {
        chainSuggestions.push({
          anchor: task.title,
          suggestions,
        });
      }
    }

    // Get duplicates
    const duplicates = SearchAndDedupeService.findDuplicates(
      incompleteTasks,
    ).slice(0, 3);

    // Get achievements
    const achievements = AchievementService.checkAchievements();

    return {
      topPriorities,
      dayVibe,
      recurringReminders,
      chainSuggestions,
      duplicates,
      achievements,
    };
  }

  /**
   * Handle task completion with AI updates
   */
  async onTaskCompleted(
    task: TaskType,
    allTasks: TaskType[],
  ): Promise<{
    chainSuggestions?: string[];
    achievements?: any[];
    streakUpdated?: boolean;
  }> {
    // Update smart planning stats
    SmartPlanningService.updateUserStats(task);

    // Update RT stats
    if (task.dueDate) {
      // This would be called from notification interaction
      // NotificationRTService handles this
    }

    // Get chain suggestions
    const chainSuggestions = PatternDetectionService.getChainSuggestions(task);

    // Check achievements
    AchievementService.updateStreak();
    const achievements = AchievementService.checkAchievements();

    // Rebuild search index
    SearchAndDedupeService.buildIndex(allTasks);

    return {
      chainSuggestions:
        chainSuggestions.length > 0 ? chainSuggestions : undefined,
      achievements: achievements.length > 0 ? achievements : undefined,
      streakUpdated: true,
    };
  }

  /**
   * Get personalized snooze options
   */
  getSnoozeOptions(task: TaskType): Array<{ minutes: number; label: string }> {
    const category = task.category || 'Personal';
    const suggestions = PersonalizedSnoozeService.getSuggestions(
      task._id,
      category,
    );

    return suggestions.map(minutes => ({
      minutes,
      label: PersonalizedSnoozeService.formatDuration(minutes),
    }));
  }

  /**
   * Handle snooze action
   */
  async onTaskSnoozed(
    task: TaskType,
    snoozeMinutes: number,
    wasOpened: boolean,
  ): Promise<void> {
    const category = task.category || 'Personal';
    PersonalizedSnoozeService.recordSnooze(
      task._id,
      category,
      snoozeMinutes,
      wasOpened,
    );
  }

  /**
   * Run periodic AI analysis (call daily or on app open)
   */
  async runPeriodicAnalysis(tasks: TaskType[]): Promise<void> {
    // Detect patterns
    const completedTasks = tasks.filter(t => t.completed);
    PatternDetectionService.detectChains(completedTasks);
    await PatternDetectionService.detectRecurringCreation(tasks);

    // Rebuild search index
    SearchAndDedupeService.buildIndex(tasks);

    // Analyze completion patterns
    SmartPlanningService.analyzeCompletionPatterns();

    // Update achievements
    AchievementService.checkAchievements();
  }

  /**
   * Search tasks with AI
   */
  async searchTasks(
    query: string,
    tasks: TaskType[],
    filters?: {
      category?: string;
      priority?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<Array<{ task: TaskType; score: number; matches: string[] }>> {
    return SearchAndDedupeService.search(query, tasks, filters);
  }

  /**
   * Get search suggestions
   */
  getSearchSuggestions(partialQuery: string, tasks: TaskType[]): string[] {
    return SearchAndDedupeService.getSearchSuggestions(partialQuery, tasks);
  }

  /**
   * Auto-merge duplicates
   */
  async autoMergeDuplicates(tasks: TaskType[]): Promise<TaskType[]> {
    const duplicates = SearchAndDedupeService.findDuplicates(tasks);
    const toMerge = duplicates.filter(d => d.shouldMerge);

    if (toMerge.length === 0) return tasks;

    const merged = new Set<string>();
    const result: TaskType[] = [];

    for (const task of tasks) {
      if (merged.has(task._id)) continue;

      // Check if this task should be merged
      const mergeWith = toMerge.find(
        d =>
          (d.task1._id === task._id || d.task2._id === task._id) &&
          !merged.has(d.task1._id) &&
          !merged.has(d.task2._id),
      );

      if (mergeWith) {
        const mergedTask = SearchAndDedupeService.mergeTasks(
          mergeWith.task1,
          mergeWith.task2,
        );
        result.push(mergedTask);
        merged.add(mergeWith.task1._id);
        merged.add(mergeWith.task2._id);
      } else {
        result.push(task);
      }
    }

    return result;
  }

  /**
   * Get optimal notification time for task
   */
  /**
   * Get optimal notification time for task
   */
  async getOptimalNotificationTime(task: TaskType): Promise<Date> {
    const category = task.category || 'Personal';

    // Get optimal slot from RT service
    const recommendation = await NotificationRTService.getOptimalSlot(
      category,
      task.priority || 'medium',
      task.dueDate ? new Date(task.dueDate).getTime() : undefined,
    );

    if (recommendation) {
      return recommendation.estimatedOpenTime;
    }

    // Fallback to smart planning
    const taskInput: TaskInput = {
      title: task.title,
      dueDate: task.dueDate,
      category: task.category,
      priority: task.priority,
    };
    return await SmartPlanningService.suggestTaskTime(taskInput);
  }

  // Helper methods

  private getTasksForDate(tasks: TaskType[], date: Date): TaskType[] {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate);
      return due >= start && due <= end;
    });
  }
}

export const AICoordinatorService = new AICoordinatorServiceClass();
