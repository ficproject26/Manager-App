import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { LeaderboardEntry, ManagerRole } from '../../types';
import { LeaderboardPeriod } from '../../services/repositories/ILeaderboardRepository';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICAvatar } from '../../components/ui/FICAvatar';
import { FICCard } from '../../components/ui/FICCard';
import { FICDropdownModal } from '../../components/ui/FICDropdownModal';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';

export interface LeaderboardScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string) => void;
}

const PERIOD_OPTIONS: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'Today', value: 'TODAY' },
  { label: 'This Week', value: 'THIS_WEEK' },
  { label: 'This Month', value: 'THIS_MONTH' },
];

const STATE_OPTIONS = [
  { label: 'All States', value: 'ALL' },
  { label: 'Tamil Nadu', value: 'st-tn-01' },
];

const DISTRICT_OPTIONS = [
  { label: 'All Districts', value: 'ALL' },
  { label: 'Chennai', value: 'dt-chn-01' },
  { label: 'Coimbatore', value: 'dt-cbe-01' },
  { label: 'Madurai', value: 'dt-mdu-01' },
  { label: 'Tiruchirappalli', value: 'dt-try-01' },
  { label: 'Salem', value: 'dt-slm-01' },
  { label: 'Tirunelveli', value: 'dt-tnv-01' },
  { label: 'Vellore', value: 'dt-vel-01' },
  { label: 'Erode', value: 'dt-erd-01' },
];

const DIVISION_OPTIONS_MAP: Record<string, { label: string; value: string }[]> = {
  ALL: [
    { label: 'All Divisions', value: 'ALL' },
    { label: 'Chennai Central', value: 'div-chn-central' },
    { label: 'Anna Nagar', value: 'div-chn-anna' },
    { label: 'Gandhipuram', value: 'div-cbe-gandhi' },
    { label: 'R.S. Puram', value: 'div-cbe-rspuram' },
    { label: 'Madurai Central', value: 'div-mdu-central' },
    { label: 'Anna Nagar (Madurai)', value: 'div-mdu-anna' },
    { label: 'Thillai Nagar', value: 'div-try-thillai' },
    { label: 'Srirangam', value: 'div-try-srirangam' },
    { label: 'Suramangalam', value: 'div-slm-sura' },
    { label: 'Fairlands', value: 'div-slm-fair' },
  ],
  'dt-chn-01': [
    { label: 'All Divisions in Chennai', value: 'ALL' },
    { label: 'Chennai Central', value: 'div-chn-central' },
    { label: 'Anna Nagar', value: 'div-chn-anna' },
  ],
  'dt-cbe-01': [
    { label: 'All Divisions in Coimbatore', value: 'ALL' },
    { label: 'Gandhipuram', value: 'div-cbe-gandhi' },
    { label: 'R.S. Puram', value: 'div-cbe-rspuram' },
  ],
  'dt-mdu-01': [
    { label: 'All Divisions in Madurai', value: 'ALL' },
    { label: 'Madurai Central', value: 'div-mdu-central' },
    { label: 'Anna Nagar (Madurai)', value: 'div-mdu-anna' },
  ],
  'dt-try-01': [
    { label: 'All Divisions in Trichy', value: 'ALL' },
    { label: 'Thillai Nagar', value: 'div-try-thillai' },
    { label: 'Srirangam', value: 'div-try-srirangam' },
  ],
  'dt-slm-01': [
    { label: 'All Divisions in Salem', value: 'ALL' },
    { label: 'Suramangalam', value: 'div-slm-sura' },
    { label: 'Fairlands', value: 'div-slm-fair' },
  ],
};

