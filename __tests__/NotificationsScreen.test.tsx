/**
 * Notifications Feature & Repository Integration Test Suite
 */
import { services } from '../src/services';
import { AppNotification } from '../src/types';

export interface NotificationGroupSection {
  title: string;
  data: AppNotification[];
}

export const groupNotifications = (notifications: AppNotification[]): NotificationGroupSection[] => {
  const now = new Date();
  const todayItems: AppNotification[] = [];
  const earlierItems: AppNotification[] = [];

  notifications.forEach(n => {
    try {
      const d = new Date(n.createdAt);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      if (isToday) {
        todayItems.push(n);
      } else {
        earlierItems.push(n);
      }
    } catch {
      earlierItems.push(n);
    }
  });

  const sections: NotificationGroupSection[] = [];
  if (todayItems.length > 0) {
    sections.push({ title: 'Today', data: todayItems });
  }
  if (earlierItems.length > 0) {
    sections.push({ title: 'Earlier', data: earlierItems });
  }

  return sections;
};

describe('Notifications Feature & Repository Integration', () => {
  const managerId = 'mgr-001';

  it('1. Repository loads notifications for manager', async () => {
    const list = await services.notificationRepository.getNotifications(managerId);
    expect(list).toBeDefined();
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(list[0].title).toBeDefined();
  });

  it('2. getUnreadCount returns correct unread count', async () => {
    const unreadCount = await services.notificationRepository.getUnreadCount(managerId);
    expect(unreadCount).toBe(2);
  });

  it('3. groupNotifications groups items into Today and Earlier sections', async () => {
    const list = await services.notificationRepository.getNotifications(managerId);
    const grouped = groupNotifications(list);
    expect(grouped.length).toBeGreaterThanOrEqual(1);

    const hasTodaySection = grouped.some(g => g.title === 'Today');
    expect(hasTodaySection).toBe(true);

    const hasEarlierSection = grouped.some(g => g.title === 'Earlier');
    expect(hasEarlierSection).toBe(true);
  });

  it('4. markAsRead updates single notification read state and unread count', async () => {
    const notification = await services.notificationRepository.markAsRead('notif-1');
    expect(notification.isRead).toBe(true);

    const newUnreadCount = await services.notificationRepository.getUnreadCount(managerId);
    expect(newUnreadCount).toBe(1);
  });

  it('5. markAllAsRead sets all manager notifications as read', async () => {
    await services.notificationRepository.markAllAsRead(managerId);
    const unreadCount = await services.notificationRepository.getUnreadCount(managerId);
    expect(unreadCount).toBe(0);

    const allReadList = await services.notificationRepository.getNotifications(managerId);
    expect(allReadList.every(n => n.isRead)).toBe(true);
  });
});
