import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { services } from '../../services';
import { DailyReport } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { formatReportDate } from './components/ReportCard';
import { googleMapsLocationService } from '../../services/maps';

export interface ReportDetailScreenProps {
  reportId?: string;
  onBack?: () => void;
  onOpenDrawer?: () => void;
}

export const ReportDetailScreen: React.FC<ReportDetailScreenProps> = ({
  reportId,
  onBack,
  onOpenDrawer,
}) => {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReportDetail = useCallback(async () => {
    if (!reportId) {
      setError('Report ID is missing');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.dailyReportRepository.getReportById(reportId);
      if (!data) {
        setError('Report not found');
      } else {
        setReport(data);
      }
    } catch (err) {
      setError('Unable to load report details');
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReportDetail();
  }, [fetchReportDetail]);

  if (isLoading) {
    return <FICLoadingState message="Loading report details..." />;
  }

  if (error || !report) {
    return (
      <FICErrorState
        title="Unable to load report"
        message={error || 'Report details could not be found.'}
        onRetry={fetchReportDetail}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Report Details"
        leftActionIcon={<Text style={styles.headerIcon}>←</Text>}
        onLeftAction={onBack}
        rightActionIcon={onOpenDrawer ? <Text style={styles.headerIcon}>☰</Text> : undefined}
        onRightAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Summary Card */}
        <FICCard style={styles.card}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.dateTitle}>{formatReportDate(report.date)}</Text>
              <Text style={styles.subtext}>Daily Work Report</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Submitted ✓</Text>
            </View>
          </View>
        </FICCard>

        {/* Section 1: Today's Work */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionTitle}>Today's Work Summary</Text>
          <Text style={styles.bodyText}>{report.workSummary}</Text>
        </FICCard>

        {/* Section: Voice Memo Audio Playback */}
        {report.voiceUrl ? (
          <FICCard style={styles.card}>
            <Text style={styles.sectionTitle}>Voice Memo Attachment</Text>
            <View style={styles.audioPlayerBox}>
              <View style={styles.playIconCircle}>
                <Text style={{ fontSize: 18, color: '#FFFFFF' }}>▶</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.audioTitle}>Voice Recording ({report.voiceDurationSeconds || 30}s)</Text>
                <Text style={styles.audioFormat}>Format: .m4a / AAC Audio Stream</Text>
              </View>
            </View>
          </FICCard>
        ) : null}

        {/* Section: Attached Storefront Photos */}
        {report.photo1Url || report.photo2Url ? (
          <FICCard style={styles.card}>
            <Text style={styles.sectionTitle}>Storefront Photos</Text>
            <View style={styles.photoAttachmentsRow}>
              {report.photo1Url && (
                <View style={styles.photoCard}>
                  <Text style={styles.photoCardTitle}>📷 Storefront 1</Text>
                  <Text style={styles.photoCardSub}>Verified Location</Text>
                </View>
              )}
              {report.photo2Url && (
                <View style={styles.photoCard}>
                  <Text style={styles.photoCardTitle}>📷 Storefront 2</Text>
                  <Text style={styles.photoCardSub}>Verified Signboard</Text>
                </View>
              )}
            </View>
          </FICCard>
        ) : null}

        {/* Section 2: Vendors Visited */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionTitle}>
            Vendors Visited ({report.shopsVisitedCount || (report.vendorsVisited ? report.vendorsVisited.length : 0)})
          </Text>
          {!report.vendorsVisited || report.vendorsVisited.length === 0 ? (
            <Text style={styles.emptySubtext}>No specific merchants were tagged for this day.</Text>
          ) : (
            <View style={styles.vendorList}>
              {report.vendorsVisited.map(v => (
                <View key={v.vendorId} style={styles.vendorCard}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.vendorName}>{v.vendorName}</Text>
                    {v.location ? (
                      <Text style={styles.vendorLoc} numberOfLines={1}>
                        📍 {v.location}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.vendorNavigateBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      googleMapsLocationService.openNavigation(
                        v.latitude,
                        v.longitude,
                        v.vendorName,
                        v.location
                      );
                    }}
                  >
                    <Icon name="google-maps" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.vendorNavigateBtnText}>Navigate</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </FICCard>

        {/* Section 3: Issues / Follow-ups */}
        {report.issuesFollowUp ? (
          <FICCard style={styles.card}>
            <Text style={styles.sectionTitle}>Issues / Follow-ups</Text>
            <Text style={styles.bodyText}>{report.issuesFollowUp}</Text>
          </FICCard>
        ) : null}

        {/* Section 4: Additional Notes */}
        {report.additionalNotes ? (
          <FICCard style={styles.card}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.bodyText}>{report.additionalNotes}</Text>
          </FICCard>
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
    paddingBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTitle: {
    ...theme.typography.headingMedium,
    color: theme.colors.primary,
  },
  subtext: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  bodyText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  emptySubtext: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  vendorList: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  vendorCard: {
    backgroundColor: theme.colors.surfaceSecondary,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vendorName: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.text,
  },
  vendorLoc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  vendorNavigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  vendorNavigateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  audioPlayerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  playIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  audioFormat: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  photoAttachmentsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  photoCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
