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
   * Schedule a notification for a task
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

      // Calculate notification time (default reminder time before due)
      const notificationDate = new Date(task.dueTime);
      notificationDate.setMinutes(
        notificationDate.getMinutes() - settings.defaultReminderTime,
      );

      // Don't schedule if notification time is in the past
      if (notificationDate <= new Date()) {
        return;
      }

      // Schedule the notification
      PushNotificationIOS.addNotificationRequest({
        id: task._id,
        title: 'Task Reminder',
        body: task.title,
        fireDate: notificationDate,
        userInfo: {
          taskId: task._id,
        },
      });

      console.log(
        `Notification scheduled for task: ${task.title} at ${notificationDate}`,
      );
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  /**
   * Cancel a notification for a task
   */
  async cancelNotification(taskId: string): Promise<void> {
    try {
      PushNotificationIOS.removePendingNotificationRequests([taskId]);
      console.log(`Notification cancelled for task: ${taskId}`);
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
