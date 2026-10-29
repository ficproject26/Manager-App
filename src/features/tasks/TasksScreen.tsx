import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { Priority, Task, TaskStatus } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';
import { FICDropdownModal } from '../../components/ui/FICDropdownModal';
import { socketService } from '../../services/realtime/SocketService';

export interface TasksScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export type TaskStatusFilter = 'ALL' | TaskStatus;

export const TasksScreen: React.FC<TasksScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatusFilter>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<'ALL' | Priority>('ALL');
  const [showPriorityModal, setShowPriorityModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      try {
        const managerId = manager?.id || 'mgr-001';
        const list = await services.taskRepository.getTasks(managerId);
        setAllTasks(list);
      } catch {
        setError('Unable to load tasks');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [manager]
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    const unsub1 = socketService.subscribe<Task>('task.status.updated', (payload) => {
      if (payload.data) {
        setAllTasks((prev) =>
          prev.map((t) => (t.id === payload.entityId ? { ...t, ...payload.data } : t))
        );
      }
    });
    const unsub2 = socketService.subscribe<Task>('task.updated', (payload) => {
      if (payload.data) {
        setAllTasks((prev) =>
          prev.map((t) => (t.id === payload.entityId ? { ...t, ...payload.data } : t))
        );
      }
    });
    const unsub3 = socketService.subscribe<Task>('task.created', (payload) => {
      if (payload.data) {
        const newTask = payload.data;
        setAllTasks((prev) => [newTask, ...prev.filter((t) => t.id !== payload.entityId)]);
      }
    });
    const unsubReconnect = socketService.onReconnect(() => {
      fetchTasks(true);
    });
    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsubReconnect();
    };
  }, [fetchTasks]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTasks(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedStatus('ALL');
    setSelectedPriority('ALL');
  };

  const handleTaskPress = (task: Task) => {
    if (onNavigateRoute) {
      onNavigateRoute('TaskDetail', { taskId: task.id });
    }
  };

  // Derive metric counts from all tasks
  const counts = useMemo(() => {
    const total = allTasks.length;
    const pending = allTasks.filter(
      t => t.status === TaskStatus.PENDING || t.status === TaskStatus.ASSIGNED
    ).length;
    const inProgress = allTasks.filter(
      t => t.status === TaskStatus.IN_PROGRESS || t.status === TaskStatus.ACCEPTED
    ).length;
    const completed = allTasks.filter(
      t => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.RESOLVED
    ).length;
    return { total, pending, inProgress, completed };
  }, [allTasks]);

  // Client-side filtering for search, status, and priority
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      // 1. Status Filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === TaskStatus.PENDING) {
          if (t.status !== TaskStatus.PENDING && t.status !== TaskStatus.ASSIGNED) return false;
        } else if (selectedStatus === TaskStatus.COMPLETED) {
          if (t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.RESOLVED) return false;
        } else if (selectedStatus === TaskStatus.IN_PROGRESS) {
          if (t.status !== TaskStatus.IN_PROGRESS && t.status !== TaskStatus.ACCEPTED) return false;
        } else {
          if (t.status !== selectedStatus) return false;
        }
      }

      // 2. Priority Filter
      if (selectedPriority !== 'ALL') {
        if (t.priority !== selectedPriority) return false;
      }

      // 3. Search Filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = t.title.toLowerCase().includes(query);
        const matchDesc = t.description?.toLowerCase().includes(query);
        const matchTerritory = t.territory?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchTerritory) return false;
      }

      return true;
    });
  }, [allTasks, selectedStatus, selectedPriority, searchQuery]);

  const statusChips: { id: TaskStatusFilter; label: string }[] = [
    { id: 'ALL', label: 'All' },
    { id: TaskStatus.PENDING, label: 'Pending' },
    { id: TaskStatus.IN_PROGRESS, label: 'In Progress' },
    { id: TaskStatus.BLOCKED, label: 'Blocked' },
    { id: TaskStatus.COMPLETED, label: 'Completed' },
  ];

  const priorityOptions = [
    { label: 'All Priorities', value: 'ALL' },
    { label: 'Critical Priority', value: Priority.CRITICAL },
    { label: 'High Priority', value: Priority.HIGH },
    { label: 'Medium Priority', value: Priority.MEDIUM },
    { label: 'Low Priority', value: Priority.LOW },
  ];

  const getPriorityAccentColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return '#EF4444';
      case Priority.HIGH:
        return '#F59E0B';
      case Priority.MEDIUM:
        return '#2563EB';
      case Priority.LOW:
      default:
        return '#64748B';
    }
  };

  const renderPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL:
        return (
          <View style={[styles.priorityPill, { backgroundColor: '#EF4444' }]}>
            <Icon name="alert-circle" size={13} color="#FFFFFF" />
            <Text style={styles.priorityPillText}>Critical</Text>
          </View>
        );
      case Priority.HIGH:
        return (
          <View style={[styles.priorityPill, { backgroundColor: '#F59E0B' }]}>
            <Icon name="arrow-up-circle" size={13} color="#FFFFFF" />
            <Text style={styles.priorityPillText}>High</Text>
          </View>
        );
      case Priority.MEDIUM:
        return (
          <View style={[styles.priorityPill, { backgroundColor: '#2563EB' }]}>
            <Icon name="circle" size={10} color="#FFFFFF" />
            <Text style={styles.priorityPillText}>Medium</Text>
          </View>
        );
      case Priority.LOW:
      default:
        return (
          <View style={[styles.priorityPill, { backgroundColor: '#64748B' }]}>
            <Icon name="arrow-down-circle" size={13} color="#FFFFFF" />
            <Text style={styles.priorityPillText}>Low</Text>
          </View>
        );
    }
  };

  const renderStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.PENDING:
      case TaskStatus.ASSIGNED:
        return (
          <View style={[styles.statusPill, { backgroundColor: '#FEF2F2' }]}>
            <Icon name="clock-outline" size={13} color="#EF4444" />
            <Text style={[styles.statusPillText, { color: '#DC2626' }]}>Pending</Text>
          </View>
        );
      case TaskStatus.IN_PROGRESS:
      case TaskStatus.ACCEPTED:
        return (
          <View style={[styles.statusPill, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="sync" size={13} color="#2563EB" />
            <Text style={[styles.statusPillText, { color: '#1D4ED8' }]}>In Progress</Text>
          </View>
        );
      case TaskStatus.COMPLETED:
      case TaskStatus.RESOLVED:
        return (
          <View style={[styles.statusPill, { backgroundColor: '#F0FDF4' }]}>
            <Icon name="check-circle" size={13} color="#16A34A" />
            <Text style={[styles.statusPillText, { color: '#15803D' }]}>Completed</Text>
          </View>
        );
      case TaskStatus.BLOCKED:
      case TaskStatus.REJECTED:
        return (
          <View style={[styles.statusPill, { backgroundColor: '#FFFBEB' }]}>
            <Icon name="alert-circle-outline" size={13} color="#D97706" />
            <Text style={[styles.statusPillText, { color: '#B45309' }]}>Blocked</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusPill, { backgroundColor: '#F1F5F9' }]}>
            <Text style={[styles.statusPillText, { color: '#475569' }]}>{status}</Text>
          </View>
        );
    }
  };

  const formatDueDisplay = (dueSla?: string, createdAt?: string) => {
    if (dueSla && dueSla.trim().length > 0) {
      if (dueSla.toLowerCase().startsWith('due') || dueSla.toLowerCase().includes('completed')) {
        return dueSla;
      }
      return `Due ${dueSla}`;
    }
    if (createdAt) {
      return `Created ${new Date(createdAt).toLocaleDateString()}`;
    }
    return 'Due Today • 5:00 PM';
  };

  const formatPriorityLabel = (pri: 'ALL' | Priority) => {
    if (pri === 'ALL') return 'All';
    return pri.charAt(0) + pri.slice(1).toLowerCase();
  };

  const renderTaskCard = ({ item }: { item: Task }) => {
    const accentColor = getPriorityAccentColor(item.priority);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleTaskPress(item)}
        style={[styles.taskCard, { borderLeftColor: accentColor }]}
        accessibilityRole="button"
        accessibilityLabel={`Task: ${item.title}`}
      >
        {/* Top Priority Badge & Chevron */}
        <View style={styles.cardHeaderRow}>
          {renderPriorityBadge(item.priority)}
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </View>

        {/* Task Title */}
        <Text style={styles.taskTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Bottom Details Row: Location & Due SLA on left, Status on right */}
        <View style={styles.cardBottomRow}>
          <View style={styles.cardMetaCol}>
            <View style={styles.metaRow}>
              <Icon name="map-marker-outline" size={15} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.territory || 'Assigned Territory'}
              </Text>
            </View>

            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <Icon name="calendar-blank-outline" size={15} color="#64748B" />
              <Text style={styles.metaText} numberOfLines={1}>
                {formatDueDisplay(item.dueSla, item.createdAt)}
              </Text>
            </View>
          </View>

          <View style={styles.statusCol}>
            {renderStatusBadge(item.status)}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && !isRefreshing) {
    return <FICLoadingState message="Loading field tasks..." />;
  }

  if (error) {
    return (
      <FICErrorState
        title="Unable to load tasks"
        message={error}
        onRetry={() => fetchTasks()}
      />
    );
  }

  const isFiltered = searchQuery.trim().length > 0 || selectedStatus !== 'ALL' || selectedPriority !== 'ALL';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Tasks"
        leftActionIcon={<Icon name="menu" size={24} color="#FFFFFF" />}
        onLeftAction={onOpenDrawer}
        rightActionIcon={
          <View style={styles.notificationWrapper}>
            <Icon name="bell-outline" size={22} color="#FFFFFF" />
            <View style={styles.notificationBadgeDot} />
          </View>
        }
        onRightAction={() => onNavigateRoute && onNavigateRoute('Notifications')}
      />

      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={renderTaskCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerSection}>
            {/* Page Title & Subtitle */}
            <View style={styles.titleContainer}>
              <Text style={styles.pageTitle}>Tasks</Text>
              <Text style={styles.pageSubtitle}>Track and complete your assigned tasks</Text>
            </View>

            {/* 4-Metric Summary Cards Grid */}
            <View style={styles.metricsContainer}>
              {/* Total Card */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: '#F0F9FF', borderColor: selectedStatus === 'ALL' ? '#0284C7' : '#BAE6FD' },
                  selectedStatus === 'ALL' && styles.metricCardActive,
                ]}
                onPress={() => setSelectedStatus('ALL')}
                activeOpacity={0.7}
              >
                <View style={styles.metricTopRow}>
                  <Text style={[styles.metricCount, { color: '#0284C7' }]}>{counts.total}</Text>
                  <Icon name="clipboard-text-outline" size={17} color="#0284C7" />
                </View>
                <Text style={[styles.metricLabel, { color: '#0284C7' }]}>Total</Text>
              </TouchableOpacity>

              {/* Pending Card */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: '#FEF3C7',
                    borderColor: selectedStatus === TaskStatus.PENDING ? '#D97706' : '#FDE68A',
                  },
                  selectedStatus === TaskStatus.PENDING && styles.metricCardActive,
                ]}
                onPress={() =>
                  setSelectedStatus(selectedStatus === TaskStatus.PENDING ? 'ALL' : TaskStatus.PENDING)
                }
                activeOpacity={0.7}
              >
                <View style={styles.metricTopRow}>
                  <Text style={[styles.metricCount, { color: '#D97706' }]}>{counts.pending}</Text>
                  <Icon name="clock-outline" size={17} color="#D97706" />
                </View>
                <Text style={[styles.metricLabel, { color: '#D97706' }]}>Pending</Text>
              </TouchableOpacity>

              {/* In Progress Card */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: '#EFF6FF',
                    borderColor: selectedStatus === TaskStatus.IN_PROGRESS ? '#2563EB' : '#BFDBFE',
                  },
                  selectedStatus === TaskStatus.IN_PROGRESS && styles.metricCardActive,
                ]}
                onPress={() =>
                  setSelectedStatus(selectedStatus === TaskStatus.IN_PROGRESS ? 'ALL' : TaskStatus.IN_PROGRESS)
                }
                activeOpacity={0.7}
              >
                <View style={styles.metricTopRow}>
                  <Text style={[styles.metricCount, { color: '#2563EB' }]}>{counts.inProgress}</Text>
                  <Icon name="sync" size={17} color="#2563EB" />
                </View>
                <Text style={[styles.metricLabel, { color: '#2563EB' }]}>In Progress</Text>
              </TouchableOpacity>

              {/* Completed Card */}
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: '#DCFCE7',
                    borderColor: selectedStatus === TaskStatus.COMPLETED ? '#16A34A' : '#BBF7D0',
                  },
                  selectedStatus === TaskStatus.COMPLETED && styles.metricCardActive,
                ]}
                onPress={() =>
                  setSelectedStatus(selectedStatus === TaskStatus.COMPLETED ? 'ALL' : TaskStatus.COMPLETED)
                }
                activeOpacity={0.7}
              >
                <View style={styles.metricTopRow}>
                  <Text style={[styles.metricCount, { color: '#16A34A' }]}>{counts.completed}</Text>
                  <Icon name="check-circle" size={17} color="#16A34A" />
                </View>
                <Text style={[styles.metricLabel, { color: '#16A34A' }]}>Completed</Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter Chips Row */}
            <View style={styles.chipsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {statusChips.map(chip => {
                  const isSelected = selectedStatus === chip.id;
                  return (
                    <TouchableOpacity
                      key={chip.id}
                      style={[styles.statusChip, isSelected && styles.statusChipActive]}
                      onPress={() => setSelectedStatus(chip.id)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Search Input & Priority Filter Row */}
            <View style={styles.searchFilterRow}>
              <View style={styles.searchBox}>
                <Icon name="magnify" size={18} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search tasks..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.clearSearchBtn}
                  >
                    <Icon name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.priorityFilterBtn, selectedPriority !== 'ALL' && styles.priorityFilterBtnActive]}
                onPress={() => setShowPriorityModal(true)}
                activeOpacity={0.75}
              >
                <Icon
                  name="tune-variant"
                  size={15}
                  color={selectedPriority !== 'ALL' ? theme.colors.primary : '#334155'}
                />
                <Text
                  style={[
                    styles.priorityBtnText,
                    selectedPriority !== 'ALL' && { color: theme.colors.primary, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  Priority: {formatPriorityLabel(selectedPriority)}
                </Text>
                <Icon
                  name="chevron-down"
                  size={15}
                  color={selectedPriority !== 'ALL' ? theme.colors.primary : '#64748B'}
                />
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FICEmptyState
              title={isFiltered ? 'No matching tasks' : 'No tasks assigned'}
              description={
                isFiltered
                  ? 'No tasks match your active status, priority, or search criteria.'
                  : 'You are all caught up! You have no pending tasks assigned at this moment.'
              }
              actionTitle={isFiltered ? 'Clear Filters' : undefined}
              onAction={isFiltered ? handleClearFilters : undefined}
            />
          </View>
        }
      />

      {/* Priority Selection Modal */}
      <FICDropdownModal
        visible={showPriorityModal}
        title="Filter by Priority"
        options={priorityOptions}
        selectedValue={selectedPriority}
        onSelect={val => {
          setSelectedPriority(val as any);
          setShowPriorityModal(false);
        }}
        onClose={() => setShowPriorityModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  notificationWrapper: {
    position: 'relative',
    padding: 4,
  },
  notificationBadgeDot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  listContent: {
    paddingBottom: 40,
    flexGrow: 1,
  },
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  titleContainer: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13.5,
    color: '#64748B',
    marginTop: 3,
    fontWeight: '400',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    minHeight: 62,
  },
  metricCardActive: {
    borderWidth: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  chipsSection: {
    marginBottom: 14,
  },
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusChipActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 42,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  priorityFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 6,
  },
  priorityFilterBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#EFF6FF',
  },
  priorityBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 4.5,
    padding: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priorityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 16,
    gap: 4,
  },
  priorityPillText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 21,
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardMetaCol: {
    flex: 1,
    marginRight: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  statusCol: {
    justifyContent: 'flex-end',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 5,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingTop: 40,
    paddingHorizontal: 20,
  },
});
