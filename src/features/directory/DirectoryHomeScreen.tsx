import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { FICHeader } from '../../components/ui/FICHeader';
import { useAuth } from '../../hooks/useAuth';

export interface DirectoryHomeScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const DirectoryHomeScreen: React.FC<DirectoryHomeScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();

  const territoryScopeText =
    manager?.territoryName || (manager?.stateId === 'st-tn-01' ? 'Tamil Nadu Territory' : 'Indore Territory');

  const directoryCards = [
    {
      id: 'vendors',
      title: 'Vendors',
      subtitle: 'Manage merchants within your territory',
      icon: 'storefront-outline',
      iconColor: '#2563EB',
      bgColor: '#EFF6FF',
      badge: 'Merchant Network',
      route: 'Vendors',
      stats: '240+ Outlets',
    },
    {
      id: 'managers',
      title: 'Managers',
      subtitle: 'View peer and subordinate managers',
      icon: 'account-tie-outline',
      iconColor: '#7C3AED',
      bgColor: '#F5F3FF',
      badge: 'Hierarchy',
      route: 'FieldManagers',
      stats: '13 Managers',
    },
    {
      id: 'agents',
      title: 'Field Agents',
      subtitle: 'View assigned field agents',
      icon: 'account-group-outline',
      iconColor: '#059669',
      bgColor: '#ECFDF5',
      badge: 'Ground Force',
      route: 'FieldAgents',
      stats: 'Active Agents',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />

      <FICHeader
        title="Directory Hub"
        subtitle={`Scope: ${territoryScopeText}`}
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner Section */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerIconCircle}>
            <Icon name="card-account-details-outline" size={28} color="#1D4ED8" />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>Territory Directory</Text>
            <Text style={styles.bannerSubtitle}>
              Access authorized vendor partners, field managers, and ground agents for {territoryScopeText}.
            </Text>
          </View>
        </View>

        {/* Directory Modules Cards */}
        <View style={styles.cardsContainer}>
          {directoryCards.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => onNavigateRoute && onNavigateRoute(item.route)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.iconBox, { backgroundColor: item.bgColor }]}>
                  <Icon name={item.icon} size={28} color={item.iconColor} />
                </View>
                <View style={styles.badgeBox}>
                  <Text style={[styles.badgeText, { color: item.iconColor }]}>{item.badge}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardStatsText}>{item.stats}</Text>
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>Open</Text>
                  <Icon name="chevron-right" size={16} color="#1D4ED8" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Territory Scoping Note */}
        <View style={styles.securityBox}>
          <Icon name="shield-check-outline" size={18} color="#059669" style={{ marginRight: 8 }} />
          <Text style={styles.securityText}>
            Data is strictly scoped to your authenticated territory hierarchy ({territoryScopeText}).
          </Text>
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
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerIcon: {
    fontSize: 22,
    color: '#0F172A',
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  bannerIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 3,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: '#3B82F6',
    lineHeight: 18,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  cardStatsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    marginRight: 2,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    lineHeight: 16,
  },
});
