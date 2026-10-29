import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DailyReport } from '../../../types';
import { theme } from '../../../theme';
import { FICCard } from '../../../components/ui/FICCard';

export interface ReportCardProps {
  report: DailyReport;
  onPress: (report: DailyReport) => void;
}

export const formatReportDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
};

export const ReportCard: React.FC<ReportCardProps> = ({ report, onPress }) => {
  const vendorCount = report.vendorsVisited ? report.vendorsVisited.length : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(report)}
      accessibilityRole="button"
      accessibilityLabel={`Report for ${formatReportDate(report.date)}`}
    >
      <FICCard style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Text style={styles.dateText}>{formatReportDate(report.date)}</Text>
            <Text style={styles.typeBadge}>Daily Report</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>

        <Text style={styles.workSummary} numberOfLines={2}>
          {report.workSummary}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.vendorChip}>
            <Text style={styles.vendorChipText}>
              🏢 {vendorCount} {vendorCount === 1 ? 'Vendor' : 'Vendors'} Visited
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Submitted ✓</Text>
          </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  titleGroup: {
    flex: 1,
  },
  dateText: {
    ...theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text,
  },
  typeBadge: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.textMuted,
    fontWeight: '600',
    lineHeight: 24,
  },
  workSummary: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginVertical: theme.spacing.xs,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  vendorChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.sm,
  },
  vendorChipText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.sm,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
  },
});
