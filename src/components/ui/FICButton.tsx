import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { theme } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'text';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface FICButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const FICButton: React.FC<FICButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  onPress,
  ...rest
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const isInteractive = !disabled && !loading;

  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = { ...styles.container };

    if (size === 'sm') base = { ...base, ...styles.sizeSm };
    if (size === 'lg') base = { ...base, ...styles.sizeLg };

    switch (variant) {
      case 'primary':
        base = {
          ...base,
          backgroundColor: isPressed ? theme.colors.primaryPressed : theme.colors.primary,
        };
        break;
      case 'secondary':
        base = {
          ...base,
          backgroundColor: isPressed ? theme.colors.secondaryPressed : theme.colors.secondary,
        };
        break;
      case 'outline':
        base = {
          ...base,
          backgroundColor: isPressed ? theme.colors.surfaceSecondary : 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        };
        break;
      case 'destructive':
        base = {
          ...base,
          backgroundColor: isPressed ? '#B91C1C' : theme.colors.error,
        };
        break;
      case 'text':
        base = {
          ...base,
          backgroundColor: isPressed ? theme.colors.surfaceSecondary : 'transparent',
        };
        break;
    }

    if (disabled) {
      base = { ...base, backgroundColor: theme.colors.disabled, opacity: 0.6, borderColor: 'transparent' };
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    let base: TextStyle = { ...styles.text };

    if (size === 'sm') base = { ...base, ...styles.textSm };
    if (size === 'lg') base = { ...base, ...styles.textLg };

    switch (variant) {
      case 'primary':
      case 'destructive':
        base = { ...base, color: theme.colors.surface };
        break;
      case 'secondary':
        base = { ...base, color: theme.colors.text };
        break;
      case 'outline':
      case 'text':
        base = { ...base, color: theme.colors.primary };
        break;
    }

    if (disabled) {
      base = { ...base, color: theme.colors.surface };
    }

    return base;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={!isInteractive}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      style={[getContainerStyle(), style]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? theme.colors.surface : theme.colors.primary}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={[getTextStyle(), textStyle, leftIcon ? styles.hasLeftIcon : null, rightIcon ? styles.hasRightIcon : null]}>
            {title}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: theme.spacing.touchTargetMin,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: {
    minHeight: 38,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  sizeLg: {
    minHeight: 54,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  text: {
    ...theme.typography.label,
    textAlign: 'center',
  },
  textSm: {
    fontSize: 13,
  },
  textLg: {
    fontSize: 16,
  },
  hasLeftIcon: {
    marginLeft: theme.spacing.xs,
  },
  hasRightIcon: {
    marginRight: theme.spacing.xs,
  },
});
