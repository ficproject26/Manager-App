import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TouchableOpacityProps } from 'react-native';
import { theme } from '../../theme';

export interface FICIconButtonProps extends TouchableOpacityProps {
  icon: React.ReactNode;
  size?: number;
  style?: ViewStyle;
}

export const FICIconButton: React.FC<FICIconButtonProps> = ({
  icon,
  size = 44,
  style,
  onPress,
  disabled,
  ...rest
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.container,
        { width: Math.max(size, theme.spacing.touchTargetMin), height: Math.max(size, theme.spacing.touchTargetMin) },
        disabled && styles.disabled,
        style,
      ]}
      accessibilityRole="button"
      {...rest}
    >
      {icon}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.radius.full,
  },
  disabled: {
    opacity: 0.5,
  },
});
