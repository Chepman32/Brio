import PushNotificationIOS from '@react-native-community/push-notification-ios';
import { TaskType } from '../types';
import { getSettings } from '../database/operations';

class NotificationServiceClass {
  private initialized = false;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.requestPermissions();
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
   * Schedule notifications for a task
   * Schedules two notifications:
   * 1. Warning notification X minutes before (e.g., "Warning! It's 5 minutes to [Task]")
   * 2. Task time notification at exact time (e.g., "It's time for [Task]!")
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

      // Schedule warning notification (X minutes before)
      const warningTime = new Date(taskTime);
      warningTime.setMinutes(
        warningTime.getMinutes() - settings.defaultReminderTime,
      );

      if (warningTime > now) {
        const minutesText =
          settings.defaultReminderTime === 1
            ? 'minute'
            : `${settings.defaultReminderTime} minutes`;

        PushNotificationIOS.addNotificationRequest({
          id: `${task._id}_warning`,
          title: '⚠️ Task Warning',
          body: `Warning! It's ${minutesText} to ${task.title}`,
          fireDate: warningTime,
          userInfo: {
            taskId: task._id,
            type: 'warning',
          },
        });

        console.log(
          `Warning notification scheduled for: ${
            task.title
          } at ${warningTime.toLocaleTimeString()}`,
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
   * Handle notification tap
   */
  setupNotificationHandlers(onNotificationTap: (taskId: string) => void): void {
    PushNotificationIOS.addEventListener('notification', notification => {
      const data = notification.getData();
      if (data && data.taskId) {
        onNotificationTap(data.taskId);
      }
    });
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
