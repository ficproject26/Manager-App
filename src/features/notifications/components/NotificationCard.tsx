import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppNotification, NotificationCategory } from '../../../types';
import { theme } from '../../../theme';
import { FICCard } from '../../../components/ui/FICCard';

export interface NotificationCardProps {
  notification: AppNotification;
  onPress: (notification: AppNotification) => void;
}

export const formatNotificationTime = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return 'Yesterday';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    return `${day} ${month} ${date.getFullYear()}`;
  } catch {
    return isoString;
  }
};

export const getNotificationIcon = (notification: AppNotification): string => {
  switch (notification.category) {
    case NotificationCategory.DAILY_REPORT:
      return notification.title.toLowerCase().includes('reminder') ? '🔔' : '📋';
    case NotificationCategory.ISSUE_UPDATE:
      return '✓';
    case NotificationCategory.VENDOR_UPDATE:
      return '🏪';
    case NotificationCategory.SYSTEM:
    default:
      return '⚙️';
  }
};

export const NotificationCard: React.FC<NotificationCardProps> = ({ notification, onPress }) => {
  const isUnread = !notification.isRead;
  const icon = getNotificationIcon(notification);
  const timeText = formatNotificationTime(notification.createdAt);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
      accessibilityRole="button"
      accessibilityLabel={`${isUnread ? 'Unread notification' : 'Notification'}: ${notification.title}`}
    >
      <FICCard style={[styles.card, isUnread && styles.unreadCard]}>
        <View style={styles.contentRow}>
          {/* Category Icon */}
          <View style={[styles.iconCircle, isUnread && styles.unreadIconCircle]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <View style={styles.headerRow}>
              <View style={styles.titleRow}>
                {isUnread && <View style={styles.unreadDot} />}
                <Text style={[styles.title, isUnread && styles.unreadTitle]} numberOfLines={1}>
                  {notification.title}
                </Text>
              </View>
              <Text style={styles.timeText}>{timeText}</Text>
            </View>

            <Text style={[styles.bodyText, isUnread && styles.unreadBodyText]} numberOfLines={2}>
              {notification.body}
            </Text>
          </View>

          {/* Optional Chevron if navigation exists */}
          {notification.deepLinkScreen ? (
            <Text style={styles.chevron}>›</Text>
          ) : null}
        </View>
      </FICCard>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  unreadCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primaryLight + '40',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  unreadIconCircle: {
    backgroundColor: theme.colors.primaryLight + '20',
  },
  iconText: {
    fontSize: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 6,
  },
  title: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  bodyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  unreadBodyText: {
    color: theme.colors.text,
  },
  chevron: {
    fontSize: 20,
    color: theme.colors.textMuted,
    fontWeight: '600',
    alignSelf: 'center',
    marginLeft: theme.spacing.xxs,
  },
});
