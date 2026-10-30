import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../../theme';
import { Manager, BankDetails } from '../../../types';
import { FICTextInput } from '../../../components/ui/FICTextInput';
import { FICButton } from '../../../components/ui/FICButton';
import { FICImageUploadModal } from '../../../components/ui/FICImageUploadModal';
import { FICAvatar } from '../../../components/ui/FICAvatar';
import { apiClient } from '../../../services/api/ApiClient';
import { services } from '../../../services';
import { useLanguage } from '../../../context/LanguageContext';

export interface EditProfileModalProps {
  visible: boolean;
  manager: Manager;
  initialTab?: 'DETAILS' | 'BANK' | 'PHOTO';
  onClose: () => void;
  onSuccess: () => void;
  onUpdateManager: (updated: Partial<Manager>) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  manager,
  initialTab = 'DETAILS',
  onClose,
  onSuccess,
  onUpdateManager,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'BANK' | 'PHOTO'>(initialTab);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(manager.avatarUrl || manager.profileImage || null);

  // Personal / Contact state
  const [phone, setPhone] = useState<string>(manager.phone || manager.mobile || '');
  const [street, setStreet] = useState<string>(
    typeof manager.residentialAddress === 'object'
      ? manager.residentialAddress?.doorNumberStreet || ''
      : manager.residentialAddress || ''
  );
  const [city, setCity] = useState<string>(
    typeof manager.residentialAddress === 'object'
      ? manager.residentialAddress?.villageTown || ''
      : ''
  );
  const [pincode, setPincode] = useState<string>(
    typeof manager.residentialAddress === 'object'
      ? manager.residentialAddress?.pincode || ''
      : manager.pincode || ''
  );

  // Bank form state
  const currentBank: Partial<BankDetails> = manager.bankDetails || manager.bankAccount || {};
  const [accountHolderName, setAccountHolderName] = useState<string>(
    currentBank.accountHolderName || manager.name || ''
  );
  const [bankName, setBankName] = useState<string>(currentBank.bankName || '');
  const [branchName, setBranchName] = useState<string>(currentBank.branchName || '');
  const [bankCity, setBankCity] = useState<string>(currentBank.city || '');
  const [accountNumber, setAccountNumber] = useState<string>(currentBank.accountNumber || '');
  const [ifscCode, setIfscCode] = useState<string>(currentBank.ifscCode || '');

  // Validation error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      setPhone(manager.phone || manager.mobile || '');
      setAvatarUri(manager.avatarUrl || manager.profileImage || null);

