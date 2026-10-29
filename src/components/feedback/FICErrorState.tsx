import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { FICButton } from '../ui/FICButton';

export interface FICErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const FICErrorState: React.FC<FICErrorStateProps> = ({
  title = 'Service Unavailable',
  message = 'Failed to load data. Please check your network connection and try again.',
  onRetry,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.iconPlaceholder}>⚠</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <FICButton title="Retry Request" onPress={onRetry} variant="outline" size="sm" style={styles.button} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.errorLight,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
    marginVertical: theme.spacing.md,
  },
  iconPlaceholder: {
    fontSize: 28,
    color: theme.colors.error,
    marginBottom: theme.spacing.xs,
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.error,
    textAlign: 'center',
  },
  message: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    textAlign: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  button: {
    borderColor: theme.colors.error,
  },
});
