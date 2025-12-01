import {
  getStats,
  getDailyCompletionPattern,
  getWeeklyCompletionPattern,
  updateCompletionPattern,
  incrementTasksCompleted,
  updateStreak,
} from '../database/operations';
import { TaskType, TaskInput } from '../types';
import { ContextAwarenessService } from './ContextAwarenessService';

/**
 * Smart Planning Service
 *
 * This service analyzes user behavior patterns to provide intelligent task scheduling suggestions.
 * It uses a combination of:
 * 1. Time-of-day analysis (when user typically completes tasks)
 * 2. Day-of-week analysis (which days user is most productive)
 * 3. Task category patterns (when certain types of tasks are usually done)
 * 4. Completion velocity (how quickly tasks are completed)
 * 5. Workload balancing (avoiding overloading specific time slots)
 */

class SmartPlanningServiceClass {
  private readonly LEARNING_RATE = 0.3; // How quickly to adapt to new patterns
  private readonly MIN_SAMPLES = 5; // Minimum completions needed for reliable suggestions
  private readonly CONFIDENCE_THRESHOLD = 0.6; // Minimum confidence for suggestions

  /**
   * Analyze completion patterns and update statistics
   */
  analyzeCompletionPatterns(): void {
    try {
      const stats = getStats();
      const dailyPattern = getDailyCompletionPattern();
      const weeklyPattern = getWeeklyCompletionPattern();

      // Calculate pattern strength
      const totalCompletions = stats.totalTasksCompleted;

      if (totalCompletions < this.MIN_SAMPLES) {
        console.log('Not enough data for pattern analysis');
        return;
      }

      // Identify peak productivity hours
      const peakHours = this.findPeakHours(dailyPattern);

      // Identify most productive days
      const productiveDays = this.findProductiveDays(weeklyPattern);

      console.log('Pattern Analysis:', {
        totalCompletions,
        peakHours,
        productiveDays,
        currentStreak: stats.currentStreak,
      });
    } catch (error) {
      console.error('Error analyzing patterns:', error);
    }
  }

  /**
   * Suggest optimal time for a task based on learned patterns and current context
   */
  async suggestTaskTime(task: TaskInput): Promise<Date> {
    try {

      const weeklyPattern = getWeeklyCompletionPattern();
      const stats = getStats();
      const context = await ContextAwarenessService.getCurrentContext();

      // Magic Context Checks
      if (context.isDeepWorkPossible && task.priority === 'high') {
         // If deep work is possible and high priority, suggest NOW (or very soon)
         const now = new Date();
         now.setMinutes(now.getMinutes() + 15); // Give 15 min buffer
         return now;
      }

      // If not enough data, use smart defaults
      if (stats.totalTasksCompleted < this.MIN_SAMPLES) {
        return this.getDefaultSuggestion(task);
      }

      // Get optimal hour based on historical patterns
      const optimalHour = this.getOptimalSchedulingTime();

      // Get optimal day based on task priority and patterns
      const optimalDay = this.getOptimalDay(task, weeklyPattern);

      // Create suggested date/time
      const suggestedDate = new Date();
      suggestedDate.setDate(suggestedDate.getDate() + optimalDay);
      suggestedDate.setHours(optimalHour, 0, 0, 0);

      // Adjust for task priority
      const adjustedDate = this.adjustForPriority(suggestedDate, task.priority);

      return adjustedDate;
    } catch (error) {
      console.error('Error suggesting task time:', error);
      return this.getDefaultSuggestion(task);
    }
  }