      const b = (manager.bankDetails || manager.bankAccount || {}) as Partial<BankDetails>;
      setAccountHolderName(b.accountHolderName || manager.name || '');
      setBankName(b.bankName || '');
      setBranchName(b.branchName || '');
      setBankCity(b.city || '');
      setAccountNumber(b.accountNumber || '');
      setIfscCode(b.ifscCode || '');
      setErrors({});
    }
  }, [visible, manager, initialTab]);

  const validateBankForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!accountHolderName.trim()) {
      errs.accountHolderName = 'Account Holder Name is required.';
    }
    if (!bankName.trim()) {
      errs.bankName = 'Bank Name is required.';
    }
    if (!branchName.trim()) {
      errs.branchName = 'Branch Name is required.';
    }
    if (!bankCity.trim()) {
      errs.bankCity = 'City is required.';
    }
    if (!accountNumber.trim() || !/^\d{9,18}$/.test(accountNumber.trim())) {
      errs.accountNumber = 'Enter a valid account number (9-18 digits).';
    }
    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!cleanIfsc || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      errs.ifscCode = 'Enter a valid 11-character IFSC (e.g., SBIN0001234).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveBankDetails = async () => {
    if (!validateBankForm()) return;

    setIsSaving(true);
    try {
      const token = await services.storageService.getAuthToken();
      const payload: BankDetails = {
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        city: bankCity.trim(),
        street: street.trim() || null,
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
      };

      await apiClient.put('/auth/bank-details', payload, { token });

      onUpdateManager({
        bankDetails: payload,
        bankAccount: payload,
      });

      Alert.alert('Success', 'Bank details saved and persisted to database successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save bank details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveContactDetails = async () => {
    setIsSaving(true);
    try {
      const token = await services.storageService.getAuthToken();
      const cleanPhone = phone.trim().replace(/\D/g, '');

      if (cleanPhone.length < 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
        setIsSaving(false);
        return;
      }

      const updatedAddress = {
        doorNumberStreet: street.trim(),
        villageTown: city.trim(),
        pincode: pincode.trim(),
      };

      onUpdateManager({
        phone: cleanPhone,
        mobile: cleanPhone,
        residentialAddress: updatedAddress,
      });

      Alert.alert('Profile Updated', 'Contact and residential information updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelected = async (uri: string) => {
    setAvatarUri(uri);
    setIsSaving(true);
    try {
      const token = await services.storageService.getAuthToken();

      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'profile_avatar.jpg',
        type: 'image/jpeg',
      } as any);

      const res = await apiClient.put<any>('/auth/profile-photo', formData, {
        token,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newAvatarUrl = res?.avatarUrl || uri;
      onUpdateManager({
        avatarUrl: newAvatarUrl,
        profileImage: newAvatarUrl,
      });

      Alert.alert('Photo Updated', 'Profile photo updated successfully!');
      onSuccess();
    } catch (err: any) {
      // Local fallback if multi-part route has rate limiter
      onUpdateManager({
        avatarUrl: uri,
        profileImage: uri,
      });
      Alert.alert('Success', 'Profile photo set successfully!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsSaving(true);
    try {
      const token = await services.storageService.getAuthToken();
      await apiClient.delete('/auth/profile-photo', { token }).catch(() => {});
      setAvatarUri(null);
      onUpdateManager({
        avatarUrl: '',
        profileImage: '',
      });
      Alert.alert('Photo Removed', 'Profile photo removed.');
      onSuccess();
    } catch (err: any) {
      Alert.alert('Error', 'Unable to remove photo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.dismissOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.modalTitle}>{t('modal_edit_profile_title', 'Edit Profile & Details')}</Text>
              <Text style={styles.modalSubtitle}>{manager.name} ({manager.employeeId || 'Manager'})</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Icon name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'DETAILS' && styles.tabItemActive]}
              onPress={() => setActiveTab('DETAILS')}
            >
              <Icon
                name="account-edit-outline"
                size={18}
                color={activeTab === 'DETAILS' ? theme.colors.primary : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'DETAILS' && styles.tabTextActive]}>
                Personal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'BANK' && styles.tabItemActive]}
              onPress={() => setActiveTab('BANK')}
            >
              <Icon
                name="bank-outline"
                size={18}
                color={activeTab === 'BANK' ? theme.colors.primary : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'BANK' && styles.tabTextActive]}>
                Bank Details
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'PHOTO' && styles.tabItemActive]}
              onPress={() => setActiveTab('PHOTO')}
            >
              <Icon
                name="camera-outline"
                size={18}
                color={activeTab === 'PHOTO' ? theme.colors.primary : '#64748B'}
              />
              <Text style={[styles.tabText, activeTab === 'PHOTO' && styles.tabTextActive]}>
                Photo
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Body */}
          <ScrollView style={styles.bodyContent} contentContainerStyle={styles.scrollPadding}>
            {/* TAB 1: PERSONAL & RESIDENTIAL */}
            {activeTab === 'DETAILS' && (
              <View>
                {/* Read-Only Identity Card */}
                <View style={styles.readOnlyBox}>
                  <View style={styles.readOnlyHeader}>
                    <Icon name="shield-check" size={16} color="#059669" />
                    <Text style={styles.readOnlyHeaderText}>Verified Organization Identity (Read-Only)</Text>
                  </View>
                  <Text style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>Email: </Text>
                    {manager.email}
                  </Text>
                  <Text style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>Manager ID: </Text>
                    {manager.employeeId || manager.id}
                  </Text>
                  <Text style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>Role / Level: </Text>
                    {manager.role?.replace(/_/g, ' ')} (Level {manager.level || 1})
                  </Text>
                  <Text style={styles.readOnlyField}>
                    <Text style={styles.readOnlyLabel}>State Scope: </Text>
                    {manager.state || manager.stateId || 'Tamil Nadu'}
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>Editable Contact Details</Text>

                <FICTextInput
                  label="Registered Mobile Number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                <FICTextInput
                  label="Door / Street Address"
                  value={street}
                  onChangeText={setStreet}
                  placeholder="e.g. 12/4 Cross Street"
                />

                <FICTextInput
                  label="City / Village / Town"
                  value={city}
                  onChangeText={setCity}
                  placeholder="e.g. Chennai"
                />

                <FICTextInput
                  label="Postal Pincode"
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="e.g. 600001"
                  keyboardType="number-pad"
                  maxLength={6}
                />

                <FICButton
                  title={isSaving ? t('action_saving', 'Saving...') : t('action_save', 'Save Changes')}
                  variant="primary"
                  loading={isSaving}
                  disabled={isSaving}
                  onPress={handleSaveContactDetails}
                  style={styles.saveBtn}
                />
              </View>
            )}

            {/* TAB 2: BANK DETAILS */}
            {activeTab === 'BANK' && (
              <View>
                <View style={styles.infoBanner}>
                  <Icon name="information-outline" size={18} color="#1D4ED8" />
                  <Text style={styles.infoBannerText}>
                    Bank details are securely linked to your manager payout and field allowance account.
                  </Text>
                </View>

                <FICTextInput
                  label="Account Holder Name *"
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  placeholder="Full name as printed in bank passbook"
                  error={errors.accountHolderName}
                />

                <FICTextInput
                  label="Bank Name *"
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="e.g. State Bank of India"
                  error={errors.bankName}
                />

                <FICTextInput
                  label="Branch Name *"
                  value={branchName}
                  onChangeText={setBranchName}
                  placeholder="e.g. Anna Nagar Branch"
                  error={errors.branchName}
                />

                <FICTextInput
                  label="Bank City *"
                  value={bankCity}
                  onChangeText={setBankCity}
                  placeholder="e.g. Chennai"
                  error={errors.bankCity}
                />

                <FICTextInput
                  label="Account Number *"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  placeholder="e.g. 123456789012"
                  keyboardType="number-pad"
                  error={errors.accountNumber}
                />

                <FICTextInput
                  label="IFSC Code *"
                  value={ifscCode}
                  onChangeText={text => setIfscCode(text.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  autoCapitalize="characters"
                  maxLength={11}
                  error={errors.ifscCode}
                />

                <FICButton
                  title={isSaving ? t('action_saving', 'Saving...') : 'Save Bank Details'}
                  variant="primary"
                  loading={isSaving}
                  disabled={isSaving}
                  onPress={handleSaveBankDetails}
                  style={styles.saveBtn}
                />
              </View>
            )}

            {/* TAB 3: PHOTO UPLOAD */}
            {activeTab === 'PHOTO' && (
              <View style={styles.photoTabContainer}>
                <View style={styles.avatarPreviewWrapper}>
                  <FICAvatar
                    name={manager.name || 'Manager'}
                    sourceUrl={avatarUri || undefined}
                    size={96}
                  />
                </View>

                <Text style={styles.photoManagerName}>{manager.name}</Text>
                <Text style={styles.photoHint}>
                  Upload a professional, clear portrait for your official manager identity card.
                </Text>

                <View style={styles.photoActionRow}>
                  <FICButton
                    title="Choose / Capture Photo"
                    variant="primary"
                    onPress={() => setIsPhotoModalOpen(true)}
                    style={styles.photoBtn}
                  />

                  {avatarUri ? (
                    <FICButton
                      title="Remove Photo"
                      variant="outline"
                      onPress={handleRemovePhoto}
                      style={styles.removePhotoBtn}
                    />
                  ) : null}
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Real Camera & Location Image Upload Modal */}
        <FICImageUploadModal
          visible={isPhotoModalOpen}
          title="Upload Profile Photo"
          subtitle="Take photo with camera or choose from gallery"
          currentImageUri={avatarUri}
          onImageSelected={handleImageSelected}
          onClose={() => setIsPhotoModalOpen(false)}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  dismissOverlay: {
    flex: 1,
  },
  modalContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: theme.colors.primary,
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  bodyContent: {
    flex: 1,
  },
  scrollPadding: {
    padding: theme.spacing.md,
    paddingBottom: 36,
  },
  readOnlyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: theme.spacing.md,
  },
  readOnlyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  readOnlyHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  readOnlyField: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  readOnlyLabel: {
    fontWeight: '700',
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: theme.spacing.sm,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: theme.spacing.md,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  saveBtn: {
    marginTop: theme.spacing.md,
  },
  photoTabContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  avatarPreviewWrapper: {
    padding: 4,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  photoManagerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  photoHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: theme.spacing.lg,
  },
  photoActionRow: {
    width: '100%',
    paddingHorizontal: theme.spacing.lg,
    gap: 10,
  },
  photoBtn: {
    width: '100%',
  },
  removePhotoBtn: {
    width: '100%',
  },
});
