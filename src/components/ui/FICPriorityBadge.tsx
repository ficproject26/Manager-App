import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Priority } from '../../types';
import { theme } from '../../theme';

export interface FICPriorityBadgeProps {
  priority: Priority;
  style?: ViewStyle;
}

export const FICPriorityBadge: React.FC<FICPriorityBadgeProps> = ({ priority, style }) => {
  const getBadgeConfig = () => {
    switch (priority) {
      case Priority.HIGH:
        return {
          label: 'HIGH PRIORITY',
          bg: theme.colors.priority.highBg,
          text: theme.colors.priority.high,
          indicatorSymbol: '▲',
        };
      case Priority.MEDIUM:
        return {
          label: 'MEDIUM PRIORITY',
          bg: theme.colors.priority.mediumBg,
          text: theme.colors.priority.medium,
          indicatorSymbol: '■',
        };
      case Priority.LOW:
      default:
        return {
          label: 'LOW PRIORITY',
          bg: theme.colors.priority.lowBg,
          text: theme.colors.priority.low,
          indicatorSymbol: '▼',
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }, style]}
      accessibilityLabel={`Priority: ${config.label}`}
    >
      <Text style={[styles.symbol, { color: config.text }]}>{config.indicatorSymbol}</Text>
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  symbol: {
    fontSize: 10,
    marginRight: 4,
    fontWeight: '700',
  },
  label: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
});
