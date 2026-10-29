import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { AppNotification } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';
import { NotificationCard } from './components/NotificationCard';

export interface NotificationsScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

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

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      try {
        const managerId = manager?.id || 'mgr-001';
        const list = await services.notificationRepository.getNotifications(managerId);
        setNotifications(list);

        const count = list.filter(n => !n.isRead).length;
        setUnreadCount(count);
      } catch (err) {
        setError('Unable to load notifications');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [manager]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications(true);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const managerId = manager?.id || 'mgr-001';
      await services.notificationRepository.markAllAsRead(managerId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore failure silently
    }
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    // 1. Mark as read
    if (!notification.isRead) {
      try {
        await services.notificationRepository.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // Ignore failure
      }
    }

    // 2. Deep link navigation if valid destination exists
    if (notification.deepLinkScreen && onNavigateRoute) {
      onNavigateRoute(notification.deepLinkScreen, notification.deepLinkParams);
    }
  };

  if (isLoading && !isRefreshing) {
    return <FICLoadingState message="Loading notifications..." />;
  }

  if (error) {
    return (
      <FICErrorState
        title="Unable to load notifications"
        message={error}
        onRetry={() => fetchNotifications()}
      />
    );
  }

  const sections = groupNotifications(notifications);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Notifications"
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
        rightActionIcon={
          unreadCount > 0 ? (
            <Text style={styles.markReadText}>Mark all read</Text>
          ) : undefined
        }
        onRightAction={unreadCount > 0 ? handleMarkAllAsRead : undefined}
      />

      <View style={styles.container}>
        {/* Header Subtitle Bar */}
        <View style={styles.topSection}>
          <Text style={styles.subtitleText}>Stay updated with your latest activities</Text>
          {unreadCount > 0 ? (
            <View style={styles.badgeChip}>
              <Text style={styles.badgeChipText}>🔔 {unreadCount} Unread</Text>
            </View>
          ) : (
            <Text style={styles.allReadText}>All notifications read ✓</Text>
          )}
        </View>

        {/* Grouped Notifications SectionList */}
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotificationCard notification={item} onPress={handleNotificationPress} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <FICEmptyState
              title="No Notifications"
              description="You're all caught up."
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerIcon: {
    fontSize: 20,
    color: theme.colors.surface,
  },
  markReadText: {
    ...theme.typography.caption,
    color: theme.colors.surface,
    fontWeight: '700',
    fontSize: 12,
  },
  container: {
    flex: 1,
  },
  topSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  subtitleText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  badgeChip: {
    backgroundColor: theme.colors.primaryLight + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.full,
  },
  badgeChipText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  allReadText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xxs,
    backgroundColor: theme.colors.background,
  },
  sectionHeaderText: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    flexGrow: 1,
  },
});
