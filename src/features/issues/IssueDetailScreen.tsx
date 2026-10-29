import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { services } from '../../services';
import { Issue, IssueStatus } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICButton } from '../../components/ui/FICButton';
import { FICStatusBadge } from '../../components/ui/FICStatusBadge';
import { FICPriorityBadge } from '../../components/ui/FICPriorityBadge';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FieldActionButtons } from '../../components/ui/FieldActionButtons';
import { socketService } from '../../services/realtime/SocketService';
import { formatDate } from './components/IssueCard';

export interface IssueDetailScreenProps {
  issueId?: string;
  onBack?: () => void;
  onOpenDrawer?: () => void;
}

export const IssueDetailScreen: React.FC<IssueDetailScreenProps> = ({
  issueId,
  onBack,
  onOpenDrawer,
}) => {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssueDetail = useCallback(async () => {
    if (!issueId) {
      setError('Issue ID is missing');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.issueRepository.getIssueById(issueId);
      if (!data) {
        setError('Issue not found');
      } else {
        setIssue(data);
      }
    } catch (err) {
      setError('Unable to load issue details');
    } finally {
      setIsLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchIssueDetail();
  }, [fetchIssueDetail]);

  useEffect(() => {
    const unsub1 = socketService.subscribe<Issue>('issue.status.updated', (payload) => {
      if (issue && payload.entityId === issue.id && payload.data) {
        setIssue((prev) => (prev ? ({ ...prev, ...payload.data } as Issue) : (payload.data || null)));
      }
    });
    const unsub2 = socketService.subscribe<Issue>('issue.resolved', (payload) => {
      if (issue && payload.entityId === issue.id && payload.data) {
        setIssue((prev) => (prev ? ({ ...prev, ...payload.data } as Issue) : (payload.data || null)));
      }
    });
    const unsub3 = socketService.subscribe<Issue>('issue.updated', (payload) => {
      if (issue && payload.entityId === issue.id && payload.data) {
        setIssue((prev) => (prev ? ({ ...prev, ...payload.data } as Issue) : (payload.data || null)));
      }
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [issue]);

  const handleUpdateStatus = async (newStatus: IssueStatus) => {
    if (!issue) return;
    setIsUpdating(true);
    try {
      const updated = await services.issueRepository.updateIssueStatus(
        issue.id,
        newStatus,
        newStatus === IssueStatus.RESOLVED ? 'Marked resolved by field manager.' : undefined
      );
      setIssue(updated);
    } catch (err) {
      Alert.alert('Status Update Failed', 'Unable to update issue status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <FICLoadingState message="Loading issue details..." />;
  }

  if (error || !issue) {
    return (
      <FICErrorState
        title="Unable to load issue"
        message={error || 'Issue details could not be found.'}
        onRetry={fetchIssueDetail}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Issue Details"
        leftActionIcon={<Text style={styles.headerIcon}>←</Text>}
        onLeftAction={onBack}
        rightActionIcon={onOpenDrawer ? <Text style={styles.headerIcon}>☰</Text> : undefined}
        onRightAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Title Card */}
        <FICCard style={styles.card}>
          <Text style={styles.title}>{issue.title}</Text>
          <View style={styles.badgeRow}>
            <FICPriorityBadge priority={issue.priority} />
            <FICStatusBadge status={issue.status} showIcon={true} />
          </View>
        </FICCard>

        {/* Issue Details Breakdown */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionTitle}>Overview</Text>

          {issue.vendorName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Vendor:</Text>
              <Text style={styles.infoValue}>{issue.vendorName}</Text>
            </View>
          ) : null}

          {issue.location ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{issue.location}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created Date:</Text>
            <Text style={styles.infoValue}>{formatDate(issue.createdAt)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Manager:</Text>
            <Text style={styles.infoValue}>{issue.assignedManagerId}</Text>
          </View>

          {issue.contactName ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Person:</Text>
              <Text style={styles.infoValue}>{issue.contactName}</Text>
            </View>
          ) : null}

          {issue.contactPhone ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{issue.contactPhone}</Text>
            </View>
          ) : null}

          {issue.resolvedAt ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Resolved Date:</Text>
              <Text style={styles.infoValue}>{formatDate(issue.resolvedAt)}</Text>
            </View>
          ) : null}

          <FieldActionButtons
            phoneNumber={issue.contactPhone}
            latitude={issue.latitude}
            longitude={issue.longitude}
            titleOrLabel={issue.contactName || issue.vendorName || issue.title}
            address={issue.address || issue.location}
            style={{ marginTop: 12 }}
          />
        </FICCard>

        {/* Description Section */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{issue.description}</Text>
        </FICCard>

        {/* Resolution Text Card (If Resolved) */}
        {issue.status === IssueStatus.RESOLVED && issue.resolutionText ? (
          <FICCard style={[styles.card, styles.resolvedCard]}>
            <Text style={styles.resolvedTitle}>Resolution Notes</Text>
            <Text style={styles.resolvedText}>{issue.resolutionText}</Text>
          </FICCard>
        ) : null}

        {/* Issue Actions (Supported Transitions) */}
        {issue.status === IssueStatus.OPEN ? (
          <View style={styles.actionsContainer}>
            <FICButton
              title="Mark In Progress"
              variant="secondary"
              loading={isUpdating}
              onPress={() => handleUpdateStatus(IssueStatus.IN_PROGRESS)}
              style={styles.actionBtn}
            />
            <FICButton
              title="Mark Resolved"
              variant="primary"
              loading={isUpdating}
              onPress={() => handleUpdateStatus(IssueStatus.RESOLVED)}
              style={styles.actionBtn}
            />
          </View>
        ) : issue.status === IssueStatus.IN_PROGRESS ? (
          <View style={styles.actionsContainer}>
            <FICButton
              title="Mark Resolved"
              variant="primary"
              loading={isUpdating}
              onPress={() => handleUpdateStatus(IssueStatus.RESOLVED)}
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerIcon: {
    fontSize: 20,
    color: theme.colors.surface,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  title: {
    ...theme.typography.headingLarge,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    ...theme.typography.headingMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  infoLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    fontWeight: '600',
  },
  descriptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  resolvedCard: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.success,
    borderLeftWidth: 4,
  },
  resolvedTitle: {
    ...theme.typography.title,
    color: theme.colors.success,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  resolvedText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  actionsContainer: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  actionBtn: {
    width: '100%',
  },
});
