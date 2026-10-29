import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { Vendor, VendorStatus } from '../../types';
import { VendorFilterOptions } from '../../services/repositories/IVendorRepository';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICDropdownModal } from '../../components/ui/FICDropdownModal';
import { VendorCard } from './components/VendorCard';
import { theme } from '../../theme';
import { ASSETS } from '../../assets/logo';
import { socketService } from '../../services/realtime/SocketService';

const assets: any = ASSETS;

export interface VendorsScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

type FilterChipType = 'ALL' | 'ACTIVE' | 'NOT_INTERESTED' | 'INACTIVE';
type SortByType = 'DEFAULT' | 'NAME_ASC' | 'OUTLETS_DESC' | 'ISSUES_DESC';

const CATEGORIES = [
  'All Categories',
  'Service',
  'Product',
  'Food',
  'Daily Needs',
  'Travel',
  'Stay',
  'Jobs',
  'Electronics',
  'Textiles',
];

export const VendorsScreen: React.FC<VendorsScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<FilterChipType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortByType>('DEFAULT');
  const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVendors = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setIsLoading(true);
      setError(null);
      try {
        const filterOpts: VendorFilterOptions = {
          districtId: manager?.role === 'STATE_MANAGER' ? undefined : manager?.districtId,
          divisionId: manager?.role === 'STATE_MANAGER' ? undefined : manager?.divisionId,
          pincodeId: manager?.role === 'STATE_MANAGER' ? undefined : manager?.pincodeId,
        };

        const totalList = await services.vendorRepository.getVendors(filterOpts);
        setAllVendors(totalList);

        const queryOpts: VendorFilterOptions = { ...filterOpts };
        if (searchQuery.trim()) {
          queryOpts.searchQuery = searchQuery.trim();
        }

        if (selectedFilter === 'ACTIVE') {
          queryOpts.activeState = 'ACTIVE';
        } else if (selectedFilter === 'NOT_INTERESTED') {
          queryOpts.status = VendorStatus.NOT_INTERESTED;
        } else if (selectedFilter === 'INACTIVE') {
          queryOpts.activeState = 'INACTIVE';
        }

        let filteredList = await services.vendorRepository.getVendors(queryOpts);
        if (selectedCategory !== 'ALL') {
          filteredList = filteredList.filter(v => v.category?.toLowerCase() === selectedCategory.toLowerCase());
        }

        if (sortBy === 'NAME_ASC') {
          filteredList = [...filteredList].sort((a, b) =>
            (a.businessName || a.vendorName || '').localeCompare(b.businessName || b.vendorName || '')
          );
        } else if (sortBy === 'OUTLETS_DESC') {
          filteredList = [...filteredList].sort((a, b) => (b.outletCount || 1) - (a.outletCount || 1));
        } else if (sortBy === 'ISSUES_DESC') {
          filteredList = [...filteredList].sort((a, b) => (b.issueCount || 0) - (a.issueCount || 0));
        }

        setVendors(filteredList);
      } catch (err) {
        setError('Unable to load vendors for your territory.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [manager, searchQuery, selectedFilter, selectedCategory, sortBy]
  );

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    const unsub = socketService.subscribe<Vendor>('vendor.updated', (payload) => {
      if (payload.data) {
        setVendors((prev) =>
          prev.map((v) => (v.id === payload.entityId ? { ...v, ...payload.data } : v))
        );
        setAllVendors((prev) =>
          prev.map((v) => (v.id === payload.entityId ? { ...v, ...payload.data } : v))
        );
      }
    });
    const unsubReconnect = socketService.onReconnect(() => {
      fetchVendors(true);
    });
    return () => {
      unsub();
      unsubReconnect();
    };
  }, [fetchVendors]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchVendors(true);
  };

  const handleVendorPress = (vendor: Vendor) => {
    if (onNavigateRoute) {
      onNavigateRoute('VendorDetail', { vendorId: vendor.id });
    }
  };

  const handleAddVendorPress = () => {
    if (onNavigateRoute) {
      onNavigateRoute('AddVendor');
    }
  };

  const handleResetFilters = () => {
    setSelectedFilter('ALL');
    setSelectedCategory('ALL');
    setSortBy('DEFAULT');
    setSearchQuery('');
  };

  const managerDisplayName = manager?.name || 'Manager';
  const managerDisplayRole = manager?.role
    ? manager.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bManager\b/i, 'Manager')
    : 'Manager';

  const allCount = allVendors.length;
  const activeCount = allVendors.filter(
    v => v.status === VendorStatus.ONBOARDED || (v as any).activeState === 'ACTIVE'
  ).length;
  const notInterestedCount = allVendors.filter(
    v => v.status === VendorStatus.NOT_INTERESTED
  ).length;
  const inactiveCount = allVendors.filter(
    v => v.status === VendorStatus.LEAD || (v as any).activeState === 'INACTIVE'
  ).length;

  const isFilterActive = selectedFilter !== 'ALL' || selectedCategory !== 'ALL' || sortBy !== 'DEFAULT';

  if (isLoading && !isRefreshing) {
    return <FICLoadingState message="Loading territory vendors..." />;
  }

  if (error) {
    return (
      <FICErrorState
        title="Vendors Load Failure"
        message={error}
        onRetry={() => fetchVendors()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Vendors"
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
      />

      <View style={styles.container}>
        {/* TITLE & ADD VENDOR ROW */}
        <View style={styles.titleRow}>
          <View style={styles.titleTextCol}>
            <Text style={styles.pageTitle}>Vendors</Text>
            <Text style={styles.pageSubtitle}>
              Manage and view all vendors in your territory
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addVendorButton}
            activeOpacity={0.8}
            onPress={handleAddVendorPress}
          >
            <Icon name="plus" size={18} color="#FFFFFF" style={styles.addVendorIcon} />
            <Text style={styles.addVendorButtonText}>Add Vendor</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH & FILTER ROW */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchInputContainer}>
            <Icon name="magnify" size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors by name, category, location..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, isFilterActive && styles.filterButtonActive]}
            activeOpacity={0.7}
            onPress={() => setShowFilterModal(true)}
            accessibilityLabel="Filter Vendors"
          >
            <Icon name="tune-variant" size={22} color={isFilterActive ? '#FFFFFF' : '#475569'} />
            {isFilterActive && <View style={styles.activeFilterBadgeDot} />}
          </TouchableOpacity>
        </View>

        {/* SEGMENT FILTER CHIPS */}
        <View style={styles.chipsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScrollContent}
          >
            {/* All */}
            <TouchableOpacity
              style={[styles.chip, selectedFilter === 'ALL' ? styles.chipSelected : styles.chipUnselected]}
              activeOpacity={0.7}
              onPress={() => setSelectedFilter('ALL')}
            >
              <Text style={[styles.chipText, selectedFilter === 'ALL' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                All ({allCount})
              </Text>
            </TouchableOpacity>

            {/* Active */}
            <TouchableOpacity
              style={[styles.chip, selectedFilter === 'ACTIVE' ? styles.chipSelected : styles.chipUnselected]}
              activeOpacity={0.7}
              onPress={() => setSelectedFilter('ACTIVE')}
            >
              <View style={[styles.dotIndicator, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.chipText, selectedFilter === 'ACTIVE' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                Active ({activeCount})
              </Text>
            </TouchableOpacity>

            {/* Not Interested */}
            <TouchableOpacity
              style={[styles.chip, selectedFilter === 'NOT_INTERESTED' ? styles.chipSelected : styles.chipUnselected]}
              activeOpacity={0.7}
              onPress={() => setSelectedFilter('NOT_INTERESTED')}
            >
              <View style={[styles.dotIndicator, { backgroundColor: '#DC2626' }]} />
              <Text style={[styles.chipText, selectedFilter === 'NOT_INTERESTED' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                Not Interested ({notInterestedCount})
              </Text>
            </TouchableOpacity>

            {/* Inactive */}
            <TouchableOpacity
              style={[styles.chip, selectedFilter === 'INACTIVE' ? styles.chipSelected : styles.chipUnselected]}
              activeOpacity={0.7}
              onPress={() => setSelectedFilter('INACTIVE')}
            >
              <View style={[styles.dotIndicator, { backgroundColor: '#6B7280' }]} />
              <Text style={[styles.chipText, selectedFilter === 'INACTIVE' ? styles.chipTextSelected : styles.chipTextUnselected]}>
                Inactive ({inactiveCount})
              </Text>
            </TouchableOpacity>

            {/* All Categories Dropdown */}
            <TouchableOpacity
              style={[
                styles.chip,
                selectedCategory !== 'ALL' ? styles.chipSelected : styles.chipUnselected,
                styles.dropdownChip,
              ]}
              activeOpacity={0.7}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text
                style={
                  selectedCategory !== 'ALL'
                    ? styles.chipTextSelected
                    : styles.chipTextUnselected
                }
              >
                {selectedCategory === 'ALL' ? 'All Categories' : selectedCategory}
              </Text>
              <Icon
                name="chevron-down"
                size={16}
                color={selectedCategory !== 'ALL' ? '#FFFFFF' : '#64748B'}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* VENDORS FLATLIST */}
        <FlatList
          data={vendors}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VendorCard vendor={item} onPress={handleVendorPress} />
          )}
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
          ListEmptyComponent={
            <FICEmptyState
              title="No Vendors Found"
              description="No vendors match your search query or selected filter criteria."
              actionTitle="Clear Filters"
              onAction={handleResetFilters}
            />
          }
        />
      </View>

      {/* Category Selection Dropdown Modal */}
      <FICDropdownModal
        visible={showCategoryModal}
        title="Select Vendor Category"
        options={CATEGORIES.map(cat => ({
          label: cat,
          value: cat === 'All Categories' ? 'ALL' : cat,
        }))}
        selectedValue={selectedCategory}
        onSelect={(val: string) => setSelectedCategory(val)}
        onClose={() => setShowCategoryModal(false)}
      />

      {/* Comprehensive Vendor Filter Bottom Sheet Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.filterModalContent}>
                <View style={styles.filterModalHeader}>
                  <View style={styles.modalDragHandle} />
                  <View style={styles.filterTitleRow}>
                    <Text style={styles.filterModalTitle}>Filter & Sort Vendors</Text>
                    <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.closeIconBtn}>
                      <Icon name="close" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
                  {/* Status Section */}
                  <Text style={styles.filterSectionTitle}>Vendor Status</Text>
                  <View style={styles.filterGrid}>
                    {[
                      { label: 'All', value: 'ALL' },
                      { label: 'Active', value: 'ACTIVE' },
                      { label: 'Not Interested', value: 'NOT_INTERESTED' },
                      { label: 'Inactive', value: 'INACTIVE' },
                    ].map(st => (
                      <TouchableOpacity
                        key={st.value}
                        style={[
                          styles.modalChip,
                          selectedFilter === st.value && styles.modalChipSelected,
                        ]}
                        onPress={() => setSelectedFilter(st.value as FilterChipType)}
                      >
                        <Text
                          style={[
                            styles.modalChipText,
                            selectedFilter === st.value && styles.modalChipTextSelected,
                          ]}
                        >
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Category Section */}
                  <Text style={styles.filterSectionTitle}>Category</Text>
                  <View style={styles.filterGrid}>
                    {CATEGORIES.map(cat => {
                      const catVal = cat === 'All Categories' ? 'ALL' : cat;
                      const isSel = selectedCategory === catVal;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.modalChip, isSel && styles.modalChipSelected]}
                          onPress={() => setSelectedCategory(catVal)}
                        >
                          <Text style={[styles.modalChipText, isSel && styles.modalChipTextSelected]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Sort By Section */}
                  <Text style={styles.filterSectionTitle}>Sort By</Text>
                  {[
                    { label: 'Default (Recent)', value: 'DEFAULT' },
                    { label: 'Business Name (A to Z)', value: 'NAME_ASC' },
                    { label: 'Most Outlets', value: 'OUTLETS_DESC' },
                    { label: 'Most Issues', value: 'ISSUES_DESC' },
                  ].map(sortOpt => {
                    const isSel = sortBy === sortOpt.value;
                    return (
                      <TouchableOpacity
                        key={sortOpt.value}
                        style={[styles.sortRow, isSel && styles.sortRowSelected]}
                        onPress={() => setSortBy(sortOpt.value as SortByType)}
                      >
                        <Text style={[styles.sortLabel, isSel && styles.sortLabelSelected]}>
                          {sortOpt.label}
                        </Text>
                        <Icon
                          name={isSel ? 'radiobox-marked' : 'radiobox-blank'}
                          size={20}
                          color={isSel ? '#1D4ED8' : '#94A3B8'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.filterModalFooter}>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={handleResetFilters}
                  >
                    <Text style={styles.resetButtonText}>Reset All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyButton}
                    onPress={() => setShowFilterModal(false)}
                  >
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topHeader: {
    height: 64,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  hamburgerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerLogo: {
    width: 40,
    height: 40,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  profileCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#DBEAFE',
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  /* Title & Add Vendor Row */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  titleTextCol: {
    flex: 1,
    marginRight: 12,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  addVendorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  addVendorIcon: {
    marginRight: 4,
  },
  addVendorButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  /* Search & Filter Row */
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  filterButton: {
    width: 46,
    height: 46,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  activeFilterBadgeDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  /* Filter Chips */
  chipsContainer: {
    marginBottom: 14,
  },
  chipsScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#1D4ED8',
  },
  chipUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownChip: {
    paddingRight: 10,
  },
  chipText: {
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipTextUnselected: {
    color: '#475569',
    fontWeight: '500',
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  /* FlatList Content */
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  /* Filter Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  filterModalHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeIconBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  filterModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
    marginTop: 8,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalChipSelected: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  modalChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  modalChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  sortRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  sortLabel: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  sortLabelSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  filterModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

