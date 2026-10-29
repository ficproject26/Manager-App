import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { DailyReport } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';

import { services } from '../../services';

export interface SubordinateReportsScreenProps {
  onBack?: () => void;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

const MOCK_SUBORDINATE_REPORTS: DailyReport[] = [];

export const SubordinateReportsScreen: React.FC<SubordinateReportsScreenProps> = ({
  onBack,
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadSubordinateReports = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    try {
      // Fetch subordinate reports via repository
      const currentManager = manager?.id || 'mgr-000';
      let fetchedReports = await services.dailyReportRepository.getReports(currentManager, 'ALL', searchQuery);

      if (!fetchedReports || fetchedReports.length === 0) {
        // Territory-scoped fallback
        let scoped = MOCK_SUBORDINATE_REPORTS;
        if (currentManager === 'mgr-000') {
          scoped = scoped.filter(r => r.stateId === 'st-tn-01');
        } else if (currentManager === 'mgr-001') {
          scoped = scoped.filter(r => r.stateId === 'st-mp-01');
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          scoped = scoped.filter(
            r =>
              r.managerName?.toLowerCase().includes(q) ||
              r.workSummary.toLowerCase().includes(q) ||
              r.date.includes(q)
          );
        }
        fetchedReports = scoped;
      }

      setReports(fetchedReports);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [manager, searchQuery]);

  useEffect(() => {
    loadSubordinateReports();
  }, [loadSubordinateReports]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSubordinateReports(true);
  };

  const renderItem = ({ item }: { item: DailyReport }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => onNavigateRoute && onNavigateRoute('ReportDetail', { reportId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.authorCol}>
          <Text style={styles.authorName}>{item.managerName || 'Subordinate Manager'}</Text>
          <Text style={styles.dateText}>📅 {item.date}</Text>
        </View>
        <View style={styles.visitedPill}>
          <Icon name="storefront-outline" size={14} color="#1D4ED8" style={{ marginRight: 4 }} />
          <Text style={styles.visitedPillText}>
            {item.shopsVisitedCount || item.vendorsVisited?.length || 0} Shops Visited
          </Text>
        </View>
      </View>

      <Text style={styles.workSummary} numberOfLines={2}>
        {item.workSummary}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.mediaIndicators}>
          {item.voiceUrl ? (
            <View style={[styles.mediaBadge, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="microphone" size={14} color="#2563EB" />
              <Text style={[styles.mediaBadgeText, { color: '#2563EB' }]}>
                {item.voiceDurationSeconds ? `${item.voiceDurationSeconds}s Memo` : 'Voice'}
              </Text>
            </View>
          ) : null}

          {item.photo1Url || item.photo2Url ? (
            <View style={[styles.mediaBadge, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="camera-outline" size={14} color="#059669" />
              <Text style={[styles.mediaBadgeText, { color: '#059669' }]}>Photos</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.chevronRow}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Icon name="chevron-right" size={16} color="#1D4ED8" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />

      <FICHeader
        title="Subordinate Reports"
        subtitle={`Territory: ${manager?.territoryName || 'Scoped'}`}
        leftActionIcon={<Text style={styles.headerIcon}>{onBack ? '←' : '☰'}</Text>}
        onLeftAction={onBack || onOpenDrawer}
      />

      <View style={styles.searchContainer}>
        <FICTextInput
          placeholder="Search by manager name, date, or activity..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.scopeNotice}>
        <Icon name="shield-lock-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
        <Text style={styles.scopeNoticeText}>
          Displaying authorized reports strictly within your territory tree.
        </Text>
      </View>

      {isLoading && !isRefreshing ? (
        <FICLoadingState message="Loading territory subordinate reports..." />
      ) : reports.length === 0 ? (
        <FICEmptyState
          title="No Reports Found"
          message="No reports submitted by subordinates in your territory match the query."
          onActionPress={() => setSearchQuery('')}
          actionTitle="Clear Search"
        />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#1D4ED8']}
              tintColor="#1D4ED8"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerIcon: {
    fontSize: 22,
    color: '#0F172A',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    marginBottom: 8,
  },
  scopeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  scopeNoticeText: {
    fontSize: 12,
    color: '#166534',
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  authorCol: {
    flex: 1,
    marginRight: 8,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  visitedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  visitedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  workSummary: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  mediaIndicators: {
    flexDirection: 'row',
    gap: 6,
  },
  mediaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  mediaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    marginRight: 2,
  },
});