const PINCODE_OPTIONS = [
  { label: 'All Pincodes', value: 'ALL' },
  { label: '600001 - Parrys, Chennai', value: '600001' },
  { label: '600040 - Anna Nagar, Chennai', value: '600040' },
  { label: '641012 - Gandhipuram, Coimbatore', value: '641012' },
  { label: '641002 - R.S. Puram, Coimbatore', value: '641002' },
  { label: '625001 - Madurai Main', value: '625001' },
  { label: '620018 - Thillai Nagar, Trichy', value: '620018' },
  { label: '636005 - Suramangalam, Salem', value: '636005' },
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({
  onOpenDrawer,
}) => {
  const { manager } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('THIS_MONTH');
  const [rawEntries, setRawEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Hierarchy Filter Modal states (draft before apply)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [draftState, setDraftState] = useState<string>('ALL');
  const [draftDistrict, setDraftDistrict] = useState<string>('ALL');
  const [draftDivision, setDraftDivision] = useState<string>('ALL');
  const [draftPincode, setDraftPincode] = useState<string>('ALL');
  const [draftPincodeInput, setDraftPincodeInput] = useState<string>('');

  // Applied filter states
  const [appliedState, setAppliedState] = useState<string>('ALL');
  const [appliedDistrict, setAppliedDistrict] = useState<string>('ALL');
  const [appliedDivision, setAppliedDivision] = useState<string>('ALL');
  const [appliedPincode, setAppliedPincode] = useState<string>('ALL');

  // Picker dropdown modals
  const [showStatePicker, setShowStatePicker] = useState<boolean>(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState<boolean>(false);
  const [showDivisionPicker, setShowDivisionPicker] = useState<boolean>(false);
  const [showPincodePicker, setShowPincodePicker] = useState<boolean>(false);

  const loadLeaderboardData = useCallback(
    async (period: LeaderboardPeriod, isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      try {
        const managerId = manager?.id || 'mgr-000';
        const res = await services.leaderboardRepository.getLeaderboard(managerId, period);
        setRawEntries(res.entries || []);
      } catch {
        setError('Unable to load leaderboard standings');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [manager],
  );

  useEffect(() => {
    loadLeaderboardData(selectedPeriod);
  }, [selectedPeriod, loadLeaderboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadLeaderboardData(selectedPeriod, true);
  };

  const handlePeriodChange = (period: LeaderboardPeriod) => {
    if (period !== selectedPeriod) {
      setSelectedPeriod(period);
    }
  };

  // Open Filter Modal & sync draft states
  const handleOpenFilterModal = () => {
    setDraftState(appliedState);
    setDraftDistrict(appliedDistrict);
    setDraftDivision(appliedDivision);
    setDraftPincode(appliedPincode);
    setDraftPincodeInput(appliedPincode !== 'ALL' ? appliedPincode : '');
    setIsFilterModalOpen(true);
  };

  const handleApplyFilters = () => {
    setAppliedState(draftState);
    setAppliedDistrict(draftDistrict);
    setAppliedDivision(draftDivision);
    const finalPin = draftPincodeInput.trim() ? draftPincodeInput.trim() : draftPincode;
    setAppliedPincode(finalPin);
    setIsFilterModalOpen(false);
  };

  const handleResetFilters = () => {
    setDraftState('ALL');
    setDraftDistrict('ALL');
    setDraftDivision('ALL');
    setDraftPincode('ALL');
    setDraftPincodeInput('');
    setAppliedState('ALL');
    setAppliedDistrict('ALL');
    setAppliedDivision('ALL');
    setAppliedPincode('ALL');
    setIsFilterModalOpen(false);
  };

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (appliedState !== 'ALL') count++;
    if (appliedDistrict !== 'ALL') count++;
    if (appliedDivision !== 'ALL') count++;
    if (appliedPincode !== 'ALL') count++;
    return count;
  }, [appliedState, appliedDistrict, appliedDivision, appliedPincode]);

  // Dynamic Division options based on draft District
  const currentDivisionOptions = useMemo(() => {
    return DIVISION_OPTIONS_MAP[draftDistrict] || DIVISION_OPTIONS_MAP.ALL;
  }, [draftDistrict]);

  // Filtered & Ranked Entries
  const filteredEntries = useMemo(() => {
    let list = [...rawEntries];

    // State filter
    if (appliedState !== 'ALL') {
      list = list.filter(
        item =>
          item.stateId === appliedState ||
          (item.stateName || '').toLowerCase().includes(appliedState.toLowerCase())
      );
    }

    // District filter
    if (appliedDistrict !== 'ALL') {
      list = list.filter(
        item =>
          item.districtId === appliedDistrict ||
          (item.districtName || '').toLowerCase().includes(appliedDistrict.toLowerCase()) ||
          (item.territoryName || '').toLowerCase().includes(appliedDistrict.toLowerCase())
      );
    }

    // Division filter
    if (appliedDivision !== 'ALL') {
      list = list.filter(
        item =>
          item.divisionId === appliedDivision ||
          (item.divisionName || '').toLowerCase().includes(appliedDivision.toLowerCase()) ||
          (item.territoryName || '').toLowerCase().includes(appliedDivision.toLowerCase())
      );
    }

    // Pincode filter
    if (appliedPincode !== 'ALL' && appliedPincode.trim() !== '') {
      list = list.filter(item => (item.pincode || '').includes(appliedPincode.trim()));
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        item =>
          item.managerName.toLowerCase().includes(q) ||
          (item.territoryName || '').toLowerCase().includes(q) ||
          (item.role || '').toLowerCase().includes(q) ||
          (item.pincode || '').includes(q)
      );
    }

    // Sort by score descending and re-assign dynamic rank
    list.sort((a, b) => b.score - a.score);
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [rawEntries, appliedState, appliedDistrict, appliedDivision, appliedPincode, searchQuery]);

  // Current logged in user's position in this filtered view
  const currentLoggedInId = manager?.id || 'mgr-000';
  const currentUserRankEntry = useMemo(() => {
    return filteredEntries.find(
      e =>
        e.managerId === currentLoggedInId ||
        e.managerName.toLowerCase().includes((manager?.name || 'Ramesh').toLowerCase())
    );
  }, [filteredEntries, currentLoggedInId, manager?.name]);

  const topThree = filteredEntries.slice(0, 3);
  const remainingEntries = filteredEntries.slice(3);

  const formatRankNumber = (rank: number): string => {
    return rank < 10 ? `#0${rank}` : `#${rank}`;
  };

  const formatTopBadge = (rank: number): string => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `${rank}th`;
  };

  const getRoleBadgeInfo = (role: string | ManagerRole) => {
    const r = (role || '').toLowerCase();
    if (r.includes('state')) return { label: 'L1 State Head', color: '#1D4ED8', bg: '#EFF6FF' };
    if (r.includes('district')) return { label: 'L2 District Mgr', color: '#7C3AED', bg: '#F5F3FF' };
    if (r.includes('division')) return { label: 'L3 Division Mgr', color: '#0284C7', bg: '#E0F2FE' };
    if (r.includes('pincode')) return { label: 'L4 Pincode Mgr', color: '#059669', bg: '#ECFDF5' };
    return { label: 'Field Agent', color: '#D97706', bg: '#FFFBEB' };
  };

  const getStateLabel = (val: string) => {
    return STATE_OPTIONS.find(o => o.value === val)?.label || val;
  };

  const getDistrictLabel = (val: string) => {
    return DISTRICT_OPTIONS.find(o => o.value === val)?.label || val;
  };

  const getDivisionLabel = (val: string) => {
    return DIVISION_OPTIONS_MAP.ALL.find(o => o.value === val)?.label || val;
  };

  if (isLoading && !isRefreshing) {
    return <FICLoadingState message="Loading leaderboard standings..." />;
  }

  if (error) {
    return (
      <FICErrorState
        title="Leaderboard Error"
        message={error}
        onRetry={() => loadLeaderboardData(selectedPeriod)}
      />
    );
  }

  const renderCurrentManagerCard = () => {
    if (!currentUserRankEntry) return null;

    const rankDisplay = formatRankNumber(currentUserRankEntry.rank);
    const vendors = currentUserRankEntry.vendorsOnboarded;
    const activities = currentUserRankEntry.activitiesCount ?? 94;
    const displayName = currentUserRankEntry.managerName;
    const score = currentUserRankEntry.score;

    return (
      <FICCard style={styles.currentManagerCard}>
        <View style={styles.currentCardHeader}>
          <Text style={styles.currentCardSubtitle}>YOUR POSITION IN SCOPE</Text>
          <View style={styles.currentRankBadge}>
            <Text style={styles.currentRankText}>{rankDisplay}</Text>
          </View>
        </View>

        <View style={styles.currentCardBody}>
          <FICAvatar name={displayName} size={46} />
          <View style={styles.currentCardInfo}>
            <Text style={styles.currentManagerName}>{displayName}</Text>
            <Text style={styles.currentMetricsText}>
              {vendors} Vendors • {activities} Activities
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>{score}</Text>
            <Text style={styles.scoreLabel}>pts</Text>
          </View>
        </View>
      </FICCard>
    );
  };

  const renderTopThree = () => {
    // Only render podium pedestal if there are at least 3 performers
    if (filteredEntries.length < 3) return null;

    return (
      <View style={styles.topThreeContainer}>
        <Text style={styles.sectionHeaderTitle}>Top Performers</Text>
        <View style={styles.topThreeRow}>
          {topThree.map(item => {
            const isFirst = item.rank === 1;
            const isSecond = item.rank === 2;

            let borderStyle = styles.topCardBorderNormal;
            let badgeStyle = styles.badgeNormal;
            if (isFirst) {
              borderStyle = styles.topCardBorderFirst;
              badgeStyle = styles.badgeFirst;
            } else if (isSecond) {
              borderStyle = styles.topCardBorderSecond;
              badgeStyle = styles.badgeSecond;
            } else {
              borderStyle = styles.topCardBorderThird;
              badgeStyle = styles.badgeThird;
            }

            return (
              <View
                key={item.managerId}
                style={[
                  styles.topCard,
                  borderStyle,
                  isFirst && styles.topCardFirstElevated,
                ]}
              >
                <View style={[styles.badge, badgeStyle]}>
                  <Text style={styles.badgeText}>{formatTopBadge(item.rank)}</Text>
                </View>
                <FICAvatar name={item.managerName} size={40} />
                <Text style={styles.topManagerName} numberOfLines={1}>
                  {item.managerName}
                </Text>
                <Text style={styles.topManagerSub} numberOfLines={1}>
                  {item.territoryName || item.role}
                </Text>
                <Text style={styles.topMetricText}>
                  {item.activitiesCount ?? item.vendorsOnboarded} activities
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderRankingItem = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser =
      item.managerId === currentLoggedInId ||
      item.managerName.toLowerCase().includes((manager?.name || 'Ramesh').toLowerCase());
    const formattedRank = item.rank < 10 ? `0${item.rank}` : `${item.rank}`;
    const badge = getRoleBadgeInfo(item.role);

    return (
      <View
        style={[
          styles.rankItemRow,
          isCurrentUser && styles.rankItemRowHighlight,
        ]}
      >
        <Text style={styles.rankNumberText}>{formattedRank}</Text>
        <FICAvatar name={item.managerName} size={38} />
        <View style={styles.rankItemContent}>
          <View style={styles.rankItemNameRow}>
            <Text style={styles.rankItemName} numberOfLines={1}>
              {item.managerName}
            </Text>
            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
              </View>
            )}
          </View>
          <View style={styles.roleTerritoryRow}>
            <View style={[styles.roleBadgeBox, { backgroundColor: badge.bg }]}>
              <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <Text style={styles.rankItemSub} numberOfLines={1}>
              • {item.territoryName || item.districtName || 'Tamil Nadu'}
            </Text>
          </View>
        </View>
        <View style={styles.rankItemRight}>
          <Text style={styles.rankItemMetric}>
            {item.activitiesCount ?? item.vendorsOnboarded} activities
          </Text>
          <Text style={styles.rankItemScore}>{item.score} pts</Text>
        </View>
      </View>
    );
  };

  const renderHeaderComponent = () => (
    <View style={styles.headerContentWrapper}>
      {/* Subtitle / Scope row */}
      <View style={styles.subtitleRow}>
        <Text style={styles.headerSubtitle}>Track your ranking and activity</Text>
        <Text style={styles.territoryScopeText}>
          📍 {appliedDistrict !== 'ALL' ? `${getDistrictLabel(appliedDistrict)} Scope` : 'Tamil Nadu State Scope'}
        </Text>
      </View>

      {/* Search and Filter Row */}
      <View style={styles.searchFilterRow}>
        <View style={styles.searchBar}>
          <Icon name="magnify" size={20} color="#64748B" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users or territory..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFiltersCount > 0 && styles.filterBtnActive]}
          onPress={handleOpenFilterModal}
          activeOpacity={0.8}
        >
          <Icon
            name="filter-variant"
            size={18}
            color={activeFiltersCount > 0 ? '#FFFFFF' : '#1D4ED8'}
          />
          <Text
            style={[
              styles.filterBtnText,
              activeFiltersCount > 0 && styles.filterBtnTextActive,
            ]}
          >
            Filter ▾
          </Text>
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filter Chips Strip */}
      {activeFiltersCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeChipsScroll}
          contentContainerStyle={styles.activeChipsContainer}
        >
          {appliedState !== 'ALL' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>State: {getStateLabel(appliedState)}</Text>
              <TouchableOpacity onPress={() => setAppliedState('ALL')}>
                <Icon name="close" size={14} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          )}
          {appliedDistrict !== 'ALL' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>District: {getDistrictLabel(appliedDistrict)}</Text>
              <TouchableOpacity onPress={() => setAppliedDistrict('ALL')}>
                <Icon name="close" size={14} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          )}
          {appliedDivision !== 'ALL' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>Division: {getDivisionLabel(appliedDivision)}</Text>
              <TouchableOpacity onPress={() => setAppliedDivision('ALL')}>
                <Icon name="close" size={14} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          )}
          {appliedPincode !== 'ALL' && (
            <View style={styles.activeChip}>
              <Text style={styles.activeChipText}>PIN: {appliedPincode}</Text>
              <TouchableOpacity onPress={() => setAppliedPincode('ALL')}>
                <Icon name="close" size={14} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={handleResetFilters} style={styles.clearAllBtn}>
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Period Filter Tabs */}
      <View style={styles.periodSelectorContainer}>
        {PERIOD_OPTIONS.map(opt => {
          const isSelected = selectedPeriod === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.periodPill,
                isSelected && styles.periodPillSelected,
              ]}
              activeOpacity={0.7}
              onPress={() => handlePeriodChange(opt.value)}
            >
              <Text
                style={[
                  styles.periodPillText,
                  isSelected && styles.periodPillTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Current Manager Position Card */}
      {renderCurrentManagerCard()}

      {/* Top Three Section */}
      {renderTopThree()}

      {/* List Header */}
      {filteredEntries.length > 0 && (
        <Text style={styles.sectionHeaderTitle}>
          {activeFiltersCount > 0
            ? `Filtered Standings (${filteredEntries.length} ${filteredEntries.length === 1 ? 'user' : 'users'})`
            : `Full Ranking (${filteredEntries.length} users)`}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Leaderboard"
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
        rightActionIcon={<Text style={styles.headerIcon}>↻</Text>}
        onRightAction={handleRefresh}
      />

      {filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          {renderHeaderComponent()}
          <FICEmptyState
            title="No users match your filters"
            description="Try changing your state, district, division or search query to see rankings."
          />
        </View>
      ) : (
        <FlatList
          data={filteredEntries}
          keyExtractor={item => item.managerId}
          renderItem={renderRankingItem}
          ListHeaderComponent={renderHeaderComponent}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/* ========================================================================= */}
      {/* 1. Hierarchy Filter Modal (State, District, Division, Pincode)             */}
      {/* ========================================================================= */}
      <Modal
        visible={isFilterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Hierarchy Filter Options</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsFilterModalOpen(false)}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
              {/* 1. STATE DROPDOWN */}
              <Text style={styles.filterFieldLabel}>State</Text>
              <TouchableOpacity
                style={styles.dropdownSelectorBtn}
                onPress={() => setShowStatePicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownSelectorText}>
                  {getStateLabel(draftState)}
                </Text>
                <Icon name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* 2. DISTRICT DROPDOWN */}
              <Text style={styles.filterFieldLabel}>District</Text>
              <TouchableOpacity
                style={styles.dropdownSelectorBtn}
                onPress={() => setShowDistrictPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownSelectorText}>
                  {getDistrictLabel(draftDistrict)}
                </Text>
                <Icon name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* 3. DIVISION DROPDOWN */}
              <Text style={styles.filterFieldLabel}>Division</Text>
              <TouchableOpacity
                style={styles.dropdownSelectorBtn}
                onPress={() => setShowDivisionPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownSelectorText}>
                  {getDivisionLabel(draftDivision)}
                </Text>
                <Icon name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* 4. PINCODE INPUT / DROPDOWN */}
              <View style={styles.pincodeHeaderRow}>
                <Text style={styles.filterFieldLabel}>Pincode</Text>
                <TouchableOpacity onPress={() => setShowPincodePicker(true)}>
                  <Text style={styles.presetPincodeText}>Pick Pincode ▾</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.pincodeInput}
                placeholder="e.g. 600001 or select from list"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={6}
                value={draftPincodeInput}
                onChangeText={setDraftPincodeInput}
              />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={handleResetFilters}
              >
                <Text style={styles.modalResetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={handleApplyFilters}
              >
                <Text style={styles.modalApplyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* State Picker Dropdown Modal */}
      <FICDropdownModal
        visible={showStatePicker}
        title="Select State"
        options={STATE_OPTIONS}
        selectedValue={draftState}
        onSelect={val => setDraftState(val)}
        onClose={() => setShowStatePicker(false)}
      />

      {/* District Picker Dropdown Modal */}
      <FICDropdownModal
        visible={showDistrictPicker}
        title="Select District"
        options={DISTRICT_OPTIONS}
        selectedValue={draftDistrict}
        onSelect={val => {
          setDraftDistrict(val);
          setDraftDivision('ALL');
        }}
        onClose={() => setShowDistrictPicker(false)}
      />

      {/* Division Picker Dropdown Modal */}
      <FICDropdownModal
        visible={showDivisionPicker}
        title="Select Division"
        options={currentDivisionOptions}
        selectedValue={draftDivision}
        onSelect={val => setDraftDivision(val)}
        onClose={() => setShowDivisionPicker(false)}
      />

      {/* Pincode Preset Dropdown Modal */}
      <FICDropdownModal
        visible={showPincodePicker}
        title="Select Pincode"
        options={PINCODE_OPTIONS}
        selectedValue={draftPincode}
        onSelect={val => {
          setDraftPincode(val);
          setDraftPincodeInput(val !== 'ALL' ? val : '');
        }}
        onClose={() => setShowPincodePicker(false)}
      />
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerContentWrapper: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  subtitleRow: {
    marginBottom: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  territoryScopeText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '700',
    marginTop: 3,
  },
  searchFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  filterBtnActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  filterBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  activeChipsScroll: {
    marginBottom: 10,
  },
  activeChipsContainer: {
    gap: 8,
    alignItems: 'center',
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  activeChipText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  clearAllText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  periodSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  periodPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  periodPillSelected: {
    backgroundColor: '#1D4ED8',
  },
  periodPillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  periodPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  currentManagerCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1D4ED8',
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 14,
    padding: 14,
  },
  currentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  currentCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  currentRankBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  currentRankText: {
    fontSize: 13,
    color: '#1D4ED8',
    fontWeight: '800',
  },
  currentCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currentManagerName: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '700',
  },
  currentMetricsText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 6,
  },
  topThreeContainer: {
    marginBottom: 14,
  },
  topThreeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    gap: 8,
  },
  topCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
  },
  topCardFirstElevated: {
    paddingVertical: 14,
    transform: [{ translateY: -4 }],
  },
  topCardBorderFirst: {
    borderColor: '#D4AF37',
    borderWidth: 1.5,
  },
  topCardBorderSecond: {
    borderColor: '#A8A8A8',
    borderWidth: 1.5,
  },
  topCardBorderThird: {
    borderColor: '#CD7F32',
    borderWidth: 1.5,
  },
  topCardBorderNormal: {
    borderColor: '#E2E8F0',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeFirst: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  badgeSecond: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#A8A8A8',
  },
  badgeThird: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#CD7F32',
  },
  badgeNormal: {
    backgroundColor: '#F8FAFC',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  topManagerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center',
  },
  topManagerSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  topMetricText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
    marginTop: 4,
  },
  rankItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rankItemRowHighlight: {
    borderColor: '#1D4ED8',
    backgroundColor: '#F8FAFC',
  },
  rankNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    width: 24,
    textAlign: 'center',
    marginRight: 8,
  },
  rankItemContent: {
    flex: 1,
    marginLeft: 10,
  },
  rankItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  youBadge: {
    backgroundColor: '#F2A900',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  roleTerritoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  roleBadgeBox: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rankItemSub: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  rankItemRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  rankItemMetric: {
    fontSize: 11,
    color: '#64748B',
  },
  rankItemScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    marginTop: 2,
  },

  // Hierarchy Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  filterModalBody: {
    maxHeight: 340,
  },
  filterFieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  dropdownSelectorBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  dropdownSelectorText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  pincodeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  presetPincodeText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  pincodeInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 10,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  modalResetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
