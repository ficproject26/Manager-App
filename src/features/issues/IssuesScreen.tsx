import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { Issue, IssueStatus } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';
import { IssueCard } from './components/IssueCard';
import { socketService } from '../../services/realtime/SocketService';

export interface IssuesScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export type StatusFilterOption = 'ALL' | IssueStatus.OPEN | IssueStatus.IN_PROGRESS | IssueStatus.RESOLVED;

export const IssuesScreen: React.FC<IssuesScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<StatusFilterOption>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      try {
        const managerId = manager?.id || 'mgr-001';
        const filterStatus = selectedFilter !== 'ALL' ? (selectedFilter as IssueStatus) : undefined;
        const fetchedList = await services.issueRepository.getIssues(
          managerId,
          filterStatus,
          undefined,
          searchQuery.trim()
        );
        setIssues(fetchedList);
      } catch (err) {
        setError('Unable to load issues');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [manager, selectedFilter, searchQuery]
  );

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  useEffect(() => {
    const unsub1 = socketService.subscribe<Issue>('issue.status.updated', (payload) => {
      if (payload.data) {
        setIssues((prev) =>
          prev.map((i) => (i.id === payload.entityId ? { ...i, ...payload.data } : i))
        );
      }
    });
    const unsub2 = socketService.subscribe<Issue>('issue.resolved', (payload) => {
      if (payload.data) {
        setIssues((prev) =>
          prev.map((i) => (i.id === payload.entityId ? { ...i, ...payload.data } : i))
        );
      }
    });
    const unsub3 = socketService.subscribe<Issue>('issue.updated', (payload) => {
      if (payload.data) {
        setIssues((prev) =>
          prev.map((i) => (i.id === payload.entityId ? { ...i, ...payload.data } : i))
        );
      }
    });
    const unsubReconnect = socketService.onReconnect(() => {
      fetchIssues(true);
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsubReconnect();
    };
  }, [fetchIssues]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchIssues(true);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedFilter('ALL');
  };

  const handleIssuePress = (issue: Issue) => {
    if (onNavigateRoute) {
      onNavigateRoute('IssueDetail', { issueId: issue.id });
    }
  };

  const filterChips: { id: StatusFilterOption; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: IssueStatus.OPEN, label: 'Open' },
    { id: IssueStatus.IN_PROGRESS, label: 'In Progress' },
    { id: IssueStatus.RESOLVED, label: 'Resolved' },
  ];

  if (isLoading && !isRefreshing) {
    return <FICLoadingState message="Loading reported issues..." />;
  }

  if (error) {
    return (
      <FICErrorState
        title="Unable to load issues"
        message={error}
        onRetry={() => fetchIssues()}
      />
    );
  }

  const isFiltered = searchQuery.trim().length > 0 || selectedFilter !== 'ALL';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Issues"
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
      />

      <View style={styles.container}>
        {/* Subtitle & Search Bar Header Section */}
        <View style={styles.topSection}>
          <Text style={styles.subtitleText}>Track and manage reported issues</Text>
          
          <FICTextInput
            placeholder="Search issues..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Text style={styles.searchIcon}>🔍</Text>}
            rightIcon={
              searchQuery.length > 0 ? (
                <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              ) : undefined
            }
            containerStyle={styles.searchInputWrapper}
          />
        </View>

        {/* Status Filter Chips Control */}
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {filterChips.map(chip => {
              const isSelected = selectedFilter === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedFilter(chip.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Issue Cards FlatList */}
        <FlatList
          data={issues}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <IssueCard issue={item} onPress={handleIssuePress} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <FICEmptyState
              title={isFiltered ? 'No Issues Match' : 'No Issues Found'}
              description={
                isFiltered
                  ? 'No issues match your search or filter'
                  : 'There are currently no reported issues in your assigned territory.'
              }
              actionTitle={isFiltered ? 'Clear Filters' : undefined}
              onAction={isFiltered ? handleClearFilters : undefined}
            />
          }
        />
      </View>
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
  topSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  subtitleText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  searchInputWrapper: {
    marginBottom: theme.spacing.xxs,
  },
  searchIcon: {
    fontSize: 16,
  },
  clearIcon: {
    fontSize: 16,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  filterBar: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  listContent: {
    padding: theme.spacing.md,
    flexGrow: 1,
  },
});
