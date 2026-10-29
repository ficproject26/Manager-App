import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { Activity } from '../../types';
import { DashboardSummaryData } from '../../services/repositories/IDashboardRepository';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICAvatar } from '../../components/ui/FICAvatar';
import { ASSETS } from '../../assets/logo';

const assets: any = ASSETS;

export interface DashboardScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [summary, setSummary] = useState<DashboardSummaryData | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setError(null);
    try {
      const managerId = manager?.id || 'mgr-000';
      const [summaryRes, activityRes] = await Promise.all([
        services.dashboardRepository.getDashboardSummary(managerId),
        services.dashboardRepository.getRecentActivities(managerId, 5),
      ]);
      setSummary(summaryRes);
      setActivities(activityRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [manager]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData(true);
  };

  const getActivityVisuals = (act: Activity, index: number) => {
    if (index === 0) {
      return {
        bg: '#EFF6FF',
        color: '#2563EB',
        iconName: 'account-multiple-outline',
        title: 'New vendor request received',
        subtitle: act.entityName || 'Sri Foods - Tamil Nadu East',
        time: '10:24 AM',
      };
    } else if (index === 1) {
      return {
        bg: '#ECFDF5',
        color: '#10B981',
        iconName: 'check-circle-outline',
        title: 'KYC approved',
        subtitle: act.entityName || 'ABC Traders - Tamil Nadu West',
        time: '09:18 AM',
      };
    } else if (index === 2) {
      return {
        bg: '#FFFBEB',
        color: '#F59E0B',
        iconName: 'handshake-outline',
        title: 'New tie-up created',
        subtitle: act.entityName || 'Fresh Mart - Tamil Nadu North',
        time: '12:30 PM',
      };
    } else if (index === 3) {
      return {
        bg: '#FEF2F2',
        color: '#EF4444',
        iconName: 'alert-circle-outline',
        title: 'Issue escalated',
        subtitle: act.entityName || 'Payment delay - Tamil Nadu South',
        time: '02:00 PM',
      };
    } else {
      return {
        bg: '#F5F3FF',
        color: '#8B5CF6',
        iconName: 'file-document-outline',
        title: 'Manager report submitted',
        subtitle: act.entityName || 'Division A - Krishnagiri',
        time: '04:30 PM',
      };
    }
  };

  if (isLoading && !isRefreshing) {
    return <FICLoadingState message="Loading dashboard..." />;
  }

  if (error) {
    return <FICErrorState title="Dashboard Failure" message={error} onRetry={() => loadDashboardData()} />;
  }

  const managerDisplayName = manager?.name || 'Manager';
  const managerDisplayRole = manager?.role
    ? manager.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\bManager\b/i, 'Manager')
    : 'Manager';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* TOP BRANDING & PROFILE BAR */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.hamburgerButton}
            activeOpacity={0.7}
            onPress={onOpenDrawer}
            accessibilityLabel="Open Navigation Menu"
            accessibilityRole="button"
          >
            <Icon name="menu" size={26} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={styles.bellButton}
            activeOpacity={0.7}
            onPress={() => onNavigateRoute && onNavigateRoute('Notifications')}
            accessibilityLabel="Notifications"
          >
            <Icon name="bell-outline" size={24} color="#0F172A" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.profileCircleButton}
            activeOpacity={0.7}
            onPress={() => onNavigateRoute && onNavigateRoute('Profile')}
            accessibilityLabel="User Profile"
            accessibilityRole="button"
          >
            <FICAvatar name={managerDisplayName} size={36} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#1D4ED8']}
            tintColor="#1D4ED8"
          />
        }
      >
        {/* HERO BANNER - Cultural Landmarks with Scope Capsule */}
        <View style={styles.heroBannerCard}>
          <Image
            source={assets.tamilNaduBanner}
            style={styles.heroBannerImage}
            resizeMode="cover"
          />

          <View style={styles.heroContent}>
            <View style={styles.heroTextSection}>
              <Text style={styles.heroGreeting}>Good Morning,</Text>
              <Text style={styles.heroName}>{managerDisplayName}!</Text>
              <Text style={styles.heroSubtext}>
                Let's build a stronger{'\n'}Tamil Nadu together.
              </Text>
            </View>

            <View style={styles.scopeCapsule}>
              <Text style={styles.locationPin}>📍</Text>
              <Text style={styles.scopeTextBold}>Tamil Nadu</Text>
              <Text style={styles.scopeSeparator}>›</Text>
              <Text style={styles.scopeText}>All Districts</Text>
              <Text style={styles.scopeSeparator}>›</Text>
              <Text style={styles.scopeText}>All Divisions</Text>
              <Text style={styles.scopeSeparator}>›</Text>
              <Text style={styles.scopeText}>All Pincodes</Text>
            </View>
          </View>
        </View>

        {/* 4 METRIC KPI CARDS - 2x2 Grid */}
        <View style={styles.kpiGrid}>
          {/* Card 1: Total Managers */}
          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('FieldManagers')}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="account-group-outline" size={24} color="#2563EB" />
            </View>
            <View style={styles.kpiRightCol}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiTitle}>Total Managers</Text>
                <Icon name="chevron-right" size={16} color="#94A3B8" />
              </View>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiNumber}>{summary?.managerCount || 13}</Text>
                <View style={styles.growthBadgeCol}>
                  <Text style={styles.growthTextPositive}>↑ 7.7%</Text>
                  <Text style={styles.growthVsText}>vs last month</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 2: Total Vendors */}
          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('Vendors')}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="storefront-outline" size={24} color="#059669" />
            </View>
            <View style={styles.kpiRightCol}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiTitle}>Total Vendors</Text>
                <Icon name="chevron-right" size={16} color="#94A3B8" />
              </View>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiNumber}>{summary?.vendorCount || 248}</Text>
                <View style={styles.growthBadgeCol}>
                  <Text style={styles.growthTextPositive}>↑ 12.4%</Text>
                  <Text style={styles.growthVsText}>vs last month</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 3: Active Outlets */}
          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('Vendors')}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Icon name="store-marker-outline" size={24} color="#D97706" />
            </View>
            <View style={styles.kpiRightCol}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiTitle}>Active Outlets</Text>
                <Icon name="chevron-right" size={16} color="#94A3B8" />
              </View>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiNumber}>{summary?.activeOutletsCount || 186}</Text>
                <View style={styles.growthBadgeCol}>
                  <Text style={styles.growthTextPositive}>↑ 9.1%</Text>
                  <Text style={styles.growthVsText}>vs last month</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 4: Unresolved Issues */}
          <TouchableOpacity
            style={styles.kpiCard}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('Issues')}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Icon name="alert-circle-outline" size={24} color="#DC2626" />
            </View>
            <View style={styles.kpiRightCol}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiTitle}>Unresolved Issues</Text>
                <Icon name="chevron-right" size={16} color="#94A3B8" />
              </View>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiNumber}>{summary?.openIssueCount || 8}</Text>
                <View style={styles.growthBadgeCol}>
                  <Text style={[styles.growthTextPositive, { color: '#DC2626' }]}>High Priority</Text>
                  <Text style={styles.growthVsText}>requires action</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Quick Actions</Text>
        </View>

        <View style={styles.quickActionsGrid}>
          {/* Onboard Merchant */}
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: '#EFF6FF' }]}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('AddVendor')}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#2563EB' }]}>
              <Icon name="store-plus" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickActionLabelRow}>
              <Text style={styles.quickActionTitle}>Onboard Merchant</Text>
              <Icon name="chevron-right" size={14} color="#2563EB" style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>

          {/* Daily Report */}
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: '#F5F3FF' }]}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('DailyReport')}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#8B5CF6' }]}>
              <Icon name="file-document-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickActionLabelRow}>
              <Text style={styles.quickActionTitle}>Daily Report</Text>
              <Icon name="chevron-right" size={14} color="#7C3AED" style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>

          {/* Tasks */}
          <TouchableOpacity
            style={[styles.quickActionCard, { backgroundColor: '#ECFDF5' }]}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('Tasks')}
          >
            <View style={[styles.quickActionIconCircle, { backgroundColor: '#10B981' }]}>
              <Icon name="checkbox-marked-circle-outline" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.quickActionLabelRow}>
              <Text style={styles.quickActionTitle}>Tasks</Text>
              <Icon name="chevron-right" size={14} color="#059669" style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* TERRITORY DIRECTORIES - Vendor, Manager & Agent Directories Separated */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Territory Directories</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenDrawer}
          >
            <Text style={styles.viewAllText}>Menu ☰</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.directoriesRow}>
          {/* Vendor Directory */}
          <TouchableOpacity
            style={styles.directoryCard}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('Vendors')}
            accessibilityRole="button"
            accessibilityLabel="Vendor Directory"
          >
            <View style={[styles.directoryIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="storefront-outline" size={24} color="#2563EB" />
            </View>
            <Text style={styles.directoryCardTitle} numberOfLines={1}>Vendors</Text>
            <Text style={styles.directoryCardSubtitle} numberOfLines={1}>Merchant Outlets</Text>
            <View style={styles.directoryCardPill}>
              <Text style={styles.directoryCardPillText}>240+ Outlets</Text>
              <Icon name="chevron-right" size={12} color="#1D4ED8" />
            </View>
          </TouchableOpacity>

          {/* Manager Directory */}
          <TouchableOpacity
            style={styles.directoryCard}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('FieldManagers')}
            accessibilityRole="button"
            accessibilityLabel="Manager Directory"
          >
            <View style={[styles.directoryIconCircle, { backgroundColor: '#F5F3FF' }]}>
              <Icon name="account-tie-outline" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.directoryCardTitle} numberOfLines={1}>Managers</Text>
            <Text style={styles.directoryCardSubtitle} numberOfLines={1}>Supervisors & Peers</Text>
            <View style={[styles.directoryCardPill, { backgroundColor: '#F5F3FF' }]}>
              <Text style={[styles.directoryCardPillText, { color: '#7C3AED' }]}>13 Managers</Text>
              <Icon name="chevron-right" size={12} color="#7C3AED" />
            </View>
          </TouchableOpacity>

          {/* Agent Directory */}
          <TouchableOpacity
            style={styles.directoryCard}
            activeOpacity={0.8}
            onPress={() => onNavigateRoute && onNavigateRoute('FieldAgents')}
            accessibilityRole="button"
            accessibilityLabel="Agent Directory"
          >
            <View style={[styles.directoryIconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="account-group-outline" size={24} color="#059669" />
            </View>
            <Text style={styles.directoryCardTitle} numberOfLines={1}>Field Agents</Text>
            <Text style={styles.directoryCardSubtitle} numberOfLines={1}>Ground Workforce</Text>
            <View style={[styles.directoryCardPill, { backgroundColor: '#ECFDF5' }]}>
              <Text style={[styles.directoryCardPillText, { color: '#059669' }]}>Active Force</Text>
              <Icon name="chevron-right" size={12} color="#059669" />
            </View>
          </TouchableOpacity>
        </View>

        {/* TODAY'S ACTIVITIES */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Today's Activities</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onNavigateRoute && onNavigateRoute('Reports')}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityListCard}>
          {activities.map((act, index) => {
            const visual = getActivityVisuals(act, index);
            const isLast = index === activities.length - 1;
            return (
              <TouchableOpacity
                key={act.id || `act-${index}`}
                style={[styles.activityItemRow, !isLast && styles.activityItemBorder]}
                activeOpacity={0.7}
                onPress={() => onNavigateRoute && onNavigateRoute('Reports')}
              >
                <View style={[styles.activityIconCircle, { backgroundColor: visual.bg }]}>
                  <Icon name={visual.iconName} size={18} color={visual.color} />
                </View>
                <View style={styles.activityTextCol}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {visual.title}
                  </Text>
                  <Text style={styles.activitySubtitle} numberOfLines={1}>
                    {visual.subtitle}
                  </Text>
                </View>
                <View style={styles.activityRightMeta}>
                  <Text style={styles.activityTimeText}>{visual.time}</Text>
                  <Icon name="chevron-right" size={16} color="#94A3B8" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* BOTTOM PROMOTIONAL BANNER */}
        <View style={styles.bottomPromoCard}>
          <Image
            source={assets.empoweringBanner}
            style={styles.bottomPromoBackground}
            resizeMode="cover"
          />
          <View style={styles.bottomPromoOverlayContent}>
            {/* Ascending Golden Bars */}
            <View style={styles.chartBarsGroup}>
              <View style={[styles.chartBar, { height: 14 }]} />
              <View style={[styles.chartBar, { height: 20 }]} />
              <View style={[styles.chartBar, { height: 26 }]} />
              <View style={[styles.chartBar, { height: 32 }]} />
            </View>

            <View style={styles.bottomPromoLeft}>
              <Text style={styles.promoSmallTag}>Together for a Stronger India</Text>
              <Text style={styles.promoBigHeading}>Empowering Local Businesses</Text>
              <Text style={styles.promoFooterTag}>Building a Brighter Tomorrow</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hamburgerButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  /* Hero Banner */
  heroBannerCard: {
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    backgroundColor: '#E0F2FE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  heroBannerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  heroContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroTextSection: {
    maxWidth: '85%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  heroName: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  heroSubtext: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
  },
  scopeCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  locationPin: {
    fontSize: 11,
    marginRight: 4,
  },
  scopeTextBold: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  scopeSeparator: {
    fontSize: 11,
    color: '#64748B',
    marginHorizontal: 4,
  },
  scopeText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  /* KPI 2x2 Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kpiCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  kpiIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiRightCol: {
    flex: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  kpiNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  growthBadgeCol: {
    alignItems: 'flex-end',
  },
  growthTextPositive: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  growthVsText: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  /* Quick Actions */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionCard: {
    width: '31%',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  /* Territory Directories Cards */
  directoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  directoryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  directoryIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  directoryCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  directoryCardSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 6,
  },
  directoryCardPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  directoryCardPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
    marginRight: 2,
  },
  /* Activities */
  activityListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  activityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  activityIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityTextCol: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  activityRightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  activityTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  /* Bottom Promo Card */
  bottomPromoCard: {
    height: 80,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 10,
  },
  bottomPromoBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bottomPromoOverlayContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  chartBarsGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 34,
    marginRight: 12,
  },
  chartBar: {
    width: 6,
    backgroundColor: '#F59E0B',
    borderRadius: 3,
    marginRight: 3,
  },
  bottomPromoLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  promoSmallTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  promoBigHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 1,
  },
  promoFooterTag: {
    fontSize: 10,
    fontWeight: '500',
    color: '#B45309',
  },
});
