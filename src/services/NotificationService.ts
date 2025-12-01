import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { TaskType } from '../types';
import { getSettings } from '../database/operations';
import { NotificationRTService } from './NotificationRTService';
import { NotifyLogEvent, NotifyAction } from '../types/notification-rt.types';

class NotificationServiceClass {
  private initialized = false;
  private deliveryTracking: Map<string, number> = new Map(); // taskId -> deliveredAt timestamp

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.requestPermissions();
      await NotificationRTService.initialize();
      this.initialized = true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * Request notification permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await PushNotificationIOS.requestPermissions({
        alert: true,
        badge: true,
        sound: true,
      });

      return permissions.alert === true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule notifications for a task using RT-optimized timing
   * Uses the RT service to determine optimal notification time
   */
  async scheduleNotification(task: TaskType): Promise<void> {
    try {
      const settings = getSettings();

      if (!settings.notificationsEnabled) {
        return;
      }

      if (!task.dueTime) {
        return; // No time set, can't schedule
      }

      const now = new Date();
      const taskTime = new Date(task.dueTime);

      // Get RT-optimized slot recommendation
      const category = task.category || 'general';
      const dueMs = taskTime.getTime();
      const estDurationMs = 30 * 60 * 1000; // Default 30 min estimate

      const recommendation = await NotificationRTService.getOptimalSlot(
        category,
        task.priority,
        dueMs,
        estDurationMs,
        {
          reminderText: `${task.title} ${task.notes || ''}`,
        },
      );

      // Calculate optimal notification time based on RT patterns
      const medianRtMs =
        recommendation.estimatedOpenTime.getTime() - Date.now();
      const optimalNotifyTime = new Date(taskTime.getTime() - medianRtMs);

      // Schedule warning notification (RT-adjusted)
      const warningTime = new Date(
        Math.max(
          optimalNotifyTime.getTime(),
          taskTime.getTime() - settings.defaultReminderTime * 60 * 1000,
        ),
      );

      if (warningTime > now) {
        const minutesText =
          settings.defaultReminderTime === 1
            ? 'minute'
            : `${settings.defaultReminderTime} minutes`;

        const isSilent =
          recommendation.channelConfig.volume === 'silent' ||
          recommendation.channelConfig.volume === 'quiet';

        PushNotificationIOS.addNotificationRequest({
          id: `${task._id}_warning`,
          title: isSilent ? '📋 Task Reminder' : '⚠️ Task Warning',
          body: `Warning! It's ${minutesText} to ${task.title}`,
          fireDate: warningTime,
          isSilent,
          userInfo: {
            taskId: task._id,
            type: 'warning',
            category,
            priority: task.priority,
          },
        });

        // Track delivery for RT learning
        this.deliveryTracking.set(task._id, warningTime.getTime());

        console.log(
          `RT-optimized warning notification scheduled for: ${
            task.title
          } at ${warningTime.toLocaleTimeString()} (confidence: ${Math.round(
            recommendation.confidence * 100,
          )}%)`,
        );
      }

      // Schedule task time notification (at exact time)
      if (taskTime > now) {
        PushNotificationIOS.addNotificationRequest({
          id: `${task._id}_time`,
          title: '🔔 Task Time!',
          body: `It's time for ${task.title}!`,
          fireDate: taskTime,
          userInfo: {
            taskId: task._id,
            type: 'time',
            category,
            priority: task.priority,
          },
        });

        console.log(
          `Task time notification scheduled for: ${
            task.title
          } at ${taskTime.toLocaleTimeString()}`,
        );
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  /**
   * Cancel all notifications for a task (both warning and time notifications)
   */
  async cancelNotification(taskId: string): Promise<void> {
    try {
      PushNotificationIOS.removePendingNotificationRequests([
        `${taskId}_warning`,
        `${taskId}_time`,
      ]);
      console.log(`Notifications cancelled for task: ${taskId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Update a notification (cancel old and schedule new)
   */
  async updateNotification(task: TaskType): Promise<void> {
    try {
      await this.cancelNotification(task._id);
      await this.scheduleNotification(task);
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      PushNotificationIOS.removeAllPendingNotificationRequests();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get pending notifications
   */
  async getPendingNotifications(): Promise<any[]> {
    return new Promise(resolve => {
      PushNotificationIOS.getPendingNotificationRequests(notifications => {
        resolve(notifications);
      });
    });
  }

  /**
   * Handle notification tap and log RT event
   */
  setupNotificationHandlers(onNotificationTap: (taskId: string) => void): void {
    PushNotificationIOS.addEventListener('notification', notification => {
      const data = notification.getData();
      if (data && data.taskId) {
        // Log RT event
        this.logNotificationInteraction(
          data.taskId,
          'open',
          data.category,
          data.priority,
        );
        onNotificationTap(data.taskId);
      }
    });
  }

  /**
   * Log notification interaction for RT learning
   */
  async logNotificationInteraction(
    taskId: string,
    action: NotifyAction,
    category?: string,
    priority?: 'low' | 'medium' | 'high',
  ): Promise<void> {
    try {
      const deliveredAt = this.deliveryTracking.get(taskId);
      if (!deliveredAt) {
        console.warn('No delivery tracking found for task:', taskId);
        return;
      }

      const now = Date.now();
      const deliveryDate = new Date(deliveredAt);

      const event: NotifyLogEvent = {
        id: `${taskId}_${now}`,
        taskId,
        category: category || 'general',
        deliveredAt,
        openedAt:
          action === 'open' || action === 'completeFromPush' ? now : undefined,
        action,
        dayOfWeek: deliveryDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        hourBin: this.calculateHourBin(deliveryDate),
        priority01: this.normalizePriority(priority || 'medium'),
        dueInMinAtDelivery: 0, // Can be enhanced with actual due time
        isSilent: false,
      };

      await NotificationRTService.logEvent(event);

      // Clean up tracking
      if (
        action === 'open' ||
        action === 'completeFromPush' ||
        action === 'dismiss'
      ) {
        this.deliveryTracking.delete(taskId);
      }
    } catch (error) {
      console.error('Error logging notification interaction:', error);
    }
  }

  /**
   * Get smart snooze suggestions based on RT patterns
   */
  async getSmartSnoozeOptions(
    taskId: string,
    category: string,
  ): Promise<Array<{ minutes: number; label: string; reason: string }>> {
    try {
      const now = new Date();
      const dow = now.getDay();
      const bin = this.calculateHourBin(now);

      return await NotificationRTService.proposeSnoozeOptions(
        category,
        dow,
        bin,
      );
    } catch (error) {
      console.error('Error getting smart snooze options:', error);
      // Fallback to default options
      return [
        { minutes: 15, label: '15 min', reason: 'Quick break' },
        { minutes: 30, label: '30 min', reason: 'Short delay' },
        { minutes: 60, label: '1 hour', reason: 'Later today' },
      ];
    }
  }

  private calculateHourBin(date: Date): number {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return Math.floor((hours * 60 + minutes) / 30); // 30-minute bins
  }

  private normalizePriority(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high':
        return 1.0;
      case 'medium':
        return 0.6;
      case 'low':
        return 0.3;
    }
  }

  /**
   * Remove notification listeners
   */
  removeNotificationHandlers(): void {
    PushNotificationIOS.removeEventListener('notification');
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();
