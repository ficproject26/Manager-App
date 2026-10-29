import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FICHeader } from '../../components/ui/FICHeader';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';

export interface MoreMenuScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();

  const menuItems = [
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      subtitle: 'Territory performance rankings & badges',
      icon: 'trophy-outline',
      iconColor: '#D97706',
      bgColor: '#FFFBEB',
      route: 'Leaderboard',
    },
    {
      id: 'issues',
      title: 'Issues & Grievances',
      subtitle: 'Track payment, KYC, and boundary disputes',
      icon: 'alert-circle-outline',
      iconColor: '#DC2626',
      bgColor: '#FEF2F2',
      route: 'Issues',
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Directives, operational alerts & updates',
      icon: 'bell-outline',
      iconColor: '#2563EB',
      bgColor: '#EFF6FF',
      route: 'Notifications',
    },
    {
      id: 'profile',
      title: 'My Profile',
      subtitle: 'Manager credentials, hierarchy & scope',
      icon: 'account-outline',
      iconColor: '#7C3AED',
      bgColor: '#F5F3FF',
      route: 'Profile',
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences, language & logout',
      icon: 'cog-outline',
      iconColor: '#475569',
      bgColor: '#F1F5F9',
      route: 'Settings',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />

      <FICHeader
        title="More"
        subtitle={manager?.name ? `Logged in as ${manager.name}` : undefined}
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Manager Summary Pill */}
        <TouchableOpacity
          style={styles.managerHeaderCard}
          activeOpacity={0.8}
          onPress={() => onNavigateRoute && onNavigateRoute('Profile')}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(manager?.name || 'M')
                .split(' ')
                .map(n => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.managerMetaCol}>
            <Text style={styles.managerNameText}>{manager?.name || 'Manager'}</Text>
            <Text style={styles.managerRoleText}>
              {String(manager?.role || 'FIELD_MANAGER').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} • {manager?.territoryName || 'Tamil Nadu'}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Modules List */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionHeader}>Operational Tools</Text>

          <View style={styles.menuCard}>
            {menuItems.map((item, index) => {
              const isLast = index === menuItems.length - 1;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.menuItemRow, !isLast && styles.menuItemBorder]}
                  activeOpacity={0.7}
                  onPress={() => onNavigateRoute && onNavigateRoute(item.route)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
                    <Icon name={item.icon} size={22} color={item.iconColor} />
                  </View>

                  <View style={styles.menuTextCol}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>

                  <Icon name="chevron-right" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* System Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>FIC Operational System • v1.0.0</Text>
          <Text style={styles.versionSubtext}>Forge India Connect Territory Operations</Text>
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
  managerHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  managerMetaCol: {
    flex: 1,
  },
  managerNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  managerRoleText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  menuSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  versionSubtext: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
});