  /**
   * Update user statistics after task completion
   */
  updateUserStats(completedTask: TaskType): void {
    try {
      // Update completion count
      incrementTasksCompleted();

      // Update streak
      updateStreak();

      // Update completion patterns
      if (completedTask.completedAt) {
        updateCompletionPattern(completedTask.completedAt);
      }

      // Re-analyze patterns with new data
      this.analyzeCompletionPatterns();
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }

  /**
   * Get optimal scheduling time (hour of day) based on patterns
   */
  getOptimalSchedulingTime(): number {
    try {
      const dailyPattern = getDailyCompletionPattern();
      const stats = getStats();

      if (stats.totalTasksCompleted < this.MIN_SAMPLES) {
        return 9; // Default to 9 AM
      }

      // Find hour with highest completion rate
      const peakHours = this.findPeakHours(dailyPattern);

      if (peakHours.length === 0) {
        return 9; // Default
      }

      // Return the most productive hour
      return peakHours[0].hour;
    } catch (error) {
      console.error('Error getting optimal time:', error);
      return 9;
    }
  }

  /**
   * Predict task completion probability for a given time
   */
  async predictCompletionProbability(date: Date): Promise<number> {
    try {
      const hour = date.getHours();
      const day = date.getDay();

      const dailyPattern = getDailyCompletionPattern();
      const weeklyPattern = getWeeklyCompletionPattern();
      const stats = getStats();
      const context = await ContextAwarenessService.getCurrentContext();

      if (stats.totalTasksCompleted < this.MIN_SAMPLES) {
        return 0.5; // Neutral probability
      }

      // Calculate hour score (0-1)
      const hourCompletions = dailyPattern[hour.toString()] || 0;
      const maxHourCompletions = Math.max(...Object.values(dailyPattern));
      const hourScore =
        maxHourCompletions > 0 ? hourCompletions / maxHourCompletions : 0.5;

      // Calculate day score (0-1)
      const dayCompletions = weeklyPattern[day.toString()] || 0;
      const maxDayCompletions = Math.max(...Object.values(weeklyPattern));
      const dayScore =
        maxDayCompletions > 0 ? dayCompletions / maxDayCompletions : 0.5;

      // Context Multipliers
      let contextMultiplier = 1.0;
      
      // If predicting for NOW (or close to now)
      if (Math.abs(date.getTime() - Date.now()) < 30 * 60 * 1000) {
          if (context.isDeepWorkPossible) contextMultiplier *= 1.2;
          if (context.batteryLevel < 0.15 && !context.isCharging) contextMultiplier *= 0.7;
          if (context.isCommuting) contextMultiplier *= 0.5;
      }

      // Weighted combination
      const probability = (hourScore * 0.6 + dayScore * 0.4) * contextMultiplier;

      return Math.max(0.1, Math.min(0.9, probability));
    } catch (error) {
      console.error('Error predicting completion probability:', error);
      return 0.5;
    }
  }

  /**
   * Get smart suggestions for task scheduling
   */
  async getSmartSuggestions(task: TaskInput): Promise<{
    suggestedTime: Date;
    confidence: number;
    reason: string;
    alternatives: Array<{ time: Date; confidence: number; reason: string }>;
  }> {
    const suggestedTime = await this.suggestTaskTime(task);
    const confidence = await this.predictCompletionProbability(suggestedTime);

    // Generate reason based on patterns
    const reason = this.generateSuggestionReason(suggestedTime, task);

    // Generate alternative suggestions
    const alternatives = await this.generateAlternatives(task, suggestedTime);

    return {
      suggestedTime,
      confidence,
      reason,
      alternatives,
    };
  }

  // Private helper methods

  private findPeakHours(dailyPattern: {
    [hour: string]: number;
  }): Array<{ hour: number; count: number }> {
    const hours = Object.entries(dailyPattern)
      .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
      .sort((a, b) => b.count - a.count);

    return hours.slice(0, 3); // Top 3 peak hours
  }

  private findProductiveDays(weeklyPattern: {
    [day: string]: number;
  }): Array<{ day: number; count: number }> {
    const days = Object.entries(weeklyPattern)
      .map(([day, count]) => ({ day: parseInt(day, 10), count }))
      .sort((a, b) => b.count - a.count);

    return days.slice(0, 3); // Top 3 productive days
  }

  private getDefaultSuggestion(task: TaskInput): Date {
    const now = new Date();
    const suggestedDate = new Date(now);

    // Default suggestions based on priority
    switch (task.priority) {
      case 'high':
        // High priority: suggest within next 2 hours
        suggestedDate.setHours(now.getHours() + 2);
        break;
      case 'medium':
        // Medium priority: suggest tomorrow morning
        suggestedDate.setDate(now.getDate() + 1);
        suggestedDate.setHours(9, 0, 0, 0);
        break;
      case 'low':
        // Low priority: suggest in 2-3 days
        suggestedDate.setDate(now.getDate() + 2);
        suggestedDate.setHours(14, 0, 0, 0);
        break;
    }

    return suggestedDate;
  }

  private getOptimalDay(
    task: TaskInput,
    weeklyPattern: { [day: string]: number },
  ): number {
    // Find most productive day
    const productiveDays = this.findProductiveDays(weeklyPattern);

    if (productiveDays.length === 0) {
      // Default based on priority
      return task.priority === 'high' ? 0 : task.priority === 'medium' ? 1 : 2;
    }

    // For high priority, suggest soonest productive day
    if (task.priority === 'high') {
      const today = new Date().getDay();
      const nextProductiveDay = productiveDays.find(d => d.day >= today);
      return nextProductiveDay ? nextProductiveDay.day - today : 0;
    }

    // For medium/low priority, suggest most productive day
    const mostProductiveDay = productiveDays[0].day;
    const today = new Date().getDay();
    const daysUntil = (mostProductiveDay - today + 7) % 7;

    return daysUntil === 0 ? 7 : daysUntil; // If today, suggest next week
  }

  private adjustForPriority(
    date: Date,
    priority: 'low' | 'medium' | 'high',
  ): Date {
    const adjusted = new Date(date);
    const now = new Date();

    switch (priority) {
      case 'high':
        // High priority: if suggested time is too far, bring it closer
        if (adjusted.getTime() - now.getTime() > 24 * 60 * 60 * 1000) {
          adjusted.setTime(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours from now
        }
        break;
      case 'low':
        // Low priority: if suggested time is too soon, push it out
        if (adjusted.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
          adjusted.setDate(adjusted.getDate() + 2);
        }
        break;
      // Medium priority: use suggested time as-is
    }

    return adjusted;
  }

  private generateSuggestionReason(
    suggestedTime: Date,
    task: TaskInput,
  ): string {
    const hour = suggestedTime.getHours();
    const stats = getStats();

    if (stats.totalTasksCompleted < this.MIN_SAMPLES) {
      return `Based on ${task.priority} priority`;
    }

    const timeOfDay =
      hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    return `You're most productive in the ${timeOfDay} based on your completion history`;
  }

  private async generateAlternatives(
    task: TaskInput,
    primarySuggestion: Date,
  ): Promise<Array<{ time: Date; confidence: number; reason: string }>> {
    const alternatives: Array<{
      time: Date;
      confidence: number;
      reason: string;
    }> = [];

    // Alternative 1: Earlier in the day
    const earlier = new Date(primarySuggestion);
    earlier.setHours(earlier.getHours() - 3);
    if (earlier > new Date()) {
      alternatives.push({
        time: earlier,
        confidence: await this.predictCompletionProbability(earlier),
        reason: 'Earlier time slot',
      });
    }

    // Alternative 2: Later in the day
    const later = new Date(primarySuggestion);
    later.setHours(later.getHours() + 3);
    alternatives.push({
      time: later,
      confidence: await this.predictCompletionProbability(later),
      reason: 'Later time slot',
    });

    // Alternative 3: Next day same time
    const nextDay = new Date(primarySuggestion);
    nextDay.setDate(nextDay.getDate() + 1);
    alternatives.push({
      time: nextDay,
      confidence: await this.predictCompletionProbability(nextDay),
      reason: 'Next day',
    });

    return alternatives.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
  }
}

// Export singleton instance
export const SmartPlanningService = new SmartPlanningServiceClass();
