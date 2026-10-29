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
  Modal,
  TextInput,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { FieldAgent, ManagerRole } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICAvatar } from '../../components/ui/FICAvatar';
import { FICCard } from '../../components/ui/FICCard';
import { FICDropdownModal } from '../../components/ui/FICDropdownModal';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';
import { theme } from '../../theme';

export interface AgentsDirectoryScreenProps {
  onBack?: () => void;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

type AgentScopeFilter = 'ALL' | 'MY' | 'EQUAL' | 'SUBORDINATE';
type AgentTierFilter = 'ALL' | ManagerRole;

export const AgentsDirectoryScreen: React.FC<AgentsDirectoryScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager: authManager } = useAuth();
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeScope, setActiveScope] = useState<AgentScopeFilter>('ALL');
  const [activeTier, setActiveTier] = useState<AgentTierFilter>('ALL');

  // Hierarchy Filter Modal state
  const [isFilterModalVisible, setIsFilterModalVisible] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [pincodeFilterInput, setPincodeFilterInput] = useState<string>('');

  // Dropdown Picker Modals
  const [showDistrictPicker, setShowDistrictPicker] = useState<boolean>(false);
  const [showDivisionPicker, setShowDivisionPicker] = useState<boolean>(false);

  // Applied filter state
  const [appliedDistrict, setAppliedDistrict] = useState<string>('ALL');
  const [appliedDivision, setAppliedDivision] = useState<string>('ALL');
  const [appliedPincode, setAppliedPincode] = useState<string>('');

  const fetchAgents = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      try {
        const managerId = authManager?.id || 'mgr-000';
        const list = await services.agentRepository.getAgentsInScope(
          managerId,
          '',
          'ALL',
        );
        setAgents(list);
      } catch {
        setError('Unable to load field agents for your territory');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [authManager],
  );

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAgents(true);
  };

  const handleCallAgent = (agent: FieldAgent) => {
    if (!agent.phone) return;
    Linking.openURL(`tel:${agent.phone}`).catch(() => {
      Alert.alert('Phone Call', `Dial: ${agent.phone}`);
    });
  };

  // Helper to categorize manager role tier for an agent
  const getAgentManagerTier = (agent: FieldAgent): ManagerRole => {
    const mgrId = agent.assignedManagerId || '';
    if (mgrId.includes('pin') || mgrId.includes('mgr-tn-pin')) return ManagerRole.PINCODE_MANAGER;
    if (mgrId.includes('div') || mgrId.includes('mgr-tn-div')) return ManagerRole.DIVISION_MANAGER;
    if (mgrId.includes('dt') || mgrId.includes('mgr-tn-dt')) return ManagerRole.DISTRICT_MANAGER;
    return ManagerRole.STATE_MANAGER;
  };

  // Jurisdiction Locking: Users cannot filter/change jurisdictions equal to or above them
  const userRole = authManager?.role || ManagerRole.STATE_MANAGER;
  const isDistrictFixed =
    userRole === ManagerRole.DISTRICT_MANAGER ||
    userRole === ManagerRole.DIVISION_MANAGER ||
    userRole === ManagerRole.PINCODE_MANAGER;
  const isDivisionFixed =
    userRole === ManagerRole.DIVISION_MANAGER ||
    userRole === ManagerRole.PINCODE_MANAGER;
  const isPincodeFixed = userRole === ManagerRole.PINCODE_MANAGER;

  const userDefaultDistrict = authManager?.districtId || (isDistrictFixed ? 'dt-chn-01' : 'ALL');
  const userDefaultDivision = authManager?.divisionId || (isDivisionFixed ? 'div-chn-central' : 'ALL');
  const userDefaultPincode = authManager?.pincodeId || '';

  // Synchronize initial state to jurisdiction
  useEffect(() => {
    if (isDistrictFixed) {
      setSelectedDistrict(userDefaultDistrict);
      setAppliedDistrict(userDefaultDistrict);
    }
    if (isDivisionFixed) {
      setSelectedDivision(userDefaultDivision);
      setAppliedDivision(userDefaultDivision);
    }
    if (isPincodeFixed) {
      setPincodeFilterInput(userDefaultPincode);
      setAppliedPincode(userDefaultPincode);
    }
  }, [isDistrictFixed, isDivisionFixed, isPincodeFixed, userDefaultDistrict, userDefaultDivision, userDefaultPincode]);

  // Scope counts
  const scopeCounts = useMemo(() => {
    let myCount = 0;
    let equalCount = 0;
    let subCount = 0;

    agents.forEach(a => {
      const tier = getAgentManagerTier(a);
      if (a.assignedManagerId === authManager?.id || a.assignedManagerId === 'mgr-000') {
        myCount++;
      } else if (tier === ManagerRole.STATE_MANAGER) {
        equalCount++;
      } else {
        subCount++;
      }
    });

    return {
      all: agents.length,
      my: myCount,
      equal: equalCount,
      subordinate: subCount,
    };
  }, [agents, authManager?.id]);

  // Tier counts
  const tierCounts = useMemo(() => {
    const counts = {
      [ManagerRole.STATE_MANAGER]: 0,
      [ManagerRole.DISTRICT_MANAGER]: 0,
      [ManagerRole.DIVISION_MANAGER]: 0,
      [ManagerRole.PINCODE_MANAGER]: 0,
    };
    agents.forEach(a => {
      const tier = getAgentManagerTier(a);
      if (counts[tier] !== undefined) {
        counts[tier]++;
      }
    });
    return counts;
  }, [agents]);

  // District options
  const districtOptions = useMemo(() => {
    return [
      'ALL',
      'dt-chn-01',
      'dt-cbe-01',
      'dt-mdu-01',
      'dt-try-01',
      'dt-slm-01',
      'dt-tnv-01',
      'dt-vel-01',
      'dt-erd-01',
    ];
  }, []);

  const formatDistrictName = (id: string) => {
    if (id === 'ALL') return 'All Districts (Whole State)';
    if (id === 'dt-chn-01') return 'Chennai District';
    if (id === 'dt-cbe-01') return 'Coimbatore District';
    if (id === 'dt-mdu-01') return 'Madurai District';
    if (id === 'dt-try-01') return 'Tiruchirappalli District';
    if (id === 'dt-slm-01') return 'Salem District';
    if (id === 'dt-tnv-01') return 'Tirunelveli District';
    if (id === 'dt-vel-01') return 'Vellore District';
    if (id === 'dt-erd-01') return 'Erode District';
    return id;
  };

  const formatDivisionName = (id: string) => {
    if (id === 'ALL') return 'All Divisions';
    if (id === 'div-chn-central') return 'Chennai Central Division';
    if (id === 'div-chn-anna') return 'Anna Nagar Division';
    if (id === 'div-cbe-gandhi') return 'Gandhipuram Division (Coimbatore)';
    if (id === 'div-cbe-rspuram') return 'R.S. Puram Division (Coimbatore)';
    if (id === 'div-mdu-central') return 'Madurai Central Division';
    if (id === 'div-try-thillai') return 'Thillai Nagar Division (Trichy)';
    if (id === 'div-slm-sura') return 'Suramangalam Division (Salem)';
    if (id === 'div-tnv-palayam') return 'Palayamkottai Division (Tirunelveli)';
    if (id === 'div-vel-katpadi') return 'Katpadi Division (Vellore)';
    if (id === 'div-erd-perun') return 'Perundurai Division (Erode)';
    return id;
  };

  const divisionOptions = useMemo(() => {
    if (selectedDistrict === 'dt-chn-01') {
      return ['ALL', 'div-chn-central', 'div-chn-anna'];
    }
    if (selectedDistrict === 'dt-cbe-01') {
      return ['ALL', 'div-cbe-gandhi', 'div-cbe-rspuram'];
    }
    if (selectedDistrict === 'dt-mdu-01') {
      return ['ALL', 'div-mdu-central'];
    }
    if (selectedDistrict === 'dt-try-01') {
      return ['ALL', 'div-try-thillai'];
    }
    if (selectedDistrict === 'dt-slm-01') {
      return ['ALL', 'div-slm-sura'];
    }
    if (selectedDistrict === 'dt-tnv-01') {
      return ['ALL', 'div-tnv-palayam'];
    }
    if (selectedDistrict === 'dt-vel-01') {
      return ['ALL', 'div-vel-katpadi'];
    }
    if (selectedDistrict === 'dt-erd-01') {
      return ['ALL', 'div-erd-perun'];
    }
    return [
      'ALL',
      'div-chn-central',
      'div-chn-anna',
      'div-cbe-gandhi',
      'div-cbe-rspuram',
      'div-mdu-central',
      'div-try-thillai',
      'div-slm-sura',
      'div-tnv-palayam',
    ];
  }, [selectedDistrict]);

  const districtDropdownOptions = useMemo(() => {
    if (isDistrictFixed) {
      return [
        {
          label: formatDistrictName(userDefaultDistrict),
          value: userDefaultDistrict,
          subtitle: 'Fixed to your assigned jurisdiction',
        },
      ];
    }
    return districtOptions.map(dId => ({
      label: formatDistrictName(dId),
      value: dId,
      subtitle: dId === 'ALL' ? 'Search all districts across state' : `District code: ${dId}`,
    }));
  }, [districtOptions, isDistrictFixed, userDefaultDistrict]);

  const divisionDropdownOptions = useMemo(() => {
    if (isDivisionFixed) {
      return [
        {
          label: formatDivisionName(userDefaultDivision),
          value: userDefaultDivision,
          subtitle: 'Fixed to your assigned jurisdiction',
        },
      ];
    }
    return divisionOptions.map(divId => ({
      label: formatDivisionName(divId),
      value: divId,
      subtitle: divId === 'ALL' ? 'Search all divisions in selected district' : `Division code: ${divId}`,
    }));
  }, [divisionOptions, isDivisionFixed, userDefaultDivision]);

  // Filtered Agents List
  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      const tier = getAgentManagerTier(a);
      const isMy = a.assignedManagerId === authManager?.id || a.assignedManagerId === 'mgr-000';

      // 1. Scope filter
      if (activeScope === 'MY') {
        if (!isMy) return false;
      } else if (activeScope === 'EQUAL') {
        if (tier !== ManagerRole.STATE_MANAGER || isMy) return false;
      } else if (activeScope === 'SUBORDINATE') {
        if (tier === ManagerRole.STATE_MANAGER) return false;
      }

      // 2. Tier filter
      if (activeTier !== 'ALL' && tier !== activeTier) {
        return false;
      }

      // 3. Applied District filter
      if (appliedDistrict !== 'ALL' && a.districtId !== appliedDistrict) {
        return false;
      }

      // 4. Applied Division filter
      if (appliedDivision !== 'ALL' && a.divisionId !== appliedDivision) {
        return false;
      }

      // 5. Applied Pincode filter
      if (appliedPincode.trim().length > 0) {
        const pinTerm = appliedPincode.trim();
        if (!a.assignedPincode || !a.assignedPincode.includes(pinTerm)) {
          return false;
        }
      }

      // 6. Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = a.name.toLowerCase().includes(q);
        const matchPhone = a.phone.includes(q);
        const matchPin = a.assignedPincode.toLowerCase().includes(q);
        const matchMgr = a.assignedManager ? a.assignedManager.toLowerCase().includes(q) : false;
        if (!matchName && !matchPhone && !matchPin && !matchMgr) {
          return false;
        }
      }

      return true;
    });
  }, [
    agents,
    activeScope,
    activeTier,
    appliedDistrict,
    appliedDivision,
    appliedPincode,
    searchQuery,
    authManager?.id,
  ]);

  const handleApplyFilters = () => {
    setAppliedDistrict(selectedDistrict);
    setAppliedDivision(selectedDivision);
    setAppliedPincode(pincodeFilterInput);
    setIsFilterModalVisible(false);
  };

  const handleResetFilters = () => {
    setSelectedDistrict(isDistrictFixed ? userDefaultDistrict : 'ALL');
    setSelectedDivision(isDivisionFixed ? userDefaultDivision : 'ALL');
    setPincodeFilterInput(isPincodeFixed ? userDefaultPincode : '');
    setAppliedDistrict(isDistrictFixed ? userDefaultDistrict : 'ALL');
    setAppliedDivision(isDivisionFixed ? userDefaultDivision : 'ALL');
    setAppliedPincode(isPincodeFixed ? userDefaultPincode : '');
    setIsFilterModalVisible(false);
  };

  const hasActiveFilters =
    appliedDistrict !== 'ALL' || appliedDivision !== 'ALL' || appliedPincode.trim().length > 0;

  if (isLoading && !isRefreshing) {
    return <FICLoadingState message="Loading field agents..." />;
  }

  if (error) {
    return <FICErrorState title="Directory Error" message={error} onRetry={() => fetchAgents()} />;
  }

  const territoryScopeText = authManager?.territoryName || 'Tamil Nadu (Whole State)';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />

      {/* Header */}
      <FICHeader
        title="Field Agents"
        subtitle={`Scope: ${territoryScopeText}`}
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
        rightActionIcon={<Text style={styles.headerIcon}>↻</Text>}
        onRightAction={handleRefresh}
      />

      <FlatList
        data={filteredAgents}
        keyExtractor={item => item.id}
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
          <View style={styles.headerContentWrapper}>
            <Text style={styles.headerSubtitle}>Field agents across hierarchy</Text>
            <Text style={styles.scopeBadgeText}>
              📍 Scope: {territoryScopeText}
            </Text>

            {/* Dark Tier Badges Bar */}
            <View style={styles.darkTierStatsCard}>
              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.STATE_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.STATE_MANAGER ? 'ALL' : ManagerRole.STATE_MANAGER,
                  )
                }
              >
                <Icon name="bank" size={14} color="#FBBF24" />
                <Text style={styles.darkTierPillText}>
                  L1 State ({tierCounts[ManagerRole.STATE_MANAGER]})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.DISTRICT_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.DISTRICT_MANAGER ? 'ALL' : ManagerRole.DISTRICT_MANAGER,
                  )
                }
              >
                <Icon name="office-building" size={14} color="#38BDF8" />
                <Text style={styles.darkTierPillText}>
                  L2 District ({tierCounts[ManagerRole.DISTRICT_MANAGER]})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.DIVISION_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.DIVISION_MANAGER ? 'ALL' : ManagerRole.DIVISION_MANAGER,
                  )
                }
              >
                <Icon name="layers-outline" size={14} color="#FB923C" />
                <Text style={styles.darkTierPillText}>
                  L3 Division ({tierCounts[ManagerRole.DIVISION_MANAGER]})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.PINCODE_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.PINCODE_MANAGER ? 'ALL' : ManagerRole.PINCODE_MANAGER,
                  )
                }
              >
                <Icon name="map-marker-outline" size={14} color="#818CF8" />
                <Text style={styles.darkTierPillText}>
                  L4 PIN ({tierCounts[ManagerRole.PINCODE_MANAGER]})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scope Switcher Tabs: All / My Agents / Equal / Subordinate */}
            <View style={styles.scopeSwitcherRow}>
              <TouchableOpacity
                style={[styles.scopeBtn, activeScope === 'ALL' && styles.scopeBtnActive]}
                onPress={() => setActiveScope('ALL')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'ALL' && styles.scopeBtnTextActive,
                  ]}
                >
                  All ({scopeCounts.all})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, activeScope === 'MY' && styles.scopeBtnActive]}
                onPress={() => setActiveScope('MY')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'MY' && styles.scopeBtnTextActive,
                  ]}
                >
                  My ({scopeCounts.my})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, activeScope === 'EQUAL' && styles.scopeBtnActive]}
                onPress={() => setActiveScope('EQUAL')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'EQUAL' && styles.scopeBtnTextActive,
                  ]}
                >
                  Equal ({scopeCounts.equal})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeBtn,
                  activeScope === 'SUBORDINATE' && styles.scopeBtnActive,
                ]}
                onPress={() => setActiveScope('SUBORDINATE')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'SUBORDINATE' && styles.scopeBtnTextActive,
                  ]}
                >
                  Subordinate ({scopeCounts.subordinate})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input Bar + Filter Trigger Button */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <Icon name="magnify" size={20} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search agents by name, ID, phone..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setSearchQuery('')}
                  >
                    <Icon name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.filterModalTriggerBtn,
                  hasActiveFilters && styles.filterModalTriggerBtnActive,
                ]}
                onPress={() => {
                  setSelectedDistrict(appliedDistrict);
                  setSelectedDivision(appliedDivision);
                  setPincodeFilterInput(appliedPincode);
                  setIsFilterModalVisible(true);
                }}
              >
                <Icon
                  name="filter-variant"
                  size={16}
                  color={hasActiveFilters ? theme.colors.primary : '#475569'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.filterModalTriggerText,
                    hasActiveFilters && styles.filterModalTriggerTextActive,
                  ]}
                >
                  Filter ▾
                </Text>
              </TouchableOpacity>
            </View>

            {/* Horizontal Quick Tier Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickTierPillsScroll}
            >
              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === 'ALL' && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier('ALL')}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === 'ALL' && styles.tierQuickPillTextActive,
                  ]}
                >
                  All Tiers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.STATE_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.STATE_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.STATE_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L1 State
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.DISTRICT_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.DISTRICT_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.DISTRICT_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L2 District
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.DIVISION_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.DIVISION_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.DIVISION_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L3 Division
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.PINCODE_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.PINCODE_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.PINCODE_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L4 PIN Code
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => {
          const isActive = item.status === 'ACTIVE';
          const isOnLeave = item.status === 'ON_LEAVE';

          return (
            <FICCard style={styles.agentCard}>
              {/* Header Row */}
              <View style={styles.cardHeaderRow}>
                <FICAvatar name={item.name} size={44} />
                <View style={styles.cardMainContent}>
                  <View style={styles.nameRow}>
                    <Text style={styles.agentName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>

                  <Text style={styles.assignedMgrText}>
                    👤 Assigned to: {item.assignedManager || 'Field Operations'}
                  </Text>

                  <Text style={styles.territoryText}>
                    📍 Pincode: {item.assignedPincode} • ID: {item.id}
                  </Text>
                </View>

                <View style={styles.rightActionCol}>
                  <View
                    style={[
                      styles.statusBadge,
                      isActive
                        ? styles.statusActive
                        : isOnLeave
                        ? styles.statusOnLeave
                        : styles.statusInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isActive
                          ? styles.statusActiveText
                          : isOnLeave
                          ? styles.statusOnLeaveText
                          : styles.statusInactiveText,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 3 Metrics Box */}
              <View style={styles.metricsBox}>
                <View style={styles.metricCol}>
                  <Text style={styles.metricVal}>4</Text>
                  <Text style={styles.metricLabel}>Tasks Assigned</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={styles.metricVal}>12</Text>
                  <Text style={styles.metricLabel}>Reports Filed</Text>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricCol}>
                  <Text style={[styles.metricVal, { color: '#16A34A' }]}>100%</Text>
                  <Text style={styles.metricLabel}>Verification</Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCallAgent(item)}
                >
                  <Icon name="phone" size={15} color="#0284C7" />
                  <Text style={styles.callBtnText}>Call Agent</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.locateBtn}
                  onPress={() => {
                    const encodedPin = encodeURIComponent(`Pincode ${item.assignedPincode}, Tamil Nadu`);
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedPin}`);
                  }}
                >
                  <Icon name="map-marker-radius-outline" size={15} color={theme.colors.primary} />
                  <Text style={styles.locateBtnText}>Jurisdiction Area</Text>
                </TouchableOpacity>
              </View>
            </FICCard>
          );
        }}
        ListEmptyComponent={
          <FICEmptyState
            title="No Field Agents Found"
            description="No field agents match the selected hierarchy scope, tier, or filter criteria."
            actionTitle="Reset All Filters"
            onAction={handleResetFilters}
          />
        }
      />

      {/* ========================================================================= */}
      {/* Hierarchy Filter Options Modal with Native Dropdowns                      */}
      {/* ========================================================================= */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalTitle}>Hierarchy Filter Options</Text>
                <Text style={styles.modalSubtitle}>
                  State Portal ({territoryScopeText}) • Select from Dropdowns
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Field 0: State (Fixed) */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="map" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>State (Fixed Jurisdiction)</Text>
                <View style={styles.fixedBadge}>
                  <Icon name="lock" size={11} color="#64748B" />
                  <Text style={styles.fixedBadgeText}>Fixed</Text>
                </View>
              </View>
              <View style={[styles.dropdownSelectorBox, styles.selectorBoxDisabled]}>
                <Text style={styles.dropdownSelectorTextDisabled}>Tamil Nadu</Text>
                <Icon name="lock-outline" size={18} color="#94A3B8" />
              </View>
            </View>

            {/* Field 1: District Dropdown Selector */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="bank" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>
                  {isDistrictFixed ? 'District (Fixed Jurisdiction)' : 'Select District (State Level)'}
                </Text>
                {isDistrictFixed && (
                  <View style={styles.fixedBadge}>
                    <Icon name="lock" size={11} color="#64748B" />
                    <Text style={styles.fixedBadgeText}>Fixed</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.dropdownSelectorBox, isDistrictFixed && styles.selectorBoxDisabled]}
                activeOpacity={isDistrictFixed ? 1 : 0.8}
                disabled={isDistrictFixed}
                onPress={() => !isDistrictFixed && setShowDistrictPicker(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    isDistrictFixed && styles.dropdownSelectorTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {formatDistrictName(selectedDistrict)}
                </Text>
                <Icon
                  name={isDistrictFixed ? 'lock-outline' : 'chevron-down'}
                  size={20}
                  color={isDistrictFixed ? '#94A3B8' : theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Field 2: Division Dropdown Selector */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="layers-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>
                  {isDivisionFixed ? 'Division (Fixed Jurisdiction)' : 'Select Division (Within District)'}
                </Text>
                {isDivisionFixed && (
                  <View style={styles.fixedBadge}>
                    <Icon name="lock" size={11} color="#64748B" />
                    <Text style={styles.fixedBadgeText}>Fixed</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.dropdownSelectorBox, isDivisionFixed && styles.selectorBoxDisabled]}
                activeOpacity={isDivisionFixed ? 1 : 0.8}
                disabled={isDivisionFixed}
                onPress={() => !isDivisionFixed && setShowDivisionPicker(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    isDivisionFixed && styles.dropdownSelectorTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {formatDivisionName(selectedDivision)}
                </Text>
                <Icon
                  name={isDivisionFixed ? 'lock-outline' : 'chevron-down'}
                  size={20}
                  color={isDivisionFixed ? '#94A3B8' : theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Field 3: Pincode */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="map-marker-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>
                  {isPincodeFixed ? 'Pincode (Fixed Jurisdiction)' : 'Enter Pincode (Type to Search Locality)'}
                </Text>
                {isPincodeFixed && (
                  <View style={styles.fixedBadge}>
                    <Icon name="lock" size={11} color="#64748B" />
                    <Text style={styles.fixedBadgeText}>Fixed</Text>
                  </View>
                )}
              </View>
              <View style={[styles.pincodeInputBox, isPincodeFixed && styles.selectorBoxDisabled]}>
                <Icon
                  name={isPincodeFixed ? 'lock-outline' : 'email-outline'}
                  size={20}
                  color={isPincodeFixed ? '#94A3B8' : theme.colors.primary}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={[styles.pincodeInput, isPincodeFixed && { color: '#64748B' }]}
                  placeholder={isPincodeFixed ? userDefaultPincode : 'Type 6-digit Pincode (e.g. 600001)'}
                  placeholderTextColor="#94A3B8"
                  value={pincodeFilterInput}
                  onChangeText={setPincodeFilterInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isPincodeFixed}
                />
              </View>
              <Text style={styles.fieldHint}>
                {isPincodeFixed
                  ? 'Locked to your assigned pincode jurisdiction.'
                  : 'Type full or partial pincode to search in that area.'}
              </Text>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionButtonsRow}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={handleResetFilters}>
                <Text style={styles.modalResetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={handleApplyFilters}>
                <Text style={styles.modalApplyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* District Picker Dropdown Modal */}
      <FICDropdownModal
        visible={showDistrictPicker}
        title="Select District"
        options={districtDropdownOptions}
        selectedValue={selectedDistrict}
        onSelect={val => {
          setSelectedDistrict(val);
          setSelectedDivision('ALL');
        }}
        onClose={() => setShowDistrictPicker(false)}
      />

      {/* Division Picker Dropdown Modal */}
      <FICDropdownModal
        visible={showDivisionPicker}
        title="Select Division"
        options={divisionDropdownOptions}
        selectedValue={selectedDivision}
        onSelect={val => setSelectedDivision(val)}
        onClose={() => setShowDivisionPicker(false)}
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
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerContentWrapper: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  scopeBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: theme.spacing.xs,
  },

  // Dark Tier Badges Bar
  darkTierStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 6,
    marginVertical: theme.spacing.xs,
    justifyContent: 'space-between',
    gap: 4,
  },
  darkTierPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderRadius: 6,
    backgroundColor: '#334155',
    gap: 3,
  },
  darkTierPillSelected: {
    backgroundColor: theme.colors.primary,
  },
  darkTierPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC',
  },

  // Scope Switcher Tabs
  scopeSwitcherRow: {
    flexDirection: 'row',
    marginVertical: theme.spacing.xs,
    gap: 6,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  scopeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  scopeBtnTextActive: {
    color: theme.colors.surface,
  },

  // Search & Filter
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filterModalTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  filterModalTriggerBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary,
  },
  filterModalTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  filterModalTriggerTextActive: {
    color: theme.colors.primary,
  },

  // Quick Tier Filter Pills
  quickTierPillsScroll: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.xs,
    gap: 6,
  },
  tierQuickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tierQuickPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tierQuickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tierQuickPillTextActive: {
    color: '#FFFFFF',
  },

  // Agent Card
  agentCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardMainContent: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentName: {
    ...theme.typography.title,
    color: theme.colors.text,
    fontWeight: '700',
  },
  assignedMgrText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  territoryText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  rightActionCol: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  statusActive: {
    backgroundColor: theme.colors.success + '15',
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
  },
  statusOnLeave: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  statusInactive: {
    backgroundColor: theme.colors.textMuted + '15',
    borderWidth: 1,
    borderColor: theme.colors.textMuted + '40',
  },
  statusBadgeText: {
    ...theme.typography.caption,
    fontSize: 9,
    fontWeight: '800',
  },
  statusActiveText: {
    color: theme.colors.success,
  },
  statusOnLeaveText: {
    color: '#92400E',
  },
  statusInactiveText: {
    color: theme.colors.textMuted,
  },

  // Metrics Box
  metricsBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricCol: {
    alignItems: 'center',
    flex: 1,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.text,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.border,
  },

  // Card Actions
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.xs,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 4,
  },
  callBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  locateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  locateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },

  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  filterModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormField: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  fixedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    gap: 3,
  },
  fixedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  dropdownSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  selectorBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  dropdownSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  dropdownSelectorTextDisabled: {
    color: '#64748B',
    fontWeight: '600',
  },
  pincodeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  pincodeInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  fieldHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
