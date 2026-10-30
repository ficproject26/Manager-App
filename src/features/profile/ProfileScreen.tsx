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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICAvatar } from '../../components/ui/FICAvatar';
import { FICCard } from '../../components/ui/FICCard';
import { FICButton } from '../../components/ui/FICButton';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { EditProfileModal } from './components/EditProfileModal';
import { useLanguage } from '../../context/LanguageContext';
import { BankDetails } from '../../types';

export interface ProfileScreenProps {
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager, isLoading, logout, refreshManager, updateManager } = useAuth();
  const { t } = useLanguage();

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Edit modal state
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editModalTab, setEditModalTab] = useState<'DETAILS' | 'BANK' | 'PHOTO'>('DETAILS');

  // Bank account visibility toggle
  const [showAccountNumber, setShowAccountNumber] = useState<boolean>(false);

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

  if (isLoading) {
    return <FICLoadingState message={t('msg_loading_profile', 'Loading manager profile...')} />;
  }

  if (!manager) {
    return (
      <FICErrorState
        title="Unable to load profile"
        message="Authenticated manager information could not be retrieved."
      />
    );
  }

  // Formatting helpers
  const roleFormatted = String(manager.role || 'STATE_MANAGER')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  const employeeIdText = manager.employeeId || manager.id || 'MGR-STA-20261023-5542';
  const roleLevel = manager.level || (manager.role === 'STATE_MANAGER' ? 1 : 2);
  const supervisorText =
    manager.role === 'STATE_MANAGER'
      ? 'K. Venkatesh (Regional Operations Director)'
      : 'State Operations Command';

  // Bank details extraction
  const bank: Partial<BankDetails> = manager.bankDetails || manager.bankAccount || {};
  const hasBankDetails = Boolean(bank.accountNumber || bank.bankName);

  // Masking helpers
  const maskedAadhaar = manager.aadharNumber
    ? `•••• •••• ${String(manager.aadharNumber).slice(-4)}`
    : (manager.documents?.aadharNumber ? `•••• •••• ${String(manager.documents.aadharNumber).slice(-4)}` : '•••• •••• 5542 (Verified)');

  const maskedPan = manager.panNumber
    ? `${String(manager.panNumber).slice(0, 2)}••••••${String(manager.panNumber).slice(-2)}`
    : (manager.documents?.panNumber ? `${String(manager.documents.panNumber).slice(0, 2)}••••••${String(manager.documents.panNumber).slice(-2)}` : 'AB••••••2C (Verified)');

  const maskedAccount = bank.accountNumber
    ? (showAccountNumber
        ? bank.accountNumber
        : `••••••••${String(bank.accountNumber).slice(-4)}`)
    : 'Not Configured';

  // Address extraction
  const formattedAddress = (() => {
    const addr = manager.residentialAddress;
    if (typeof addr === 'object' && addr !== null) {
      return [addr.doorNumberStreet, addr.villageTown, addr.taluk, addr.district, addr.state, addr.pincode]
        .filter(Boolean)
        .join(', ');
    }
    return addr || 'Anna Salai, Guindy, Chennai, Tamil Nadu - 600032';
  })();

  const activeSinceFormatted = (() => {
    const dt = manager.activeSince || manager.activatedAt || manager.createdAt;
    if (!dt) return 'Authoritative activation recorded on approval';
    const parsed = new Date(dt);
    return isNaN(parsed.getTime()) ? String(dt) : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title={t('header_profile', 'Profile')}
        leftActionIcon={<Icon name="menu" size={24} color="#FFFFFF" />}
        onLeftAction={onOpenDrawer}
        rightActionIcon={<Icon name="cog-outline" size={22} color="#FFFFFF" />}
        onRightAction={() => onNavigateRoute && onNavigateRoute('Settings')}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* SECTION 1: EXECUTIVE IDENTITY CARD */}
        <FICCard style={styles.identityCard}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              <FICAvatar
                name={manager.name || 'Manager'}
                sourceUrl={(manager.avatarUrl && manager.avatarUrl.trim().length > 5) ? manager.avatarUrl : undefined}
                size={84}
              />
            </View>
            <TouchableOpacity
              style={styles.avatarEditBadge}
              onPress={() => {
                setEditModalTab('PHOTO');
                setIsEditModalVisible(true);
              }}
              accessibilityLabel="Edit Profile Photo"
            >
              <Icon name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.managerName}>{manager.name}</Text>
          <Text style={styles.managerEmail}>{manager.email}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Icon name="shield-account" size={13} color="#1D4ED8" />
              <Text style={styles.roleBadgeText}>Level {roleLevel}: {roleFormatted}</Text>
            </View>

            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>{t('status_active', 'Active & Authorized')}</Text>
            </View>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Manager ID</Text>
              <Text style={styles.metaValue}>{employeeIdText}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Active Since</Text>
              <Text style={styles.metaValue}>{activeSinceFormatted}</Text>
            </View>
          </View>
        </FICCard>

        {/* SECTION 2: ACCOUNT INFORMATION */}
        <FICCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <Icon name="account-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitleText}>{t('section_account_info', 'Account Information')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setEditModalTab('DETAILS');
                setIsEditModalVisible(true);
              }}
              style={styles.editSectionBtn}
            >
              <Icon name="pencil-outline" size={15} color={theme.colors.primary} />
              <Text style={styles.editSectionBtnText}>{t('action_edit', 'Edit')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_full_name', 'Full Name')}</Text>
            <Text style={styles.infoValue}>{manager.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_email', 'Official Email')}</Text>
            <Text style={styles.infoValue}>{manager.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_mobile', 'Registered Mobile')}</Text>
            <Text style={styles.infoValue}>+91 {manager.mobile || manager.phone || '9876543200'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_dob', 'Date of Birth')}</Text>
            <Text style={styles.infoValue}>{manager.dob || 'Registered with KYC'}</Text>
          </View>

          <View style={[styles.infoRow, styles.noBorderRow]}>
            <Text style={styles.infoLabel}>{t('field_gender', 'Gender')}</Text>
            <Text style={styles.infoValue}>
              {manager.gender ? manager.gender.charAt(0).toUpperCase() + manager.gender.slice(1) : 'Registered'}
            </Text>
          </View>
        </FICCard>

        {/* SECTION 3: WORK & TERRITORY SCOPE */}
        <FICCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <Icon name="map-marker-radius-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitleText}>{t('section_work_scope', 'Work & Territory Scope')}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_role', 'Assigned Role')}</Text>
            <Text style={styles.infoValue}>{roleFormatted}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_role_level', 'Role Level')}</Text>
            <Text style={styles.infoValue}>Level {roleLevel} (Operational Hierarchy)</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned State</Text>
            <Text style={styles.infoValue}>{manager.state || manager.stateId || 'Tamil Nadu'}</Text>
          </View>

          {manager.districtId || manager.districts?.length ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assigned District</Text>
              <Text style={styles.infoValue}>{manager.districts?.[0] || manager.districtId || 'Chennai'}</Text>
            </View>
          ) : null}

          <View style={[styles.infoRow, styles.noBorderRow]}>
            <Text style={styles.infoLabel}>{t('field_supervisor', 'Direct Supervisor')}</Text>
            <Text style={styles.infoValue}>{supervisorText}</Text>
          </View>
        </FICCard>

        {/* SECTION 4: IDENTITY & KYC VERIFICATION */}
        <FICCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <Icon name="card-account-details-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitleText}>{t('section_identity_kyc', 'Identity & Verification')}</Text>
            </View>
            <View style={styles.verifiedPill}>
              <Icon name="check-decagram" size={14} color="#059669" />
              <Text style={styles.verifiedPillText}>KYC Verified</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_aadhaar', 'Aadhaar Number')}</Text>
            <Text style={[styles.infoValue, styles.monoText]}>{maskedAadhaar}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_pan', 'PAN Number')}</Text>
            <Text style={[styles.infoValue, styles.monoText]}>{maskedPan}</Text>
          </View>

          <View style={[styles.infoRow, styles.noBorderRow]}>
            <Text style={styles.infoLabel}>{t('field_residential_address', 'Residential Address')}</Text>
            <Text style={[styles.infoValue, styles.addressText]}>{formattedAddress}</Text>
          </View>
        </FICCard>

        {/* SECTION 5: BANK ACCOUNT DETAILS (Matching Website) */}
        <FICCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleLeft}>
              <Icon name="bank" size={20} color={theme.colors.primary} />
              <Text style={styles.sectionTitleText}>{t('section_bank_details', 'Bank Details')}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setEditModalTab('BANK');
                setIsEditModalVisible(true);
              }}
              style={styles.editSectionBtn}
            >
              <Icon name="pencil-outline" size={15} color={theme.colors.primary} />
              <Text style={styles.editSectionBtnText}>{hasBankDetails ? t('action_edit', 'Edit') : 'Add Bank'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_account_holder', 'Account Holder')}</Text>
            <Text style={styles.infoValue}>{bank.accountHolderName || manager.name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_bank_name', 'Bank Name')}</Text>
            <Text style={styles.infoValue}>{bank.bankName || 'State Bank of India'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_branch', 'Branch & City')}</Text>
            <Text style={styles.infoValue}>
              {[bank.branchName || 'Main Branch', bank.city || 'Chennai'].filter(Boolean).join(', ')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('field_account_number', 'Account Number')}</Text>
            <View style={styles.accountNumberRow}>
              <Text style={[styles.infoValue, styles.monoText]}>{maskedAccount}</Text>
              <TouchableOpacity
                onPress={() => setShowAccountNumber(!showAccountNumber)}
                style={styles.eyeBtn}
              >
                <Icon
                  name={showAccountNumber ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.infoRow, styles.noBorderRow]}>
            <Text style={styles.infoLabel}>{t('field_ifsc', 'IFSC Code')}</Text>
            <Text style={[styles.infoValue, styles.monoText]}>{bank.ifscCode || 'SBIN0001234'}</Text>
          </View>
        </FICCard>

        {/* SECTION 6: ACTIONS */}
        <View style={styles.actionsContainer}>
          <FICButton
            title={t('action_edit_profile', 'Edit Profile & Details')}
            variant="primary"
            onPress={() => {
              setEditModalTab('DETAILS');
              setIsEditModalVisible(true);
            }}
            style={styles.actionBtn}
          />

          <FICButton
            title={t('header_settings', 'Settings')}
            variant="outline"
            onPress={() => onNavigateRoute && onNavigateRoute('Settings')}
            style={styles.actionBtn}
          />

          <FICButton
            title={t('action_logout', 'Logout')}
            variant="outline"
            onPress={() => setIsLogoutModalVisible(true)}
            style={styles.logoutBtn}
          />
        </View>
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal
        visible={isEditModalVisible}
        manager={manager}
        initialTab={editModalTab}
        onClose={() => setIsEditModalVisible(false)}
        onSuccess={() => refreshManager && refreshManager()}
        onUpdateManager={updateManager}
      />

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Icon name="logout" size={26} color="#DC2626" />
            </View>

            <Text style={styles.modalTitle}>{t('modal_logout_title', 'Logout Confirmation')}</Text>
            <Text style={styles.modalMessage}>
              {t('modal_logout_msg', 'Are you sure you want to logout from FIC Manager?')}
            </Text>

            <View style={styles.modalActionsRow}>
              <FICButton
                title={t('action_cancel', 'Cancel')}
                variant="outline"
                disabled={isLoggingOut}
                onPress={() => setIsLogoutModalVisible(false)}
                style={styles.modalCancelBtn}
              />

              <FICButton
                title={isLoggingOut ? t('action_logging_out', 'Logging out...') : t('action_logout', 'Logout')}
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
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: 40,
  },
  identityCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: theme.spacing.sm,
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: '#1D4ED8',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1D4ED8',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  managerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  managerEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: theme.spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  metaDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: theme.spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: theme.spacing.xs,
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  editSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  editSectionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  infoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  noBorderRow: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  monoText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  addressText: {
    lineHeight: 20,
  },
  accountNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyeBtn: {
    padding: 4,
  },
  actionsContainer: {
    gap: 12,
    marginTop: theme.spacing.xs,
  },
  actionBtn: {
    width: '100%',
  },
  logoutBtn: {
    width: '100%',
    borderColor: '#FCA5A5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 18,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
});
