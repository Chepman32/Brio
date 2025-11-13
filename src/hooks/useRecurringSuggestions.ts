/**
 * Hook for managing recurring task suggestions
 */

import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { RecurringSuggestionService } from '../services/RecurringSuggestionService';
import { getRealm } from '../database/realm';
import { SuggestionNotification } from '../types/recurring-suggestion.types';
import { createTask } from '../database/operations/taskOperations';

export const useRecurringSuggestions = () => {
  const [initialized, setInitialized] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<
    SuggestionNotification[]
  >([]);

  useEffect(() => {
    initializeService();
    setupNotificationHandlers();

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  const initializeService = async () => {
    try {
      // Wait a bit for Realm to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      const realm = getRealm();
      await RecurringSuggestionService.initialize(realm);
      setInitialized(true);

      // Plan suggestions on init
      await planSuggestions();
    } catch (error) {
      console.error('Error initializing RecurringSuggestionService:', error);
      // Retry after a delay
      setTimeout(() => {
        initializeService();
      }, 1000);
    }
  };

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && initialized) {
      // Re-plan suggestions when app becomes active
      await planSuggestions();
    }
  };

  const planSuggestions = async () => {
    try {
      const suggestions =
        await RecurringSuggestionService.planSuggestionNotifications(7);
      setPendingSuggestions(suggestions);

      // Schedule notifications
      for (const suggestion of suggestions) {
        await scheduleSuggestionNotification(suggestion);
      }

      console.log(`Planned ${suggestions.length} recurring task suggestions`);
    } catch (error) {
      console.error('Error planning suggestions:', error);
    }
  };

  const scheduleSuggestionNotification = async (
    suggestion: SuggestionNotification,
  ) => {
    try {
      const fireDate = new Date(suggestion.fireDate);
      const now = new Date();

      if (fireDate <= now) {
        return; // Don't schedule past notifications
      }

      // Check if task already exists for this pattern this week
      const targetWeek = getISOWeek(fireDate);
      const exists = await RecurringSuggestionService.taskExistsForPattern(
        suggestion.patternKey,
        targetWeek,
      );

      if (exists) {
        console.log(
          `Task already exists for pattern ${suggestion.patternKey}, skipping suggestion`,
        );
        return;
      }

      PushNotificationIOS.addNotificationRequest({
        id: suggestion.id,
        title: suggestion.title,
        body: suggestion.rationale,
        fireDate,
        userInfo: {
          type: 'recurring_suggestion',
          patternKey: suggestion.patternKey,
          displayTitle: suggestion.displayTitle,
          targetDow: suggestion.targetDow,
          targetLabel: suggestion.targetLabel,
        },
      });

      console.log(
        `Scheduled suggestion: ${
          suggestion.title
        } at ${fireDate.toLocaleString()}`,
      );
    } catch (error) {
      console.error('Error scheduling suggestion notification:', error);
    }
  };

  const setupNotificationHandlers = () => {
    PushNotificationIOS.addEventListener('notification', async notification => {
      const data = notification.getData();

      if (data && data.type === 'recurring_suggestion') {
        // User tapped on suggestion notification
        await RecurringSuggestionService.handleSuggestionResponse(
          data.patternKey,
          'ignored', // Default to ignored, will be updated if they take action
        );
      }
    });
  };

  const handleAddTask = async (
    patternKey: string,
    displayTitle: string,
    targetDow: number,
    addToday: boolean = false,
  ) => {
    try {
      const dueDate = addToday ? new Date() : getNextDateWithDow(targetDow);

      await createTask({
        title: displayTitle,
        dueDate,
        category: 'general',
        priority: 'medium',
      });

      await RecurringSuggestionService.handleSuggestionResponse(
        patternKey,
        'accepted',
      );

      // Re-plan suggestions
      await planSuggestions();

      console.log(`Added task from suggestion: ${displayTitle}`);
    } catch (error) {
      console.error('Error adding task from suggestion:', error);
    }
  };

  const handleDismissSuggestion = async (patternKey: string) => {
    try {
      await RecurringSuggestionService.handleSuggestionResponse(
        patternKey,
        'dismissed',
      );

      // Re-plan suggestions
      await planSuggestions();

      console.log(`Dismissed suggestion for pattern: ${patternKey}`);
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const getPatternStats = async () => {
    try {
      return await RecurringSuggestionService.getPatternStats();
    } catch (error) {
      console.error('Error getting pattern stats:', error);
      return null;
    }
  };

  const unpausePattern = async (patternKey: string) => {
    try {
      await RecurringSuggestionService.unpausePattern(patternKey);
      await planSuggestions();
      console.log(`Unpaused pattern: ${patternKey}`);
    } catch (error) {
      console.error('Error unpausing pattern:', error);
    }
  };

  const deletePattern = async (patternKey: string) => {
    try {
      await RecurringSuggestionService.deletePattern(patternKey);
      await planSuggestions();
      console.log(`Deleted pattern: ${patternKey}`);
    } catch (error) {
      console.error('Error deleting pattern:', error);
    }
  };

  return {
    initialized,
    pendingSuggestions,
    handleAddTask,
    handleDismissSuggestion,
    getPatternStats,
    unpausePattern,
    deletePattern,
    refreshSuggestions: planSuggestions,
  };
};

// Helper functions
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

function getNextDateWithDow(
  targetDow: number,
  fromDate: Date = new Date(),
): Date {
  const result = new Date(fromDate);
  result.setHours(0, 0, 0, 0);

  const currentDow = result.getDay();
  let daysToAdd = targetDow - currentDow;

  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  result.setDate(result.getDate() + daysToAdd);
  return result;
}
