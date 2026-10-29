import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { VendorStatus, TaskStatus, IssueStatus } from '../../types';
import { theme } from '../../theme';

export type AnyStatus = VendorStatus | TaskStatus | IssueStatus | string;

export interface FICStatusBadgeProps {
  status: AnyStatus;
  style?: ViewStyle;
  showIcon?: boolean;
}

export const FICStatusBadge: React.FC<FICStatusBadgeProps> = ({ status, style, showIcon = true }) => {
  const getStatusConfig = () => {
    switch (status) {
      case VendorStatus.ONBOARDED:
      case TaskStatus.COMPLETED:
      case IssueStatus.RESOLVED:
      case TaskStatus.RESOLVED:
        return {
          label: String(status).replace('_', ' '),
          bg: theme.colors.successLight,
          text: theme.colors.success,
          icon: '✓',
        };
      case VendorStatus.NOT_INTERESTED:
      case TaskStatus.REJECTED:
      case IssueStatus.REJECTED:
        return {
          label: String(status).replace('_', ' '),
          bg: theme.colors.errorLight,
          text: theme.colors.error,
          icon: '✕',
        };
      case TaskStatus.IN_PROGRESS:
      case IssueStatus.IN_PROGRESS:
      case VendorStatus.VISITED:
        return {
          label: String(status).replace('_', ' '),
          bg: theme.colors.warningLight,
          text: theme.colors.warning,
          icon: '⏳',
        };
      case TaskStatus.ASSIGNED:
      case IssueStatus.OPEN:
      case VendorStatus.LEAD:
      default:
        return {
          label: String(status).replace('_', ' '),
          bg: theme.colors.infoLight,
          text: theme.colors.info,
          icon: '⭕',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, style]}>
      {showIcon && <Text style={[styles.icon, { color: config.text }]}>{config.icon}</Text>}
      <Text style={[styles.label, { color: config.text }]}>{config.label.toUpperCase()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    fontSize: 11,
    fontWeight: '700',
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
});
