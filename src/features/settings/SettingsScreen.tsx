import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICListItem } from '../../components/ui/FICListItem';
import { FICButton } from '../../components/ui/FICButton';

export interface SettingsScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { logout } = useAuth();

  // Settings modals / views
  const [activeModal, setActiveModal] = useState<
    'NOTIFICATIONS' | 'LANGUAGE' | 'ABOUT' | 'LOGOUT' | null
  >(null);

  // Simple UI state for Notification Preferences
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState<boolean>(true);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      Alert.alert('Logout Error', 'Unable to complete logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
      setActiveModal(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Settings"
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Subtitle Card */}
        <View style={styles.topSection}>
          <Text style={styles.subtitleText}>Manage your app preferences</Text>
        </View>

        {/* NOTIFICATIONS SECTION */}
        <Text style={styles.sectionHeaderTitle}>NOTIFICATIONS</Text>
        <FICCard style={styles.sectionCard}>
          <FICListItem
            title="Notification Preferences"
            rightIcon={<Text style={styles.chevronIcon}>›</Text>}
            onPress={() => setActiveModal('NOTIFICATIONS')}
          />
        </FICCard>

        {/* APP SECTION */}
        <Text style={styles.sectionHeaderTitle}>APP</Text>
        <FICCard style={styles.sectionCard}>
          <FICListItem
            title="Language"
            rightIcon={
              <View style={styles.rightValueRow}>
                <Text style={styles.valueText}>English</Text>
                <Text style={styles.chevronIcon}>›</Text>
              </View>
            }
            onPress={() => setActiveModal('LANGUAGE')}
          />
          <FICListItem
            title="About FIC"
            rightIcon={<Text style={styles.chevronIcon}>›</Text>}
            onPress={() => setActiveModal('ABOUT')}
          />
        </FICCard>

        {/* ACCOUNT SECTION */}
        <Text style={styles.sectionHeaderTitle}>ACCOUNT</Text>
        <FICCard style={styles.sectionCard}>
          <FICListItem
            title="Logout"
            leftIcon={<Text style={styles.logoutIcon}>🚪</Text>}
            rightIcon={<Text style={styles.logoutChevron}>›</Text>}
            onPress={() => setActiveModal('LOGOUT')}
          />
        </FICCard>
      </ScrollView>

      {/* 1. NOTIFICATION PREFERENCES MODAL */}
      <Modal
        visible={activeModal === 'NOTIFICATIONS'}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Notification Preferences</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrapper}>
                <Text style={styles.preferenceTitle}>Push Notifications</Text>
                <Text style={styles.preferenceDescription}>
                  Receive operational task and issue updates
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrapper}>
                <Text style={styles.preferenceTitle}>Email Summary Reports</Text>
                <Text style={styles.preferenceDescription}>
                  Receive daily field report digests
                </Text>
              </View>
              <Switch
                value={emailAlertsEnabled}
                onValueChange={setEmailAlertsEnabled}
                trackColor={{ false: theme.colors.disabled, true: theme.colors.primary }}
              />
            </View>

            <FICButton
              title="Done"
              variant="primary"
              onPress={() => setActiveModal(null)}
              style={styles.modalDoneBtn}
            />
          </View>
        </View>
      </Modal>

      {/* 2. LANGUAGE MODAL */}
      <Modal
        visible={activeModal === 'LANGUAGE'}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Supported Language</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.languageOptionActive}>
              <Text style={styles.languageTextActive}>English (Default)</Text>
              <Text style={styles.checkIcon}>✓</Text>
            </View>
            <Text style={styles.languageHintText}>
              Multi-language support for regional Indian languages will be available in upcoming releases.
            </Text>

            <FICButton
              title="Close"
              variant="outline"
              onPress={() => setActiveModal(null)}
              style={styles.modalDoneBtn}
            />
          </View>
        </View>
      </Modal>

      {/* 3. ABOUT MODAL */}
      <Modal
        visible={activeModal === 'ABOUT'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>About FIC</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.aboutBody}>
              <Text style={styles.aboutBrandTitle}>Forge India Connect</Text>
              <Text style={styles.aboutAppTitle}>FIC Manager Mobile App</Text>
              <View style={styles.versionChip}>
                <Text style={styles.versionText}>Version 1.0.0</Text>
              </View>
              <Text style={styles.aboutDescription}>
                Enterprise field operations and territory manager platform for Forge India Connect.
              </Text>
            </View>

            <FICButton
              title="Close"
              variant="outline"
              onPress={() => setActiveModal(null)}
              style={styles.modalDoneBtn}
            />
          </View>
        </View>
      </Modal>

      {/* 4. LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={activeModal === 'LOGOUT'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.logoutIconCircle}>
              <Text style={styles.logoutModalIcon}>🚪</Text>
            </View>

            <Text style={styles.logoutModalTitle}>Logout Confirmation</Text>
            <Text style={styles.logoutModalMessage}>Are you sure you want to logout?</Text>

            <View style={styles.modalActionsRow}>
              <FICButton
                title="Cancel"
                variant="outline"
                disabled={isLoggingOut}
                onPress={() => setActiveModal(null)}
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
  topSection: {
    marginBottom: theme.spacing.md,
  },
  subtitleText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  sectionHeaderTitle: {
    ...theme.typography.caption,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  sectionCard: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  chevronIcon: {
    fontSize: 20,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  rightValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  valueText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: '600',
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutChevron: {
    fontSize: 20,
    color: theme.colors.error,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContentCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.elevation.card,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalHeaderTitle: {
    ...theme.typography.headingSmall,
    color: theme.colors.primary,
  },
  closeIcon: {
    fontSize: 18,
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  preferenceTextWrapper: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  preferenceTitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
  },
  preferenceDescription: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  languageOptionActive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.secondaryLight,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  languageTextActive: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    fontWeight: '700',
  },
  checkIcon: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  languageHintText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  aboutBody: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  aboutBrandTitle: {
    ...theme.typography.headingMedium,
    color: theme.colors.primary,
  },
  aboutAppTitle: {
    ...theme.typography.title,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xxs,
  },
  versionChip: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xxs,
    borderRadius: theme.radius.full,
    marginVertical: theme.spacing.sm,
  },
  versionText: {
    ...theme.typography.caption,
    color: theme.colors.text,
    fontWeight: '700',
  },
  aboutDescription: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  modalDoneBtn: {
    marginTop: theme.spacing.md,
    width: '100%',
  },
  logoutIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  logoutModalIcon: {
    fontSize: 24,
  },
  logoutModalTitle: {
    ...theme.typography.headingMedium,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  logoutModalMessage: {
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
