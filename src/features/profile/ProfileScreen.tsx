import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICAvatar } from '../../components/ui/FICAvatar';
import { FICCard } from '../../components/ui/FICCard';
import { FICButton } from '../../components/ui/FICButton';
import { FICDivider } from '../../components/ui/FICDivider';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';

export interface ProfileScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager, isLoading, logout } = useAuth();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Logout Error', 'Unable to complete logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalVisible(false);
    }
  };

  const handleFutureActionPress = (actionName: string) => {
    Alert.alert(
      actionName,
      `${actionName} workflow is controlled by organization settings and will be enabled in a future release.`,
      [{ text: 'OK' }]
    );
  };

  if (isLoading) {
    return <FICLoadingState message="Loading manager profile..." />;
  }

  if (!manager) {
    return (
      <FICErrorState
        title="Unable to load profile"
        message="Authenticated manager information could not be retrieved."
      />
    );
  }

  const roleFormatted = String(manager.role || 'FIELD_MANAGER')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  const employeeIdText = manager.employeeId || 'FM1001';
  const territoryText = manager.territoryName || 'Authorized Territory Scope';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Profile"
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Top Profile Summary Header Card */}
        <FICCard style={styles.profileHeaderCard}>
          <View style={styles.avatarContainer}>
            <FICAvatar name={manager.name || 'Manager'} size={72} />
          </View>
          <Text style={styles.managerName}>{manager.name}</Text>
          <View style={styles.roleChip}>
            <Text style={styles.roleChipText}>{roleFormatted}</Text>
          </View>
          <Text style={styles.employeeIdText}>Employee ID: {employeeIdText}</Text>
        </FICCard>

        {/* Account & Personal Information Card */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>Account Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{manager.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email Address</Text>
            <Text style={styles.infoValue}>{manager.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{manager.phone}</Text>
          </View>
        </FICCard>

        {/* Work & Organization Scope Information Card */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>Work & Territory Scope</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>{employeeIdText}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Role</Text>
            <Text style={styles.infoValue}>{roleFormatted}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Territory Scope</Text>
            <Text style={styles.infoValue}>📍 {territoryText}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Direct Supervisor</Text>
            <Text style={styles.infoValue}>
              {manager.role === 'STATE_MANAGER'
                ? 'K. Venkatesh (Regional Operations Director)'
                : 'Ramesh (State Manager)'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>State Node</Text>
            <Text style={styles.infoValue}>{manager.stateId === 'st-tn-01' ? 'Tamil Nadu' : (manager.stateId || 'Assigned State')}</Text>
          </View>

          {manager.districtId ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>District Node</Text>
              <Text style={styles.infoValue}>{manager.districtId === 'dt-chn-01' ? 'Chennai' : manager.districtId}</Text>
            </View>
          ) : null}

          {manager.status ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Status</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{manager.status}</Text>
              </View>
            </View>
          ) : null}
        </FICCard>

        {/* Profile Action Buttons */}
        <View style={styles.actionsContainer}>
          <FICButton
            title="Edit Profile"
            variant="outline"
            onPress={() => handleFutureActionPress('Edit Profile')}
            style={styles.actionBtn}
          />

          <FICButton
            title="Settings"
            variant="outline"
            onPress={() => onNavigateRoute && onNavigateRoute('Settings')}
            style={styles.actionBtn}
          />

          <FICButton
            title="Logout"
            variant="primary"
            onPress={() => setIsLogoutModalVisible(true)}
            style={styles.logoutBtn}
          />
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIconText}>🚪</Text>
            </View>

            <Text style={styles.modalTitle}>Logout Confirmation</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>

            <View style={styles.modalActionsRow}>
              <FICButton
                title="Cancel"
                variant="outline"
                disabled={isLoggingOut}
                onPress={() => setIsLogoutModalVisible(false)}
                style={styles.modalCancelBtn}
              />

              <FICButton
                title={isLoggingOut ? 'Logging out...' : 'Logout'}
                variant="primary"
                loading={isLoggingOut}
                disabled={isLoggingOut}
                onPress={handleConfirmLogout}
                style={styles.modalConfirmBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: theme.spacing.md,
  },
  profileHeaderCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  managerName: {
    ...theme.typography.headingLarge,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xxs,
  },
  roleChip: {
    backgroundColor: theme.colors.secondaryLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.full,
    marginVertical: theme.spacing.xs,
  },
  roleChipText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  employeeIdText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  sectionHeaderTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: 8,
  },
  infoLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  infoValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    backgroundColor: theme.colors.successLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.sm,
  },
  statusText: {
    ...theme.typography.caption,
    color: theme.colors.success,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  actionBtn: {
    width: '100%',
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.elevation.card,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalIconText: {
    fontSize: 24,
  },
  modalTitle: {
    ...theme.typography.headingMedium,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  modalMessage: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
});
