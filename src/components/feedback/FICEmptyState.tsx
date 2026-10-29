import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { FICButton } from '../ui/FICButton';

export interface FICEmptyStateProps {
  title?: string;
  description?: string;
  message?: string;
  actionTitle?: string;
  onAction?: () => void;
  onActionPress?: () => void;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export const FICEmptyState: React.FC<FICEmptyStateProps> = ({
  title = 'No Records Found',
  description,
  message,
  actionTitle,
  onAction,
  onActionPress,
  style,
  icon,
}) => {
  const descText = message || description || 'There are no items matching your filter or assigned scope.';
  const actionHandler = onActionPress || onAction;

  return (
    <View style={[styles.container, style]}>
      {icon}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{descText}</Text>
      {actionTitle && actionHandler && (
        <FICButton title={actionTitle} onPress={actionHandler} style={styles.button} size="sm" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  button: {
    marginTop: theme.spacing.xs,
  },
});
