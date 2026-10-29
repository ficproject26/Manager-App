import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { FICAvatar } from '../../components/ui/FICAvatar';
import { ASSETS } from '../../assets/logo';

export interface DrawerContentProps {
  currentRoute: string;
  onNavigate: (routeName: string) => void;
}

export interface DrawerItemConfig {
  key: string;
  label: string;
  iconName: string;
  badge?: string;
}

export interface DrawerSectionConfig {
  sectionTitle?: string;
  items: DrawerItemConfig[];
}

export const DRAWER_SECTIONS: DrawerSectionConfig[] = [
  {
    items: [
      { key: 'Dashboard', label: 'Home / Dashboard', iconName: 'view-dashboard-outline' },
      { key: 'Tasks', label: 'Tasks', iconName: 'checkbox-marked-circle-outline' },
    ],
  },
  {
    sectionTitle: 'TERRITORY DIRECTORIES',
    items: [
      {
        key: 'Vendors',
        label: 'Vendor Directory',
        iconName: 'storefront-outline',
        badge: 'Merchants',
      },
      {
        key: 'FieldManagers',
        label: 'Manager Directory',
        iconName: 'account-tie-outline',
        badge: 'Supervisors',
      },
      {
        key: 'FieldAgents',
        label: 'Agent Directory',
        iconName: 'account-group-outline',
        badge: 'Ground Force',
      },
    ],
  },
  {
    sectionTitle: 'REPORTS & PERFORMANCE',
    items: [
      { key: 'Reports', label: 'Daily & Field Reports', iconName: 'file-document-outline' },
      { key: 'SubordinateReports', label: 'Subordinate Reports', iconName: 'chart-box-outline' },
      { key: 'Leaderboard', label: 'Territory Leaderboard', iconName: 'trophy-outline' },
    ],
  },
  {
    sectionTitle: 'MANAGEMENT & SETTINGS',
    items: [
      { key: 'Issues', label: 'Issues & Escalations', iconName: 'alert-circle-outline' },
      { key: 'Notifications', label: 'Notifications', iconName: 'bell-outline' },
      { key: 'Profile', label: 'My Profile', iconName: 'account-outline' },
      { key: 'Settings', label: 'Settings', iconName: 'cog-outline' },
    ],
  },
];

// Flat export for backwards compatibility
export const DRAWER_MENU_ITEMS = DRAWER_SECTIONS.flatMap(section =>
  section.items.map(item => ({
    key: item.key,
    label: item.label,
    icon: item.iconName,
  }))
);

export const DrawerContent: React.FC<DrawerContentProps> = ({ currentRoute, onNavigate }) => {
  const { manager, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const loadUnreadCount = async () => {
      try {
        const count = await services.notificationRepository.getUnreadCount(manager?.id || 'mgr-001');
        if (isMounted) {
          setUnreadCount(count);
        }
      } catch {
        // Ignore failure
      }
    };
    loadUnreadCount();
    return () => {
      isMounted = false;
    };
  }, [manager, currentRoute]);

  const territoryScope =
    manager?.territoryName ||
    (manager?.stateId === 'st-tn-01' ? 'Tamil Nadu' : 'Indore District');

  return (
    <View style={styles.container}>
      {/* Top Brand Logo Bar */}
      <View style={styles.brandBar}>
        <Image
          source={ASSETS.logo}
          style={styles.brandLogo}
          resizeMode="contain"
          accessibilityLabel="Forge India Connect Logo"
        />
      </View>

      {/* Header Profile Summary */}
      <View style={styles.header}>
        <FICAvatar name={manager?.name || 'Manager'} size={48} />
        <View style={styles.profileText}>
          <Text style={styles.name} numberOfLines={1}>
            {manager?.name || 'Manager'}
          </Text>
          <Text style={styles.role}>
            {manager?.role ? String(manager.role).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'FIELD MANAGER'}
          </Text>
          <Text style={styles.territoryScopeText} numberOfLines={1}>
            📍 {territoryScope}
          </Text>
        </View>
      </View>

      {/* Navigation Sections */}
      <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
        {DRAWER_SECTIONS.map((section, sIdx) => (
          <View key={`section-${sIdx}`} style={styles.sectionContainer}>
            {section.sectionTitle ? (
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitleText}>{section.sectionTitle}</Text>
              </View>
            ) : null}

            {section.items.map(item => {
              const isActive = currentRoute === item.key;
              const isNotificationItem = item.key === 'Notifications';
              const isDirectorySection = section.sectionTitle === 'TERRITORY DIRECTORIES';

              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.menuItem,
                    isActive && styles.activeItem,
                    isDirectorySection && styles.directoryItem,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => onNavigate(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      isActive && styles.activeIconCircle,
                      isDirectorySection && !isActive && styles.directoryIconCircle,
                    ]}
                  >
                    <Icon
                      name={item.iconName}
                      size={20}
                      color={
                        isActive
                          ? '#FFFFFF'
                          : isDirectorySection
                          ? '#1D4ED8'
                          : '#475569'
                      }
                    />
                  </View>

                  <View style={styles.itemTextCol}>
                    <Text style={[styles.itemLabel, isActive && styles.activeLabel]}>
                      {item.label}
                    </Text>
                  </View>

                  {item.badge && !isActive ? (
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagBadgeText}>{item.badge}</Text>
                    </View>
                  ) : null}

                  {isNotificationItem && unreadCount > 0 ? (
                    <View style={styles.badgeCircle}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  ) : null}

                  <Icon
                    name="chevron-right"
                    size={16}
                    color={isActive ? '#1D4ED8' : '#CBD5E1'}
                    style={styles.chevron}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer Logout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.75}
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Icon name="logout" size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  brandBar: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: theme.spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandLogo: {
    width: 150,
    height: 38,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B4A8B',
    borderBottomWidth: 1,
    borderBottomColor: '#07325F',
  },
  profileText: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  role: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F2A900',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  territoryScopeText: {
    fontSize: 11,
    color: '#E2E8F0',
    marginTop: 2,
  },
  menuList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sectionContainer: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitleText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 1,
    borderRadius: 10,
  },
  directoryItem: {
    backgroundColor: '#FAFCFF',
  },
  activeItem: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 3,
    borderLeftColor: '#1D4ED8',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  directoryIconCircle: {
    backgroundColor: '#DBEAFE',
  },
  activeIconCircle: {
    backgroundColor: '#1D4ED8',
  },
  itemTextCol: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  activeLabel: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  tagBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badgeCircle: {
    backgroundColor: '#EF4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: 4,
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
});

