import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Issue } from '../../../types';
import { theme } from '../../../theme';
import { FICCard } from '../../../components/ui/FICCard';
import { FICStatusBadge } from '../../../components/ui/FICStatusBadge';
import { FICPriorityBadge } from '../../../components/ui/FICPriorityBadge';

export interface IssueCardProps {
  issue: Issue;
  onPress: (issue: Issue) => void;
}

export const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return isoString;
  }
};

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onPress }) => {
  const subtitleParts = [];
  if (issue.vendorName) subtitleParts.push(issue.vendorName);
  if (issue.location) subtitleParts.push(issue.location);
  const subtitleText = subtitleParts.join(' • ');

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(issue)}
      accessibilityRole="button"
      accessibilityLabel={`Issue: ${issue.title}, Status: ${issue.status}`}
    >
      <FICCard style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {issue.title}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </View>

        {subtitleText ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitleText}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.dateText}>{formatDate(issue.createdAt)}</Text>
          <View style={styles.badgeGroup}>
            <FICPriorityBadge priority={issue.priority} />
            <FICStatusBadge status={issue.status} showIcon={true} />
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
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    ...theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  chevron: {
    fontSize: 22,
    color: theme.colors.textMuted,
    fontWeight: '600',
    lineHeight: 24,
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  dateText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
