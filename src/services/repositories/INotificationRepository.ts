/**
 * Abstract Notification Repository Contract
 */
import { AppNotification } from '../../types';

export interface INotificationRepository {
  getNotifications(managerId: string): Promise<AppNotification[]>;
  getUnreadCount(managerId: string): Promise<number>;
  markAsRead(notificationId: string): Promise<AppNotification>;
  markAllAsRead(managerId: string): Promise<void>;
  registerFCMToken(managerId: string, fcmToken: string, role?: string, territory?: any): Promise<boolean>;
  unregisterFCMToken(managerId: string, fcmToken: string): Promise<boolean>;
}
