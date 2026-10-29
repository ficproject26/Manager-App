import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

export interface VendorSummaryProps {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
}

export const VendorSummaryBar: React.FC<VendorSummaryProps> = ({
  totalCount,
  activeCount,
  inactiveCount,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.statBox}>
        <Text style={styles.statValue}>{totalCount}</Text>
        <Text style={styles.statLabel}>Total Vendors</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statBox}>
        <Text style={[styles.statValue, styles.activeValue]}>{activeCount}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statBox}>
        <Text style={[styles.statValue, styles.inactiveValue]}>{inactiveCount}</Text>
        <Text style={styles.statLabel}>Inactive</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    ...theme.elevation.card,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...theme.typography.headingMedium,
    color: theme.colors.primary,
  },
  activeValue: {
    color: theme.colors.success,
  },
  inactiveValue: {
    color: theme.colors.textSecondary,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.divider,
  },
});
