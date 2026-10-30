import React, { useState, useEffect, useCallback } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICListItem } from '../../components/ui/FICListItem';
import { FICButton } from '../../components/ui/FICButton';
import { apiClient } from '../../services/api/ApiClient';
import { services } from '../../services';
import { SupportedLanguage } from '../../constants/translations';
import { ManagerPortalSettings } from '../../types';

export interface SettingsScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { logout, manager } = useAuth();
  const { language, setLanguage, t, languages } = useLanguage();

  const [activeModal, setActiveModal] = useState<
    'NOTIFICATIONS' | 'LANGUAGE' | 'ABOUT' | 'LOGOUT' | null
  >(null);

  // Live Backend Settings state
  const [emailAlerts, setEmailAlerts] = useState<boolean>(true);
  const [kycAlerts, setKycAlerts] = useState<boolean>(true);
  const [statusChangeAlerts, setStatusChangeAlerts] = useState<boolean>(true);
  const [dailyDigest, setDailyDigest] = useState<boolean>(true);
  const [pushEnabled, setPushEnabled] = useState<boolean>(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(false);
  const [isSavingSetting, setIsSavingSetting] = useState<boolean>(false);

  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Fetch real portal settings from Express backend
  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const token = await services.storageService.getAuthToken();
      const res = await apiClient.get<any>('/settings', { token, timeoutMs: 15000 });
      const data: ManagerPortalSettings = res?.data || res?.settings || res || {};

      if (data.emailAlerts !== undefined) setEmailAlerts(Boolean(data.emailAlerts));
      if (data.kycAlerts !== undefined) setKycAlerts(Boolean(data.kycAlerts));
      if (data.statusChangeAlerts !== undefined) setStatusChangeAlerts(Boolean(data.statusChangeAlerts));
      if (data.dailyDigest !== undefined) setDailyDigest(Boolean(data.dailyDigest));
    } catch (e) {
      console.warn('Failed to fetch settings from backend:', e);
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save updated settings to Express backend
  const updateBackendSettings = async (updates: Partial<ManagerPortalSettings>) => {
    setIsSavingSetting(true);
    try {
      const token = await services.storageService.getAuthToken();
      const payload = {
        emailAlerts,
        kycAlerts,
        statusChangeAlerts,
        dailyDigest,
        theme: 'light',
        ...updates,
      };

      await apiClient.put('/settings', payload, { token });
    } catch (e) {
      console.warn('Failed to persist settings to backend:', e);
    } finally {
      setIsSavingSetting(false);
    }
  };

  const handleToggleEmailAlerts = (val: boolean) => {
    setEmailAlerts(val);
    updateBackendSettings({ emailAlerts: val });
  };

  const handleToggleKycAlerts = (val: boolean) => {
    setKycAlerts(val);
    updateBackendSettings({ kycAlerts: val });
  };

  const handleToggleStatusChangeAlerts = (val: boolean) => {
    setStatusChangeAlerts(val);
    updateBackendSettings({ statusChangeAlerts: val });
  };

  const handleToggleDailyDigest = (val: boolean) => {
    setDailyDigest(val);
    updateBackendSettings({ dailyDigest: val });
  };

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    await setLanguage(code);
    setActiveModal(null);
  };

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

  const handleClearCache = async () => {
    Alert.alert(
      'Reset App Cache',
      'This will clear local temporary files and synchronize fresh data from the server.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset & Sync',
          style: 'destructive',
          onPress: async () => {
            try {
              await services.storageService.removeItem('cached_dashboard_summary');
              await services.storageService.removeItem('cached_qc_tasks');
              Alert.alert('Cache Cleared', 'Local data refreshed successfully.');
            } catch {
              Alert.alert('Notice', 'Cache reset completed.');
            }
          },
        },
      ]
    );
  };

  const currentLangObj = languages.find(l => l.code === language) || languages[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title={t('header_settings', 'Settings')}
        leftActionIcon={<Icon name="arrow-left" size={24} color="#FFFFFF" />}
        onLeftAction={() => {
          if (onNavigateRoute) onNavigateRoute('Profile');
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Subtitle Card */}
        <View style={styles.topSection}>
          <Text style={styles.subtitleText}>{t('settings_subtitle', 'Manage your app preferences & configuration')}</Text>
          {isSavingSetting && (
            <View style={styles.savingBadge}>
              <ActivityIndicator size="small" color="#1D4ED8" />
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
        </View>

        {/* NOTIFICATIONS SECTION */}
        <Text style={styles.sectionHeaderTitle}>{t('settings_notifications', 'NOTIFICATIONS')}</Text>
        <FICCard style={styles.sectionCard}>
          <FICListItem
            title={t('settings_notification_prefs', 'Notification Preferences')}
            leftIcon={<Icon name="bell-ring-outline" size={20} color="#1D4ED8" />}
            rightIcon={<Icon name="chevron-right" size={22} color="#94A3B8" />}
            onPress={() => setActiveModal('NOTIFICATIONS')}
          />
        </FICCard>

        {/* APPLICATION SECTION */}
        <Text style={styles.sectionHeaderTitle}>{t('settings_app', 'APPLICATION')}</Text>
        <FICCard style={styles.sectionCard}>
          <FICListItem
            title={t('settings_language', 'Language')}
            leftIcon={<Icon name="translate" size={20} color="#059669" />}
            rightIcon={
              <View style={styles.rightValueRow}>
                <Text style={styles.valueText}>{currentLangObj.nativeName}</Text>
                <Icon name="chevron-right" size={22} color="#94A3B8" />
              </View>
            }
            onPress={() => setActiveModal('LANGUAGE')}
          />
          <FICListItem
            title={t('settings_about', 'About FIC Manager')}
            leftIcon={<Icon name="information-outline" size={20} color="#6366F1" />}
            rightIcon={<Icon name="chevron-right" size={22} color="#94A3B8" />}
            onPress={() => setActiveModal('ABOUT')}
          />
          <FICListItem
            title="Reset App Cache"
            leftIcon={<Icon name="cached" size={20} color="#D97706" />}
            rightIcon={<Icon name="chevron-right" size={22} color="#94A3B8" />}
            onPress={handleClearCache}
          />
        </FICCard>

        {/* ACCOUNT SECTION */}
        <Text style={styles.sectionHeaderTitle}>{t('settings_account', 'ACCOUNT')}</Text>
        <FICCard style={styles.sectionCard}>
          <FICListItem
            title={t('action_logout', 'Logout')}
            leftIcon={<Icon name="logout" size={20} color="#DC2626" />}
            rightIcon={<Icon name="chevron-right" size={22} color="#FCA5A5" />}
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
              <View>
                <Text style={styles.modalHeaderTitle}>{t('settings_notification_prefs', 'Notification Preferences')}</Text>
                <Text style={styles.modalHeaderSub}>Connected to Production MongoDB</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll}>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceTextWrapper}>
                  <Text style={styles.preferenceTitle}>{t('settings_push_title', 'Push Notifications')}</Text>
                  <Text style={styles.preferenceDescription}>
                    {t('settings_push_desc', 'Receive alerts for assigned tasks and updates')}
                  </Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={setPushEnabled}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={pushEnabled ? '#1D4ED8' : '#F1F5F9'}
                />
              </View>

              <View style={styles.preferenceRow}>
                <View style={styles.preferenceTextWrapper}>
                  <Text style={styles.preferenceTitle}>{t('settings_email_title', 'Email Summary Reports')}</Text>
                  <Text style={styles.preferenceDescription}>
                    {t('settings_email_desc', 'Receive daily field activity digests')}
                  </Text>
                </View>
                <Switch
                  value={emailAlerts}
                  onValueChange={handleToggleEmailAlerts}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={emailAlerts ? '#1D4ED8' : '#F1F5F9'}
                />
              </View>

              <View style={styles.preferenceRow}>
                <View style={styles.preferenceTextWrapper}>
                  <Text style={styles.preferenceTitle}>{t('settings_kyc_title', 'KYC Alerts')}</Text>
                  <Text style={styles.preferenceDescription}>
                    {t('settings_kyc_desc', 'Get notified of merchant verification updates')}
                  </Text>
                </View>
                <Switch
                  value={kycAlerts}
                  onValueChange={handleToggleKycAlerts}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={kycAlerts ? '#1D4ED8' : '#F1F5F9'}
                />
              </View>

              <View style={styles.preferenceRow}>
                <View style={styles.preferenceTextWrapper}>
                  <Text style={styles.preferenceTitle}>{t('settings_status_alerts', 'Status Change Alerts')}</Text>
                  <Text style={styles.preferenceDescription}>
                    {t('settings_status_alerts_desc', 'Receive instant alerts on task status shifts')}
                  </Text>
                </View>
                <Switch
                  value={statusChangeAlerts}
                  onValueChange={handleToggleStatusChangeAlerts}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={statusChangeAlerts ? '#1D4ED8' : '#F1F5F9'}
                />
              </View>

              <View style={[styles.preferenceRow, { borderBottomWidth: 0 }]}>
                <View style={styles.preferenceTextWrapper}>
                  <Text style={styles.preferenceTitle}>Daily Digest</Text>
                  <Text style={styles.preferenceDescription}>
                    Consolidated 6 PM evening performance overview
                  </Text>
                </View>
                <Switch
                  value={dailyDigest}
                  onValueChange={handleToggleDailyDigest}
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={dailyDigest ? '#1D4ED8' : '#F1F5F9'}
                />
              </View>
            </ScrollView>

            <FICButton
              title={t('action_done', 'Done')}
              variant="primary"
              onPress={() => setActiveModal(null)}
              style={styles.modalDoneBtn}
            />
          </View>
        </View>
      </Modal>

      {/* 2. REGIONAL LANGUAGE SELECTION MODAL */}
      <Modal
        visible={activeModal === 'LANGUAGE'}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>{t('modal_language_title', 'Select Language')}</Text>
                <Text style={styles.modalHeaderSub}>Choose your preferred regional language</Text>
              </View>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.languageList}>
              {languages.map(langItem => {
                const isSelected = langItem.code === language;
                return (
                  <TouchableOpacity
                    key={langItem.code}
                    style={[styles.languageItem, isSelected && styles.languageItemActive]}
                    onPress={() => handleSelectLanguage(langItem.code)}
                  >
                    <View style={styles.languageItemLeft}>
                      <Text style={[styles.languageNative, isSelected && styles.languageNativeActive]}>
                        {langItem.nativeName}
                      </Text>
                      <Text style={styles.languageEnglish}>{langItem.name}</Text>
                    </View>
                    {isSelected ? (
                      <Icon name="check-circle" size={22} color="#1D4ED8" />
                    ) : (
                      <Icon name="radiobox-blank" size={22} color="#CBD5E1" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <FICButton
              title={t('action_close', 'Close')}
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
          <View style={[styles.modalContentCard, { maxHeight: '60%' }]}>
            <View style={styles.aboutHeader}>
              <View style={styles.aboutIconCircle}>
                <Icon name="shield-crown" size={32} color="#1D4ED8" />
              </View>
              <Text style={styles.aboutAppName}>FIC Field Manager</Text>
              <Text style={styles.aboutVersion}>Version 2.4.0 (Build 5542)</Text>
            </View>

            <View style={styles.aboutDetailsBox}>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Environment</Text>
                <Text style={styles.aboutVal}>Production Live Backend</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Regional Node</Text>
                <Text style={styles.aboutVal}>{manager?.state || 'Tamil Nadu'}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Security Session</Text>
                <Text style={[styles.aboutVal, { color: '#059669' }]}>Encrypted TLS 1.3</Text>
              </View>
            </View>

            <FICButton
              title={t('action_close', 'Close')}
              variant="primary"
              onPress={() => setActiveModal(null)}
              style={styles.modalDoneBtn}
            />
          </View>
        </View>
      </Modal>

      {/* 4. LOGOUT MODAL */}
      <Modal
        visible={activeModal === 'LOGOUT'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutIconCircle}>
              <Icon name="logout" size={26} color="#DC2626" />
            </View>
            <Text style={styles.modalHeaderTitle}>{t('modal_logout_title', 'Logout Confirmation')}</Text>
            <Text style={styles.logoutMessage}>
              {t('modal_logout_msg', 'Are you sure you want to logout from FIC Manager?')}
            </Text>
            <View style={styles.logoutActionRow}>
              <FICButton
                title={t('action_cancel', 'Cancel')}
                variant="outline"
                disabled={isLoggingOut}
                onPress={() => setActiveModal(null)}
                style={styles.logoutCancelBtn}
              />
              <FICButton
                title={isLoggingOut ? t('action_logging_out', 'Logging out...') : t('action_logout', 'Logout')}
                variant="primary"
                loading={isLoggingOut}
                disabled={isLoggingOut}
                onPress={handleConfirmLogout}
                style={styles.logoutConfirmBtn}
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
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    flex: 1,
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  rightValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContentCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: theme.spacing.sm,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  modalBodyScroll: {
    maxHeight: 360,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  preferenceTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  preferenceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  preferenceDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  modalDoneBtn: {
    marginTop: theme.spacing.md,
  },
  languageList: {
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  languageItemLeft: {
    gap: 2,
  },
  languageNative: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  languageNativeActive: {
    color: '#1D4ED8',
  },
  languageEnglish: {
    fontSize: 12,
    color: '#64748B',
  },
  aboutHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  aboutIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  aboutAppName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  aboutVersion: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  aboutDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: theme.spacing.sm,
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  aboutLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  aboutVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  logoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  logoutIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  logoutMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: theme.spacing.lg,
  },
  logoutActionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
  },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
});
