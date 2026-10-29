import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { Vendor, VendorStatus } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { theme } from '../../theme';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FICDropdownModal } from '../../components/ui/FICDropdownModal';
import { FieldActionButtons } from '../../components/ui/FieldActionButtons';
import { socketService } from '../../services/realtime/SocketService';
import { VENDOR_ASSETS } from '../../assets/vendors';
import { maskGSTIN, maskPAN, maskBankAccount } from '../../utils/masking';

export interface VendorDetailScreenProps {
  vendorId?: string;
  onBack: () => void;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

type TabType = 'Overview' | 'Activity' | 'Issues' | 'Outlets';

export const VendorDetailScreen: React.FC<VendorDetailScreenProps> = ({
  vendorId,
  onBack,
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Last 30 Days');
  const [showPeriodModal, setShowPeriodModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [previewDocModal, setPreviewDocModal] = useState<{
    visible: boolean;
    title: string;
    docType: 'AADHAAR' | 'PAN';
    imageUri?: string | null;
    docNumber?: string;
  }>({
    visible: false,
    title: '',
    docType: 'AADHAAR',
    imageUri: null,
    docNumber: '',
  });

  const fetchVendor = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const idToFetch = vendorId || 'v-201';
      let data = await services.vendorRepository.getVendorById(idToFetch);
      if (!data) {
        // Fallback to first vendor if specific ID was not found
        const all = await services.vendorRepository.getVendors();
        data = all.length > 0 ? all[0] : null;
      }
      if (!data) {
        setError('Vendor not found');
      } else {
        setVendor(data);
      }
    } catch {
      setError('Unable to load vendor information');
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  useEffect(() => {
    const unsub1 = socketService.subscribe<Vendor>('vendor.updated', (payload) => {
      if (vendor && payload.entityId === vendor.id && payload.data) {
        setVendor((prev) => (prev ? ({ ...prev, ...payload.data } as Vendor) : (payload.data || null)));
      }
    });
    const unsub2 = socketService.subscribe<Vendor>('vendor.location.updated', (payload) => {
      if (vendor && payload.entityId === vendor.id && payload.data) {
        setVendor((prev) => (prev ? ({ ...prev, ...payload.data } as Vendor) : (payload.data || null)));
      }
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [vendor]);

  const handleCall = () => {
    if (vendor?.phone) {
      Linking.openURL(`tel:${vendor.phone}`).catch(() => {
        Alert.alert('Phone Call', `Dial: ${vendor.phone}`);
      });
    }
  };

  const handleOpenMap = () => {
    const query = encodeURIComponent(vendor?.address || 'Dharmapuri, Tamil Nadu');
    Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {
      Alert.alert('Location', vendor?.address || 'Dharmapuri, Tamil Nadu');
    });
  };

  const handleLogVisit = () => {
    if (onNavigateRoute && vendor) {
      onNavigateRoute('VendorVisit', { vendorId: vendor.id });
    }
  };

  const handleAddIssue = () => {
    if (onNavigateRoute && vendor) {
      onNavigateRoute('Issues', { vendorId: vendor.id });
    }
  };

  const handleCreateReport = () => {
    if (onNavigateRoute && vendor) {
      services.fieldVisitService.addPendingDailyReportVendor(vendor);
      onNavigateRoute('DailyReport', { vendorId: vendor.id });
    }
  };

  const handleEditContact = () => {
    Alert.alert(
      'Edit Contact',
      `Edit contact details for ${vendor?.businessName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Edit in Form',
          onPress: () => {
            if (onNavigateRoute && vendor) {
              onNavigateRoute('AddVendor', { editVendorId: vendor.id });
            }
          },
        },
      ]
    );
  };

  const handleMoreOptions = () => {
    Alert.alert(
      vendor?.businessName || 'Vendor Options',
      'Select an action:',
      [
        { text: 'Call Vendor', onPress: handleCall },
        { text: 'View on Google Maps', onPress: handleOpenMap },
        { text: 'Log Field Visit', onPress: handleLogVisit },
        { text: 'Report New Issue', onPress: handleAddIssue },
        { text: 'Add to Daily Report', onPress: handleCreateReport },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (isLoading) {
    return <FICLoadingState message="Loading vendor details..." />;
  }

  if (error || !vendor) {
    return (
      <FICErrorState
        title="Vendor Not Found"
        message={error || 'Unable to display vendor profile.'}
        onRetry={fetchVendor}
      />
    );
  }

  const getStatusBadge = () => {
    switch (vendor.status) {
      case VendorStatus.NOT_INTERESTED:
        return {
          label: 'Not Interested',
          bg: '#FEF2F2',
          dot: '#DC2626',
          text: '#B91C1C',
        };
      case VendorStatus.ONBOARDED:
        return {
          label: 'Active',
          bg: '#DCFCE7',
          dot: '#16A34A',
          text: '#15803D',
        };
      case VendorStatus.VISITED:
        return {
          label: 'Visited',
          bg: '#DBEAFE',
          dot: '#2563EB',
          text: '#1E40AF',
        };
      case VendorStatus.LEAD:
      default:
        return {
          label: 'Lead',
          bg: '#F3F4F6',
          dot: '#6B7280',
          text: '#374151',
        };
    }
  };

  const statusInfo = getStatusBadge();

  const getVendorImageSource = () => {
    const customPhoto = vendor.shopPhotoUrl || vendor.logoUrl || (vendor as any).photoUrl || (vendor as any).imageUri || (vendor as any).storefrontPhotoUri;
    if (customPhoto) {
      return { uri: customPhoto };
    }
    if (vendor.imageKey && VENDOR_ASSETS[vendor.imageKey]) {
      return VENDOR_ASSETS[vendor.imageKey];
    }
    return VENDOR_ASSETS.abc_traders;
  };

  const imageSource = getVendorImageSource();

  const tabs: TabType[] = ['Overview', 'Activity', 'Issues', 'Outlets'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Vendor Details"
        leftActionIcon={<Text style={styles.headerIcon}>←</Text>}
        onLeftAction={onBack}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO HEADER CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            {/* Storefront Image */}
            <Image
              source={imageSource}
              style={styles.storefrontImage}
              resizeMode="cover"
            />

            {/* Middle Details */}
            <View style={styles.heroCenterCol}>
              <Text style={styles.businessName} numberOfLines={1}>
                {vendor.businessName}
              </Text>

              <Text style={styles.heroSubtitle}>
                {vendor.businessType || 'Retail'} • {vendor.subcategory || vendor.category}
              </Text>

              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusInfo.dot }]} />
                <Text style={[styles.statusText, { color: statusInfo.text }]}>
                  {statusInfo.label}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <Icon name="map-marker-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {vendor.locationDistrict || 'Dharmapuri, Tamil Nadu'}
                </Text>
              </View>
            </View>

            {/* Right Action Buttons */}
            <View style={styles.heroActionsCol}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleCall}
                activeOpacity={0.7}
                accessibilityLabel="Call Vendor"
              >
                <Icon name="phone" size={18} color="#2563EB" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleOpenMap}
                activeOpacity={0.7}
                accessibilityLabel="Navigate to Vendor"
              >
                <Icon name="navigation" size={18} color="#2563EB" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                onPress={handleCreateReport}
                activeOpacity={0.7}
                accessibilityLabel="Add to Daily Report"
              >
                <Icon name="clipboard-text-outline" size={18} color="#1D4ED8" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Stats Capsules */}
          <View style={styles.statsCapsulesRow}>
            {/* Outlets */}
            <TouchableOpacity
              style={styles.capsuleItem}
              onPress={() => setActiveTab('Outlets')}
              activeOpacity={0.7}
            >
              <Icon name="storefront-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.capsuleNumber}>{vendor.outletCount || 12}</Text>
                <Text style={styles.capsuleLabel}>Outlets</Text>
              </View>
            </TouchableOpacity>

            {/* Open Issues */}
            <TouchableOpacity
              style={styles.capsuleItem}
              onPress={() => setActiveTab('Issues')}
              activeOpacity={0.7}
            >
              <Icon name="file-document-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.capsuleNumber}>{vendor.issueCount ?? 3}</Text>
                <Text style={styles.capsuleLabel}>Open Issues</Text>
              </View>
            </TouchableOpacity>

            {/* Total Visits */}
            <TouchableOpacity
              style={styles.capsuleItem}
              onPress={() => setActiveTab('Activity')}
              activeOpacity={0.7}
            >
              <Icon name="calendar-month-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.capsuleNumber}>{vendor.visitCount || 18}</Text>
                <Text style={styles.capsuleLabel}>Total Visits</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* HORIZONTAL SEGMENT TABS */}
        <View style={styles.tabsRow}>
          {tabs.map(tab => {
            const isCurrent = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isCurrent && styles.activeTabButton]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isCurrent && styles.activeTabText]}>
                  {tab}
                </Text>
                {isCurrent && <View style={styles.activeTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === 'Overview' && (
          <>
            {/* SECTION 1: CONTACT INFORMATION */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="account-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Contact Information</Text>
                </View>

                <TouchableOpacity style={styles.editButton} onPress={handleEditContact} activeOpacity={0.7}>
                  <Icon name="pencil-outline" size={13} color="#2563EB" style={{ marginRight: 4 }} />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.contactItemsRow}>
                {/* Phone */}
                <TouchableOpacity style={styles.contactItemCol} onPress={handleCall} activeOpacity={0.7}>
                  <View style={[styles.contactIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Icon name="phone" size={16} color="#10B981" />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {vendor.phone || '+91 98765 43210'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Email */}
                <TouchableOpacity
                  style={styles.contactItemCol}
                  onPress={() => Linking.openURL(`mailto:${vendor.email || 'abc@traders.com'}`).catch(() => {})}
                  activeOpacity={0.7}
                >
                  <View style={[styles.contactIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="email-outline" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {vendor.email || 'abc@traders.com'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Contact Person */}
                <View style={styles.contactItemCol}>
                  <View style={[styles.contactIconCircle, { backgroundColor: '#F5F3FF' }]}>
                    <Icon name="account-group-outline" size={16} color="#8B5CF6" />
                  </View>
                  <View style={styles.contactTextCol}>
                    <Text style={styles.contactLabel}>Contact Person</Text>
                    <Text style={styles.contactValue} numberOfLines={1}>
                      {vendor.vendorName || 'Rajesh Kumar'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Compact Secondary Call & Navigate Action Buttons */}
              <FieldActionButtons
                phoneNumber={vendor.phone}
                latitude={vendor.latitude}
                longitude={vendor.longitude}
                titleOrLabel={vendor.businessName || vendor.name}
                address={vendor.address}
                style={{ marginTop: 14 }}
              />
            </View>

            {/* SECTION 2: BUSINESS DETAILS */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="storefront-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Business Details</Text>
                </View>
              </View>

              <View style={styles.businessGrid}>
                {/* Row 1 */}
                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Category</Text>
                    <Text style={styles.gridValue}>{vendor.businessType || 'Retail'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Sub Category</Text>
                    <Text style={styles.gridValue}>{vendor.subcategory || 'FMCG'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>GST Number (Masked)</Text>
                    <Text style={styles.gridValue}>{maskGSTIN(vendor.gstNumber || '33ABCDE1234F1Z5')}</Text>
                  </View>
                </View>

                {/* Row 2 */}
                <View style={[styles.gridRow, { marginTop: 14 }]}>
                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Year of Establishment</Text>
                    <Text style={styles.gridValue}>{vendor.yearOfEstablishment || '2018'}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Total Outlets</Text>
                    <Text style={styles.gridValue}>{vendor.outletCount || 12}</Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.gridLabel}>Assigned Manager</Text>
                    <Text style={styles.gridValue}>
                      {vendor.assignedManager ||
                        (manager
                          ? `${manager.name} (${manager.role.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())})`
                          : 'Assigned Manager')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* KYC Document Previews (Aadhaar & PAN) */}
              <View style={styles.kycSectionContainer}>
                <View style={styles.kycSectionHeader}>
                  <View style={styles.kycHeaderTitleWrap}>
                    <Icon name="shield-check" size={15} color="#059669" style={{ marginRight: 5 }} />
                    <Text style={styles.kycSectionTitle}>Statutory KYC Documents</Text>
                  </View>
                  <View style={styles.kycVerifiedBadge}>
                    <Icon name="check-circle" size={11} color="#059669" style={{ marginRight: 3 }} />
                    <Text style={styles.kycVerifiedBadgeText}>Verified</Text>
                  </View>
                </View>

                <View style={styles.kycDocsRow}>
                  {/* AADHAAR CARD PREVIEW */}
                  <TouchableOpacity
                    style={styles.kycDocCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      setPreviewDocModal({
                        visible: true,
                        title: 'Aadhaar Card',
                        docType: 'AADHAAR',
                        imageUri: vendor.aadhaarUrl || null,
                        docNumber: vendor.aadhaarNumber ? `XXXX XXXX ${vendor.aadhaarNumber.slice(-4)}` : 'XXXX XXXX 4123',
                      })
                    }
                  >
                    <View style={styles.kycDocTopBar}>
                      <View style={styles.kycDocTagWrap}>
                        <Icon name="card-account-details-outline" size={13} color="#0284C7" />
                        <Text style={styles.kycDocTag}>Aadhaar Card</Text>
                      </View>
                      <View style={styles.kycDocZoomBadge}>
                        <Icon name="arrow-expand" size={11} color="#64748B" />
                      </View>
                    </View>

                    <View style={styles.kycDocPreviewBox}>
                      {vendor.aadhaarUrl ? (
                        <Image
                          source={{ uri: vendor.aadhaarUrl }}
                          style={styles.kycDocImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.aadhaarCardGraphic}>
                          <View style={styles.aadhaarTricolorStripe}>
                            <View style={[styles.stripePart, { backgroundColor: '#FF9933' }]} />
                            <View style={[styles.stripePart, { backgroundColor: '#FFFFFF' }]} />
                            <View style={[styles.stripePart, { backgroundColor: '#138808' }]} />
                          </View>
                          <Text style={styles.aadhaarHeaderText}>Govt. of India / UIDAI</Text>
                          <View style={styles.aadhaarBody}>
                            <View style={styles.aadhaarPhotoThumb}>
                              <Icon name="account" size={18} color="#64748B" />
                            </View>
                            <View style={styles.aadhaarInfoCol}>
                              <Text style={styles.aadhaarOwnerName} numberOfLines={1}>{vendor.vendorName || 'Card Holder'}</Text>
                              <Text style={styles.aadhaarNumberSmall}>
                                {vendor.aadhaarNumber ? `XXXX XXXX ${vendor.aadhaarNumber.slice(-4)}` : 'XXXX XXXX 4123'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                      <View style={styles.kycTapOverlay}>
                        <Icon name="magnify" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.kycTapText}>Preview</Text>
                      </View>
                    </View>

                    <Text style={styles.kycDocNumberText}>
                      {vendor.aadhaarNumber ? `XXXX XXXX ${vendor.aadhaarNumber.slice(-4)}` : 'XXXX XXXX 4123'}
                    </Text>
                  </TouchableOpacity>

                  {/* PAN CARD PREVIEW */}
                  <TouchableOpacity
                    style={styles.kycDocCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      setPreviewDocModal({
                        visible: true,
                        title: 'PAN Card',
                        docType: 'PAN',
                        imageUri: vendor.panUrl || null,
                        docNumber: maskPAN(vendor.panNumber || (vendor.gstNumber ? vendor.gstNumber.slice(2, 12) : 'ABCDE1234F')),
                      })
                    }
                  >
                    <View style={styles.kycDocTopBar}>
                      <View style={styles.kycDocTagWrap}>
                        <Icon name="credit-card-outline" size={13} color="#D97706" />
                        <Text style={[styles.kycDocTag, { color: '#B45309' }]}>PAN Card</Text>
                      </View>
                      <View style={styles.kycDocZoomBadge}>
                        <Icon name="arrow-expand" size={11} color="#64748B" />
                      </View>
                    </View>

                    <View style={styles.kycDocPreviewBox}>
                      {vendor.panUrl ? (
                        <Image
                          source={{ uri: vendor.panUrl }}
                          style={styles.kycDocImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.panCardGraphic}>
                          <View style={styles.panCardHeaderStripe}>
                            <Text style={styles.panHeaderText}>INCOME TAX DEPARTMENT</Text>
                          </View>
                          <View style={styles.panBody}>
                            <View style={styles.panPhotoThumb}>
                              <Icon name="account" size={18} color="#64748B" />
                            </View>
                            <View style={styles.panInfoCol}>
                              <Text style={styles.panOwnerName} numberOfLines={1}>{vendor.vendorName || 'Tax Payer'}</Text>
                              <Text style={styles.panNumberSmall}>
                                {maskPAN(vendor.panNumber || (vendor.gstNumber ? vendor.gstNumber.slice(2, 12) : 'ABCDE1234F'))}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                      <View style={styles.kycTapOverlay}>
                        <Icon name="magnify" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                        <Text style={styles.kycTapText}>Preview</Text>
                      </View>
                    </View>

                    <Text style={styles.kycDocNumberText}>
                      {maskPAN(vendor.panNumber || (vendor.gstNumber ? vendor.gstNumber.slice(2, 12) : 'ABCDE1234F'))}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* SECTION 3: ADDRESS */}
            <View style={styles.cardSection}>
              <View style={styles.addressContainer}>
                <View style={styles.addressLeftCol}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                      <Icon name="map-marker-outline" size={18} color="#2563EB" />
                    </View>
                    <Text style={styles.cardHeaderTitle}>Address</Text>
                  </View>

                  <Text style={styles.addressText}>
                    {vendor.address || '123, Main Road, Dharmapuri, Tamil Nadu'}
                    {vendor.pincodeId ? `\nPIN: ${vendor.pincodeId}` : ''}
                  </Text>
                </View>

                {/* Map Preview Graphic */}
                <View style={styles.mapPreviewWrapper}>
                  <Image
                    source={VENDOR_ASSETS.map_preview}
                    style={styles.mapImage}
                    resizeMode="cover"
                  />
                  <View style={styles.mapPinContainer}>
                    <Icon name="map-marker" size={24} color="#EF4444" />
                  </View>
                  <TouchableOpacity
                    style={styles.viewOnMapPill}
                    onPress={handleOpenMap}
                    activeOpacity={0.8}
                  >
                    <Icon name="navigation" size={11} color="#2563EB" style={{ marginRight: 3 }} />
                    <Text style={styles.viewOnMapText}>View on Map</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* SECTION 4: ACTIVITY SUMMARY */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="poll" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Activity Summary</Text>
                </View>

                <TouchableOpacity
                  style={styles.periodDropdown}
                  activeOpacity={0.7}
                  onPress={() => setShowPeriodModal(true)}
                >
                  <Text style={styles.periodDropdownText}>{selectedPeriod}</Text>
                  <Icon name="chevron-down" size={14} color="#334155" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>

              <View style={styles.activitySummaryGrid}>
                {/* Visits */}
                <View style={[styles.activitySummaryCard, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="storefront-outline" size={18} color="#2563EB" style={{ marginBottom: 6 }} />
                  <Text style={styles.activityMetricNumber}>6</Text>
                  <Text style={styles.activityMetricLabel}>Visits</Text>
                </View>

                {/* Estimated Sales */}
                <View style={[styles.activitySummaryCard, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="cart-outline" size={18} color="#10B981" style={{ marginBottom: 6 }} />
                  <Text style={[styles.activityMetricNumber, { color: '#059669', fontSize: 13 }]}>
                    ₹ 1,24,500
                  </Text>
                  <Text style={styles.activityMetricLabel}>Estimated Sales</Text>
                </View>

                {/* Orders */}
                <View style={[styles.activitySummaryCard, { backgroundColor: '#FFFBEB' }]}>
                  <Icon name="package-variant-closed" size={18} color="#F59E0B" style={{ marginBottom: 6 }} />
                  <Text style={styles.activityMetricNumber}>24</Text>
                  <Text style={styles.activityMetricLabel}>Orders</Text>
                </View>

                {/* Issues */}
                <View style={[styles.activitySummaryCard, { backgroundColor: '#F5F3FF' }]}>
                  <Icon name="file-document-outline" size={18} color="#8B5CF6" style={{ marginBottom: 6 }} />
                  <Text style={styles.activityMetricNumber}>3</Text>
                  <Text style={styles.activityMetricLabel}>Issues</Text>
                </View>
              </View>
            </View>

            {/* SECTION 5: RECENT ACTIVITY */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="clock-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Recent Activity</Text>
                </View>

                <TouchableOpacity onPress={() => setActiveTab('Activity')} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.activityList}>
                {/* Item 1 */}
                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Icon name="storefront-outline" size={16} color="#10B981" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>Visited outlet</Text>
                    <Text style={styles.activityItemSubtitle}>ABC Traders - Main Branch</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>2 days ago</Text>
                    <Icon name="chevron-right" size={14} color="#94A3B8" />
                  </View>
                </View>

                {/* Item 2 */}
                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#FFFBEB' }]}>
                    <Icon name="cart-outline" size={16} color="#F59E0B" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>New order placed</Text>
                    <Text style={styles.activityItemSubtitle}>Order #ORD9021 - ₹ 12,450</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>3 days ago</Text>
                    <Icon name="chevron-right" size={14} color="#94A3B8" />
                  </View>
                </View>

                {/* Item 3 */}
                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Icon name="alert-outline" size={16} color="#EF4444" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>Issue reported</Text>
                    <Text style={styles.activityItemSubtitle}>Product delivery delay</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>5 days ago</Text>
                    <Icon name="chevron-right" size={14} color="#94A3B8" />
                  </View>
                </View>

                {/* Item 4 */}
                <View style={styles.activityRow}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="file-document-outline" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>KYC updated</Text>
                    <Text style={styles.activityItemSubtitle}>Documents verified successfully</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>1 week ago</Text>
                    <Icon name="chevron-right" size={14} color="#94A3B8" />
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* TAB CONTENT: ACTIVITY */}
        {activeTab === 'Activity' && (
          <View>
            {/* Activity Summary Cards */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="poll" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Activity Summary</Text>
                </View>

                <TouchableOpacity
                  style={styles.periodDropdown}
                  activeOpacity={0.7}
                  onPress={() => setShowPeriodModal(true)}
                >
                  <Text style={styles.periodDropdownText}>{selectedPeriod}</Text>
                  <Icon name="chevron-down" size={14} color="#334155" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>

              <View style={styles.activitySummaryGrid}>
                <View style={[styles.activitySummaryCard, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="storefront-outline" size={18} color="#2563EB" style={{ marginBottom: 6 }} />
                  <Text style={styles.activityMetricNumber}>6</Text>
                  <Text style={styles.activityMetricLabel}>Visits</Text>
                </View>
                <View style={[styles.activitySummaryCard, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="cart-outline" size={18} color="#10B981" style={{ marginBottom: 6 }} />
                  <Text style={[styles.activityMetricNumber, { color: '#059669', fontSize: 13 }]}>₹ 1,24,500</Text>
                  <Text style={styles.activityMetricLabel}>Estimated Sales</Text>
                </View>
                <View style={[styles.activitySummaryCard, { backgroundColor: '#FFFBEB' }]}>
                  <Icon name="package-variant-closed" size={18} color="#F59E0B" style={{ marginBottom: 6 }} />
                  <Text style={styles.activityMetricNumber}>24</Text>
                  <Text style={styles.activityMetricLabel}>Orders</Text>
                </View>
                <View style={[styles.activitySummaryCard, { backgroundColor: '#F5F3FF' }]}>
                  <Icon name="file-document-outline" size={18} color="#8B5CF6" style={{ marginBottom: 6 }} />
                  <Text style={styles.activityMetricNumber}>3</Text>
                  <Text style={styles.activityMetricLabel}>Issues</Text>
                </View>
              </View>
            </View>

            {/* Timeline */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="history" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Complete Activity Log</Text>
                </View>
              </View>

              <View style={styles.activityList}>
                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Icon name="storefront-outline" size={16} color="#10B981" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>Visited outlet</Text>
                    <Text style={styles.activityItemSubtitle}>ABC Traders - Main Branch (by Ramesh)</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>2 days ago</Text>
                  </View>
                </View>

                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#FFFBEB' }]}>
                    <Icon name="cart-outline" size={16} color="#F59E0B" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>New order placed</Text>
                    <Text style={styles.activityItemSubtitle}>Order #ORD9021 - ₹ 12,450</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>3 days ago</Text>
                  </View>
                </View>

                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#FEF2F2' }]}>
                    <Icon name="alert-outline" size={16} color="#EF4444" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>Issue reported</Text>
                    <Text style={styles.activityItemSubtitle}>Product delivery delay (Carton shortage)</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>5 days ago</Text>
                  </View>
                </View>

                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#ECFDF5' }]}>
                    <Icon name="truck-check-outline" size={16} color="#10B981" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>Order delivered</Text>
                    <Text style={styles.activityItemSubtitle}>Order #ORD8955 - ₹ 48,200</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>6 days ago</Text>
                  </View>
                </View>

                <View style={[styles.activityRow, styles.activityRowBorder]}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="file-document-outline" size={16} color="#2563EB" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>KYC updated</Text>
                    <Text style={styles.activityItemSubtitle}>GST & FSSAI certificates approved</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>1 week ago</Text>
                  </View>
                </View>

                <View style={styles.activityRow}>
                  <View style={[styles.activityItemIconCircle, { backgroundColor: '#F5F3FF' }]}>
                    <Icon name="clipboard-check-outline" size={16} color="#8B5CF6" />
                  </View>
                  <View style={styles.activityItemContent}>
                    <Text style={styles.activityItemTitle}>Quarterly Audit</Text>
                    <Text style={styles.activityItemSubtitle}>Compliance score: 98% (Pass)</Text>
                  </View>
                  <View style={styles.activityItemRight}>
                    <Text style={styles.activityItemTime}>2 weeks ago</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB CONTENT: ISSUES */}
        {activeTab === 'Issues' && (
          <View>
            {/* Issues Summary */}
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#FEF2F2' }]}>
                    <Icon name="alert-circle-outline" size={18} color="#EF4444" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Open Issues (3)</Text>
                </View>

                <TouchableOpacity style={styles.editButton} onPress={handleAddIssue} activeOpacity={0.7}>
                  <Icon name="plus" size={13} color="#2563EB" style={{ marginRight: 2 }} />
                  <Text style={styles.editText}>New Issue</Text>
                </TouchableOpacity>
              </View>

              {/* Issue 1 */}
              <View style={[styles.issueItemBox, { borderLeftColor: '#EF4444' }]}>
                <View style={styles.issueItemHeader}>
                  <Text style={styles.issueItemTitle}>Product delivery delay</Text>
                  <View style={[styles.issueTag, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.issueTagText, { color: '#DC2626' }]}>High</Text>
                  </View>
                </View>
                <Text style={styles.issueItemDesc}>Batch of 50 FMCG cartons delayed by 48 hours. Supplier contacted.</Text>
                <View style={styles.issueItemMeta}>
                  <Text style={styles.issueMetaText}>Reported 5 days ago</Text>
                  <Text style={[styles.issueStatusPill, { color: '#D97706', backgroundColor: '#FEF3C7' }]}>Open</Text>
                </View>
              </View>

              {/* Issue 2 */}
              <View style={[styles.issueItemBox, { borderLeftColor: '#F59E0B' }]}>
                <View style={styles.issueItemHeader}>
                  <Text style={styles.issueItemTitle}>Defective stock replacement</Text>
                  <View style={[styles.issueTag, { backgroundColor: '#FEF3C7' }]}>
                    <Text style={[styles.issueTagText, { color: '#D97706' }]}>Medium</Text>
                  </View>
                </View>
                <Text style={styles.issueItemDesc}>Damaged items received from batch #492. Return authorization issued.</Text>
                <View style={styles.issueItemMeta}>
                  <Text style={styles.issueMetaText}>Reported 12 days ago</Text>
                  <Text style={[styles.issueStatusPill, { color: '#2563EB', backgroundColor: '#EFF6FF' }]}>In Progress</Text>
                </View>
              </View>

              {/* Issue 3 */}
              <View style={[styles.issueItemBox, { borderLeftColor: '#3B82F6' }]}>
                <View style={styles.issueItemHeader}>
                  <Text style={styles.issueItemTitle}>Invoice GST reconciliation</Text>
                  <View style={[styles.issueTag, { backgroundColor: '#EFF6FF' }]}>
                    <Text style={[styles.issueTagText, { color: '#2563EB' }]}>Low</Text>
                  </View>
                </View>
                <Text style={styles.issueItemDesc}>GST mismatch between invoice #INV-4921 and portal submission.</Text>
                <View style={styles.issueItemMeta}>
                  <Text style={styles.issueMetaText}>Reported 18 days ago</Text>
                  <Text style={[styles.issueStatusPill, { color: '#2563EB', backgroundColor: '#EFF6FF' }]}>In Progress</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB CONTENT: OUTLETS */}
        {activeTab === 'Outlets' && (
          <View>
            <View style={styles.cardSection}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <View style={[styles.cardHeaderIconBox, { backgroundColor: '#EFF6FF' }]}>
                    <Icon name="storefront-outline" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.cardHeaderTitle}>Outlets & Branches (12)</Text>
                </View>
              </View>

              {[
                { name: 'ABC Traders - Main Branch', address: '123, Main Road, Dharmapuri - 636701', manager: 'Rajesh Kumar', phone: '+91 98765 43210' },
                { name: 'ABC Supermarket - Pennagaram', address: '45, Pennagaram Road, Dharmapuri', manager: 'Suresh M', phone: '+91 98765 43211' },
                { name: 'ABC Express - Harur', address: '18, Bazaar Street, Harur', manager: 'V. Anandan', phone: '+91 98765 43212' },
                { name: 'ABC Mini Mart - Palacode', address: '7, Station Road, Palacode', manager: 'K. Karthik', phone: '+91 98765 43213' },
                { name: 'ABC Wholesale - Morappur', address: '92, Railway Feeders Rd, Morappur', manager: 'P. Selvam', phone: '+91 98765 43214' },
                { name: 'ABC Provisions - Karimangalam', address: 'Salem Main Road, Karimangalam', manager: 'M. Dinesh', phone: '+91 98765 43215' },
              ].map((outlet, idx) => (
                <View key={idx} style={[styles.outletItemCard, idx > 0 && { marginTop: 10 }]}>
                  <View style={styles.outletTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.outletName}>{outlet.name}</Text>
                      <Text style={styles.outletAddress}>{outlet.address}</Text>
                      <Text style={styles.outletManager}>Manager: {outlet.manager}</Text>
                    </View>
                    <View style={styles.outletActions}>
                      <TouchableOpacity
                        style={styles.outletActionBtn}
                        onPress={() => Linking.openURL(`tel:${outlet.phone}`)}
                        activeOpacity={0.7}
                      >
                        <Icon name="phone" size={14} color="#2563EB" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.outletActionBtn}
                        onPress={handleOpenMap}
                        activeOpacity={0.7}
                      >
                        <Icon name="navigation" size={14} color="#2563EB" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Activity Period Selection Dropdown Modal */}
      <FICDropdownModal
        visible={showPeriodModal}
        title="Select Activity Time Period"
        options={[
          { label: 'Last 7 Days', value: 'Last 7 Days' },
          { label: 'Last 30 Days', value: 'Last 30 Days' },
          { label: 'Last 90 Days', value: 'Last 90 Days' },
          { label: 'This Year', value: 'This Year' },
        ]}
        selectedValue={selectedPeriod}
        onSelect={(val: string) => setSelectedPeriod(val)}
        onClose={() => setShowPeriodModal(false)}
      />

      {/* FULLSCREEN KYC DOCUMENT PREVIEW LIGHTBOX MODAL */}
      <Modal
        visible={previewDocModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewDocModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.previewModalBackdrop}>
          <View style={styles.previewModalContainer}>
            <View style={styles.previewModalHeader}>
              <View style={styles.previewModalTitleGroup}>
                <View style={[styles.previewModalIconBox, { backgroundColor: previewDocModal.docType === 'AADHAAR' ? '#E0F2FE' : '#FEF3C7' }]}>
                  <Icon
                    name={previewDocModal.docType === 'AADHAAR' ? 'card-account-details-outline' : 'credit-card-outline'}
                    size={20}
                    color={previewDocModal.docType === 'AADHAAR' ? '#0284C7' : '#D97706'}
                  />
                </View>
                <View style={{ marginLeft: 10, flexShrink: 1 }}>
                  <Text style={styles.previewModalTitle}>{previewDocModal.title}</Text>
                  <Text style={styles.previewModalSubtitle}>{previewDocModal.docNumber}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.previewModalCloseBtn}
                onPress={() => setPreviewDocModal(prev => ({ ...prev, visible: false }))}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewModalBody}>
              {previewDocModal.imageUri ? (
                <Image
                  source={{ uri: previewDocModal.imageUri }}
                  style={styles.previewModalFullImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.modalGraphicCard}>
                  {previewDocModal.docType === 'AADHAAR' ? (
                    <View style={styles.modalAadhaarCard}>
                      <View style={styles.aadhaarTricolorStripe}>
                        <View style={[styles.stripePart, { backgroundColor: '#FF9933' }]} />
                        <View style={[styles.stripePart, { backgroundColor: '#FFFFFF' }]} />
                        <View style={[styles.stripePart, { backgroundColor: '#138808' }]} />
                      </View>
                      <View style={styles.modalCardHeaderRow}>
                        <Icon name="shield-check" size={22} color="#0284C7" />
                        <Text style={styles.modalCardHeaderText}>Unique Identification Authority of India</Text>
                      </View>
                      <View style={styles.modalCardBody}>
                        <View style={styles.modalCardPhoto}>
                          <Icon name="account" size={48} color="#94A3B8" />
                        </View>
                        <View style={styles.modalCardDetails}>
                          <Text style={styles.modalCardName}>{vendor?.vendorName || 'Card Holder'}</Text>
                          <Text style={styles.modalCardField}>DOB / Year: 1988</Text>
                          <Text style={styles.modalCardField}>Gender: Male / Transgender / Female</Text>
                          <Text style={styles.modalCardNumberText}>{previewDocModal.docNumber}</Text>
                        </View>
                      </View>
                      <View style={styles.modalCardFooter}>
                        <Text style={styles.modalCardFooterText}>मेरा आधार, मेरी पहचान</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.modalPanCard}>
                      <View style={styles.modalPanHeader}>
                        <Text style={styles.modalPanHeaderText}>INCOME TAX DEPARTMENT • GOVT. OF INDIA</Text>
                      </View>
                      <View style={styles.modalCardBody}>
                        <View style={styles.modalCardPhoto}>
                          <Icon name="account" size={48} color="#94A3B8" />
                        </View>
                        <View style={styles.modalCardDetails}>
                          <Text style={styles.modalCardName}>{vendor?.vendorName || 'Tax Payer'}</Text>
                          <Text style={styles.modalCardField}>Permanent Account Number</Text>
                          <Text style={styles.modalCardNumberText}>{previewDocModal.docNumber}</Text>
                          <View style={styles.panSignatureLine}>
                            <Text style={styles.signatureText}>Signature Verified ✓</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>

            <View style={styles.previewModalFooter}>
              <View style={styles.previewModalVerifiedPill}>
                <Icon name="check-decagram" size={15} color="#059669" style={{ marginRight: 6 }} />
                <Text style={styles.previewModalVerifiedText}>UIDAI & NSDL Statutory Verified Document</Text>
              </View>
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
  headerIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topHeader: {
    height: 56,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  /* Hero Card */
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  storefrontImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  heroCenterCol: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeDot: {
    backgroundColor: '#16A34A',
  },
  inactiveDot: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#15803D',
  },
  inactiveStatusText: {
    color: '#DC2626',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  heroActionsCol: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  quickActionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Bottom Stats Capsules */
  statsCapsulesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  capsuleItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  capsuleNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  capsuleLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  /* Horizontal Segment Tabs */
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    position: 'relative',
    alignItems: 'center',
  },
  activeTabButton: {},
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 8,
    right: 8,
    height: 2.5,
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  /* Common Card Section */
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  editText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  /* Contact Information Items */
  contactItemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactItemCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  contactIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  contactTextCol: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 1,
  },
  contactValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  /* Business Details Grid */
  businessGrid: {},
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
    marginRight: 6,
  },
  gridLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  /* Address Section */
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressLeftCol: {
    flex: 1.1,
    marginRight: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
  },
  mapPreviewWrapper: {
    flex: 1,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapPinContainer: {
    position: 'absolute',
    top: '20%',
    left: '42%',
  },
  viewOnMapPill: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewOnMapText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  /* Activity Summary Grid */
  periodDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  periodDropdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  activitySummaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  activitySummaryCard: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'flex-start',
  },
  activityMetricNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  activityMetricLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  /* Recent Activity List */
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  activityList: {},
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  activityItemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityItemContent: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  activityItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  activityItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityItemTime: {
    fontSize: 11,
    color: '#94A3B8',
    marginRight: 4,
  },
  /* Bottom Fixed Action Bar */
  bottomActionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 4,
  },
  actionBtnSecondary: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionBtnAlert: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnAlertText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  actionBtnPrimary: {
    flex: 1.1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1D4ED8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Issues Tab Styles */
  issueItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  issueItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  issueItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  issueTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  issueTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  issueItemDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 8,
  },
  issueItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  issueMetaText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  issueStatusPill: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  /* Outlets Tab Styles */
  outletItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  outletTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outletName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  outletAddress: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  outletManager: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  outletActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 10,
  },
  outletActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  /* KYC Document Previews */
  kycSectionContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  kycSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kycHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  kycVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  kycVerifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  kycDocsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kycDocCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  kycDocTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kycDocTagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kycDocTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  kycDocZoomBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycDocPreviewBox: {
    height: 90,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kycDocImage: {
    width: '100%',
    height: '100%',
  },
  /* Styled Aadhaar Mini Graphic */
  aadhaarCardGraphic: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 4,
  },
  aadhaarTricolorStripe: {
    height: 3,
    flexDirection: 'row',
    width: '100%',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 3,
  },
  stripePart: {
    flex: 1,
    height: '100%',
  },
  aadhaarHeaderText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 3,
  },
  aadhaarBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  aadhaarPhotoThumb: {
    width: 32,
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  aadhaarInfoCol: {
    flex: 1,
  },
  aadhaarOwnerName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  aadhaarNumberSmall: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  /* Styled PAN Mini Graphic */
  panCardGraphic: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 4,
  },
  panCardHeaderStripe: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 2,
    borderRadius: 2,
    marginBottom: 3,
  },
  panHeaderText: {
    fontSize: 7,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  panBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  panPhotoThumb: {
    width: 32,
    height: 38,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  panInfoCol: {
    flex: 1,
  },
  panOwnerName: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0F172A',
  },
  panNumberSmall: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  /* Tap overlay */
  kycTapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycTapText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  kycDocNumberText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  /* FULLSCREEN PREVIEW LIGHTBOX MODAL */
  previewModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  previewModalContainer: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  previewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  previewModalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewModalIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewModalSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  previewModalCloseBtn: {
    padding: 6,
  },
  previewModalBody: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    backgroundColor: '#F8FAFC',
  },
  previewModalFullImage: {
    width: '100%',
    height: 250,
    borderRadius: 10,
  },
  modalGraphicCard: {
    width: '100%',
  },
  modalAadhaarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  modalCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  modalCardHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  modalCardPhoto: {
    width: 70,
    height: 85,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCardDetails: {
    flex: 1,
  },
  modalCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalCardField: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  modalCardNumberText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 1,
    marginTop: 6,
  },
  modalCardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    alignItems: 'center',
  },
  modalCardFooterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  modalPanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  modalPanHeader: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalPanHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  panSignatureLine: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
  },
  signatureText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    fontStyle: 'italic',
  },
  previewModalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  previewModalVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewModalVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
});
