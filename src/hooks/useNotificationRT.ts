/**
 * React Hook for Notification RT Features
 *
 * Provides easy access to RT-based notification optimization
 */

import { useState, useEffect, useCallback } from 'react';
import { NotificationRTService } from '../services/NotificationRTService';
import {
  FocusWindow,
  SnoozeOption,
  SlotRecommendation,
} from '../types/notification-rt.types';

export const useNotificationRT = (category: string) => {
  const [focusWindows, setFocusWindows] = useState<FocusWindow[]>([]);
  const [loading, setLoading] = useState(false);

  // Load focus windows for the category
  const loadFocusWindows = useCallback(async () => {
    try {
      setLoading(true);
      const windows = await NotificationRTService.getFocusWindows(category);
      setFocusWindows(windows);
    } catch (error) {
      console.error('Error loading focus windows:', error);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadFocusWindows();
  }, [loadFocusWindows]);

  // Get optimal notification slot
  const getOptimalSlot = useCallback(
    async (
      priority: 'low' | 'medium' | 'high',
      dueDate?: Date,
      estimatedDuration?: number,
    ): Promise<SlotRecommendation | null> => {
      try {
        const dueMs = dueDate?.getTime();
        const estDurationMs = estimatedDuration
          ? estimatedDuration * 60 * 1000
          : undefined;

        return await NotificationRTService.getOptimalSlot(
          category,
          priority,
          dueMs,
          estDurationMs,
        );
      } catch (error) {
        console.error('Error getting optimal slot:', error);
        return null;
      }
    },
    [category],
  );

  // Get smart snooze options
  const getSnoozeOptions = useCallback(async (): Promise<SnoozeOption[]> => {
    try {
      const now = new Date();
      const dow = now.getDay();
      const bin = Math.floor((now.getHours() * 60 + now.getMinutes()) / 30);

      return await NotificationRTService.proposeSnoozeOptions(
        category,
        dow,
        bin,
      );
    } catch (error) {
      console.error('Error getting snooze options:', error);
      return [
        { minutes: 15, label: '15 min', reason: 'Quick break' },
        { minutes: 30, label: '30 min', reason: 'Short delay' },
        { minutes: 60, label: '1 hour', reason: 'Later today' },
      ];
    }
  }, [category]);

  // Get best time suggestion for new task
  const suggestBestTime = useCallback(async (): Promise<Date | null> => {
    try {
      if (focusWindows.length === 0) {
        await loadFocusWindows();
      }

      if (focusWindows.length > 0) {
        const bestWindow = focusWindows[0];
        const now = new Date();
        const currentDow = now.getDay();
        const daysAhead = (bestWindow.dow - currentDow + 7) % 7;

        const suggestedDate = new Date(now);
        suggestedDate.setDate(suggestedDate.getDate() + daysAhead);

        const minutes = bestWindow.startBin * 30;
        suggestedDate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

        // If suggested time is in the past, move to next week
        if (suggestedDate <= now) {
          suggestedDate.setDate(suggestedDate.getDate() + 7);
        }

        return suggestedDate;
      }

      return null;
    } catch (error) {
      console.error('Error suggesting best time:', error);
      return null;
    }
  }, [focusWindows, loadFocusWindows]);

  return {
    focusWindows,
    loading,
    loadFocusWindows,
    getOptimalSlot,
    getSnoozeOptions,
    suggestBestTime,
  };
};

/**
 * Hook for tracking notification interactions
 */
export const useNotificationTracking = () => {
  const logInteraction = useCallback(
    async (
      taskId: string,
      action: 'open' | 'completeFromPush' | 'snooze' | 'dismiss' | 'ignore',
      category: string,
      priority: 'low' | 'medium' | 'high',
    ) => {
      try {
        const now = Date.now();
        const date = new Date(now);

        await NotificationRTService.logEvent({
          id: `${taskId}_${now}`,
          taskId,
          category,
          deliveredAt: now - 1000, // Approximate delivery time
          openedAt:
            action === 'open' || action === 'completeFromPush'
              ? now
              : undefined,
          action,
          dayOfWeek: date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          hourBin: Math.floor((date.getHours() * 60 + date.getMinutes()) / 30),
          priority01:
            priority === 'high' ? 1.0 : priority === 'medium' ? 0.6 : 0.3,
          dueInMinAtDelivery: 0,
          isSilent: false,
        });
      } catch (error) {
        console.error('Error logging interaction:', error);
      }
    },
    [],
  );

  return { logInteraction };
};
