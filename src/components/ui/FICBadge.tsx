import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../theme';

export interface FICBadgeProps {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const FICBadge: React.FC<FICBadgeProps> = ({
  label,
  backgroundColor = theme.colors.divider,
  textColor = theme.colors.textSecondary,
  icon,
  style,
  textStyle,
}) => {
  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      {icon}
      <Text style={[styles.text, { color: textColor }, icon ? { marginLeft: 4 } : null, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
});
