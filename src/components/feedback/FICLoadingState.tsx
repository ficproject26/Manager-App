import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../theme';

export interface FICLoadingStateProps {
  message?: string;
  style?: ViewStyle;
}

export const FICLoadingState: React.FC<FICLoadingStateProps> = ({
  message = 'Loading details...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});
