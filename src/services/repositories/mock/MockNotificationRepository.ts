/**
 * Mock Implementation of INotificationRepository
 */
import { INotificationRepository } from '../INotificationRepository';
import { AppNotification } from '../../../types';

const getDynamicMockNotifications = (): AppNotification[] => {
  return [];
};

export class MockNotificationRepository implements INotificationRepository {
  private notifications: AppNotification[] = getDynamicMockNotifications();

  async getNotifications(managerId: string): Promise<AppNotification[]> {
    return this.notifications
      .filter(n => n.targetManagerId === managerId || managerId === 'mgr-000')
      .map(n => ({ ...n }));
  }

  async getUnreadCount(managerId: string): Promise<number> {
    const list = await this.getNotifications(managerId);
    return list.filter(n => !n.isRead).length;
  }

  async markAsRead(notificationId: string): Promise<AppNotification> {
    const found = this.notifications.find(n => n.id === notificationId);
    if (!found) {
      throw new Error('Notification not found');
    }
    found.isRead = true;
    return { ...found };
  }

  async markAllAsRead(managerId: string): Promise<void> {
    this.notifications.forEach(n => {
      if (n.targetManagerId === managerId) {
        n.isRead = true;
      }
    });
  }

  async registerFCMToken(_managerId: string, _fcmToken: string): Promise<boolean> {
    return true;
  }

  async unregisterFCMToken(_managerId: string, _fcmToken: string): Promise<boolean> {
    return true;
  }
}
