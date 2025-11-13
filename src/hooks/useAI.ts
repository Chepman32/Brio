/**
 * useAI Hook
 * Convenient React hook for accessing AI features
 */

import { useState, useEffect, useCallback } from 'react';
import { TaskType } from '../types';
import { AICoordinatorService } from '../services/AICoordinatorService';

export function useAI(tasks: TaskType[]) {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Load AI dashboard
   */
  const loadDashboard = useCallback(async () => {
    if (tasks.length === 0) {
      // Don't load if no tasks yet
      return;
    }

    setLoading(true);
    try {
      const data = await AICoordinatorService.getDashboard(tasks);
      setDashboard(data);
    } catch (error) {
      console.error('Error loading AI dashboard:', error);
      // Set empty dashboard on error
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  }, [tasks]);

  /**
   * Process natural language input
   */
  const parseNaturalLanguage = useCallback(
    async (text: string) => {
      return await AICoordinatorService.processNaturalLanguage(text, tasks);
    },
    [tasks],
  );

  /**
   * Get snooze options for task
   */
  const getSnoozeOptions = useCallback((task: TaskType) => {
    return AICoordinatorService.getSnoozeOptions(task);
  }, []);

  /**
   * Handle task completion
   */
  const onTaskCompleted = useCallback(
    async (task: TaskType) => {
      return await AICoordinatorService.onTaskCompleted(task, tasks);
    },
    [tasks],
  );

  /**
   * Handle task snoozed
   */
  const onTaskSnoozed = useCallback(
    async (task: TaskType, minutes: number, wasOpened: boolean) => {
      await AICoordinatorService.onTaskSnoozed(task, minutes, wasOpened);
    },
    [],
  );

  /**
   * Search tasks
   */
  const searchTasks = useCallback(
    async (query: string, filters?: any) => {
      return await AICoordinatorService.searchTasks(query, tasks, filters);
    },
    [tasks],
  );

  /**
   * Get search suggestions
   */
  const getSearchSuggestions = useCallback(
    (partialQuery: string) => {
      return AICoordinatorService.getSearchSuggestions(partialQuery, tasks);
    },
    [tasks],
  );

  /**
   * Run periodic analysis
   */
  const runAnalysis = useCallback(async () => {
    await AICoordinatorService.runPeriodicAnalysis(tasks);
    await loadDashboard();
  }, [tasks, loadDashboard]);

  /**
   * Auto-merge duplicates
   */
  const autoMergeDuplicates = useCallback(async () => {
    return await AICoordinatorService.autoMergeDuplicates(tasks);
  }, [tasks]);

  // Load dashboard on mount and when tasks change
  useEffect(() => {
    // Add a small delay to ensure Realm is initialized
    const timer = setTimeout(() => {
      loadDashboard();
    }, 200);

    return () => clearTimeout(timer);
  }, [loadDashboard]);

  return {
    dashboard,
    loading,
    parseNaturalLanguage,
    getSnoozeOptions,
    onTaskCompleted,
    onTaskSnoozed,
    searchTasks,
    getSearchSuggestions,
    runAnalysis,
    autoMergeDuplicates,
    refreshDashboard: loadDashboard,
  };
}
