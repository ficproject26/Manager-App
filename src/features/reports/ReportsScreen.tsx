import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../hooks/useAuth';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICDropdownModal } from '../../components/ui/FICDropdownModal';
import { FICImageUploadModal } from '../../components/ui/FICImageUploadModal';
import { FICAudioPlayerRecorder } from '../../components/ui/FICAudioPlayerRecorder';
import { theme } from '../../theme';
import { FICEmptyState } from '../../components/feedback/FICEmptyState';
import { services } from '../../services';
import { cameraLocationService } from '../../services/camera/CameraLocationService';
import { googleMapsLocationService } from '../../services/maps';
import { reportExportService } from '../../services/reports/ReportExportService';
import { ExportResult } from '../../services/reports/IReportExportService';
import { ManagerRole, VisitRecord } from '../../types';

export interface ReportsScreenProps {
  initialTab?: string;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

type ReportScopeFilter = 'ALL' | 'MY' | 'EQUAL' | 'SUBORDINATE';
type ReportTierFilter = 'ALL' | ManagerRole;

const INITIAL_VISIT_RECORDS: VisitRecord[] = [];

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager: authManager } = useAuth();
  const [records, setRecords] = useState<VisitRecord[]>(INITIAL_VISIT_RECORDS);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeScope, setActiveScope] = useState<ReportScopeFilter>('ALL');
  const [activeTier, setActiveTier] = useState<ReportTierFilter>('ALL');

  // Jurisdiction Locking: Users cannot filter/change jurisdictions equal to or above them
  const userRole = authManager?.role || ManagerRole.STATE_MANAGER;
  const isDistrictFixed =
    userRole === ManagerRole.DISTRICT_MANAGER ||
    userRole === ManagerRole.DIVISION_MANAGER ||
    userRole === ManagerRole.PINCODE_MANAGER;
  const isDivisionFixed =
    userRole === ManagerRole.DIVISION_MANAGER ||
    userRole === ManagerRole.PINCODE_MANAGER;
  const isPincodeFixed = userRole === ManagerRole.PINCODE_MANAGER;

  const userDefaultDistrict = authManager?.districtId || (isDistrictFixed ? 'dt-chn-01' : 'ALL');
  const userDefaultDivision = authManager?.divisionId || (isDivisionFixed ? 'div-chn-central' : 'ALL');
  const userDefaultPincode = authManager?.pincodeId || '';

  // Hierarchy Filter Modal state
  const [isFilterModalVisible, setIsFilterModalVisible] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(userDefaultDistrict);
  const [selectedDivision, setSelectedDivision] = useState<string>(userDefaultDivision);
  const [pincodeFilterInput, setPincodeFilterInput] = useState<string>(userDefaultPincode);

  // Dropdown Picker Modals
  const [showDistrictPicker, setShowDistrictPicker] = useState<boolean>(false);
  const [showDivisionPicker, setShowDivisionPicker] = useState<boolean>(false);

  // Applied filter state
  const [appliedDistrict, setAppliedDistrict] = useState<string>(userDefaultDistrict);
  const [appliedDivision, setAppliedDivision] = useState<string>(userDefaultDivision);
  const [appliedPincode, setAppliedPincode] = useState<string>(userDefaultPincode);

  // Synchronize initial state to jurisdiction
  useEffect(() => {
    if (isDistrictFixed) {
      setSelectedDistrict(userDefaultDistrict);
      setAppliedDistrict(userDefaultDistrict);
    }
    if (isDivisionFixed) {
      setSelectedDivision(userDefaultDivision);
      setAppliedDivision(userDefaultDivision);
    }
    if (isPincodeFixed) {
      setPincodeFilterInput(userDefaultPincode);
      setAppliedPincode(userDefaultPincode);
    }
  }, [isDistrictFixed, isDivisionFixed, isPincodeFixed, userDefaultDistrict, userDefaultDivision, userDefaultPincode]);

  // Modals for Actions
  const [isFieldVisitModalOpen, setIsFieldVisitModalOpen] = useState<boolean>(false);
  const [isGenerateReportModalOpen, setIsGenerateReportModalOpen] = useState<boolean>(false);
  const [exportResultModal, setExportResultModal] = useState<ExportResult | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressStage, setExportProgressStage] = useState<string>('');

  // Form State for Field Visit
  const [formShopName, setFormShopName] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Service');
  const [formPhotoCaptured, setFormPhotoCaptured] = useState<boolean>(false);
  const [formPhotoUri, setFormPhotoUri] = useState<string | null>(null);
  const [formPhotoName, setFormPhotoName] = useState<string | null>(null);
  const [formAddress, setFormAddress] = useState<string>('Parrys, Chennai');
  const [formPincode, setFormPincode] = useState<string>('600001');
  const [formLatitude, setFormLatitude] = useState<number | null>(13.0827);
  const [formLongitude, setFormLongitude] = useState<number | null>(80.2707);
  const [formGpsCoords, setFormGpsCoords] = useState<string | null>('13.0827° N, 80.2707° E');
  const [showStorefrontUploadModal, setShowStorefrontUploadModal] = useState<boolean>(false);
  const [showFormCategoryModal, setShowFormCategoryModal] = useState<boolean>(false);
  const [showFormReasonModal, setShowFormReasonModal] = useState<boolean>(false);
  const [formInterestStatus, setFormInterestStatus] = useState<'NONE' | 'YES' | 'NO'>('NONE');
  const [formNotInterestedReason, setFormNotInterestedReason] = useState<string>('Not interested in digital onboarding');
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Report Export Form State
  const [reportDateRange, setReportDateRange] = useState<string>('THIS_MONTH');
  const [reportFormat, setReportFormat] = useState<string>('PDF');

  const loadVisitRecords = useCallback(async () => {
    try {
      const list = await services.fieldVisitService.getVisitRecords();
      if (list && list.length > 0) {
        setRecords(list);
      }
    } catch {
      // Keep existing initial records
    }
  }, []);

  useEffect(() => {
    loadVisitRecords();
  }, [loadVisitRecords]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadVisitRecords();
    setIsRefreshing(false);
  };

  const getRecordManagerRole = (record: VisitRecord): ManagerRole => {
    const role = (record.managerRole || '').toLowerCase();
    if (role.includes('pincode')) return ManagerRole.PINCODE_MANAGER;
    if (role.includes('division')) return ManagerRole.DIVISION_MANAGER;
    if (role.includes('district')) return ManagerRole.DISTRICT_MANAGER;
    return ManagerRole.STATE_MANAGER;
  };

  const isMyReport = (record: VisitRecord): boolean => {
    const myName = (authManager?.name || 'Ramesh').toLowerCase();
    return (record.managerName || '').toLowerCase().includes(myName);
  };

  // Scope counts
  const scopeCounts = useMemo(() => {
    let myCount = 0;
    let equalCount = 0;
    let subCount = 0;

    records.forEach(r => {
      const role = getRecordManagerRole(r);
      if (isMyReport(r)) {
        myCount++;
      } else if (role === ManagerRole.STATE_MANAGER) {
        equalCount++;
      } else {
        subCount++;
      }
    });

    return {
      all: records.length,
      my: myCount,
      equal: equalCount,
      subordinate: subCount,
    };
  }, [records, authManager?.name]);

  // Tier counts
  const tierCounts = useMemo(() => {
    const counts = {
      [ManagerRole.STATE_MANAGER]: 0,
      [ManagerRole.DISTRICT_MANAGER]: 0,
      [ManagerRole.DIVISION_MANAGER]: 0,
      [ManagerRole.PINCODE_MANAGER]: 0,
    };
    records.forEach(r => {
      const role = getRecordManagerRole(r);
      if (counts[role] !== undefined) {
        counts[role]++;
      }
    });
    return counts;
  }, [records]);

  // District & Division dropdown options
  const districtOptions = [
    'ALL',
    'dt-chn-01',
    'dt-cbe-01',
    'dt-mdu-01',
    'dt-try-01',
    'dt-slm-01',
    'dt-tnv-01',
    'dt-vel-01',
    'dt-erd-01',
  ];

  const formatDistrictName = (id: string) => {
    if (id === 'ALL') return 'All Districts (Whole State)';
    if (id === 'dt-chn-01') return 'Chennai District';
    if (id === 'dt-cbe-01') return 'Coimbatore District';
    if (id === 'dt-mdu-01') return 'Madurai District';
    if (id === 'dt-try-01') return 'Tiruchirappalli District';
    if (id === 'dt-slm-01') return 'Salem District';
    if (id === 'dt-tnv-01') return 'Tirunelveli District';
    if (id === 'dt-vel-01') return 'Vellore District';
    if (id === 'dt-erd-01') return 'Erode District';
    return id;
  };

  const formatDivisionName = (id: string) => {
    if (id === 'ALL') return 'All Divisions';
    if (id === 'div-chn-central') return 'Chennai Central Division';
    if (id === 'div-chn-anna') return 'Anna Nagar Division';
    if (id === 'div-cbe-gandhi') return 'Gandhipuram Division (Coimbatore)';
    if (id === 'div-cbe-rspuram') return 'R.S. Puram Division (Coimbatore)';
    if (id === 'div-mdu-central') return 'Madurai Central Division';
    if (id === 'div-try-thillai') return 'Thillai Nagar Division (Trichy)';
    if (id === 'div-slm-sura') return 'Suramangalam Division (Salem)';
    if (id === 'div-tnv-palayam') return 'Palayamkottai Division (Tirunelveli)';
    if (id === 'div-vel-katpadi') return 'Katpadi Division (Vellore)';
    if (id === 'div-erd-perun') return 'Perundurai Division (Erode)';
    return id;
  };

  const divisionOptions = useMemo(() => {
    if (selectedDistrict === 'dt-chn-01') {
      return ['ALL', 'div-chn-central', 'div-chn-anna'];
    }
    if (selectedDistrict === 'dt-cbe-01') {
      return ['ALL', 'div-cbe-gandhi', 'div-cbe-rspuram'];
    }
    if (selectedDistrict === 'dt-mdu-01') {
      return ['ALL', 'div-mdu-central'];
    }
    if (selectedDistrict === 'dt-try-01') {
      return ['ALL', 'div-try-thillai'];
    }
    if (selectedDistrict === 'dt-slm-01') {
      return ['ALL', 'div-slm-sura'];
    }
    if (selectedDistrict === 'dt-tnv-01') {
      return ['ALL', 'div-tnv-palayam'];
    }
    if (selectedDistrict === 'dt-vel-01') {
      return ['ALL', 'div-vel-katpadi'];
    }
    if (selectedDistrict === 'dt-erd-01') {
      return ['ALL', 'div-erd-perun'];
    }
    return [
      'ALL',
      'div-chn-central',
      'div-chn-anna',
      'div-cbe-gandhi',
      'div-cbe-rspuram',
      'div-mdu-central',
      'div-try-thillai',
      'div-slm-sura',
      'div-tnv-palayam',
    ];
  }, [selectedDistrict]);

  const districtDropdownOptions = isDistrictFixed
    ? [
        {
          label: formatDistrictName(userDefaultDistrict),
          value: userDefaultDistrict,
          subtitle: 'Assigned Territory (Fixed)',
        },
      ]
    : districtOptions.map(dId => ({
        label: formatDistrictName(dId),
        value: dId,
        subtitle: dId === 'ALL' ? 'Search all reports across state' : `District code: ${dId}`,
      }));

  const divisionDropdownOptions = isDivisionFixed
    ? [
        {
          label: formatDivisionName(userDefaultDivision),
          value: userDefaultDivision,
          subtitle: 'Assigned Territory (Fixed)',
        },
      ]
    : divisionOptions.map(divId => ({
        label: formatDivisionName(divId),
        value: divId,
        subtitle: divId === 'ALL' ? 'Search all reports in district' : `Division code: ${divId}`,
      }));

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const role = getRecordManagerRole(r);
      const isMine = isMyReport(r);

      // 1. Scope filter
      if (activeScope === 'MY') {
        if (!isMine) return false;
      } else if (activeScope === 'EQUAL') {
        if (role !== ManagerRole.STATE_MANAGER || isMine) return false;
      } else if (activeScope === 'SUBORDINATE') {
        if (role === ManagerRole.STATE_MANAGER) return false;
      }

      // 2. Tier filter
      if (activeTier !== 'ALL' && role !== activeTier) {
        return false;
      }

      // 3. Applied District filter
      if (appliedDistrict !== 'ALL') {
        const dLabel = formatDistrictName(appliedDistrict).replace(' District', '').toLowerCase();
        const inLoc = r.location.toLowerCase().includes(dLabel);
        const inAddr = r.address ? r.address.toLowerCase().includes(dLabel) : false;
        if (!inLoc && !inAddr) {
          return false;
        }
      }

      // 4. Applied Division filter
      if (appliedDivision !== 'ALL') {
        const divLabel = formatDivisionName(appliedDivision).replace(' Division', '').toLowerCase();
        const inLoc = r.location.toLowerCase().includes(divLabel);
        const inAddr = r.address ? r.address.toLowerCase().includes(divLabel) : false;
        if (!inLoc && !inAddr) {
          return false;
        }
      }

      // 5. Applied Pincode filter
      if (appliedPincode.trim().length > 0) {
        const pinTerm = appliedPincode.trim();
        if (!r.pincode || !r.pincode.includes(pinTerm)) {
          if (!r.address || !r.address.includes(pinTerm)) return false;
        }
      }

      // 6. Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.trim().toLowerCase();
        const matchShop = r.shopName.toLowerCase().includes(q);
        const matchMgr = r.managerName.toLowerCase().includes(q);
        const matchLoc = r.location.toLowerCase().includes(q);
        const matchPin = r.pincode.toLowerCase().includes(q);
        const matchCat = r.category.toLowerCase().includes(q);
        if (!matchShop && !matchMgr && !matchLoc && !matchPin && !matchCat) {
          return false;
        }
      }

      return true;
    });
  }, [
    records,
    activeScope,
    activeTier,
    appliedDistrict,
    appliedDivision,
    appliedPincode,
    searchQuery,
    authManager?.name,
  ]);

  const handleApplyFilters = () => {
    setAppliedDistrict(selectedDistrict);
    setAppliedDivision(selectedDivision);
    setAppliedPincode(pincodeFilterInput);
    setIsFilterModalVisible(false);
  };

  const handleResetFilters = () => {
    const defaultDist = isDistrictFixed ? userDefaultDistrict : 'ALL';
    const defaultDiv = isDivisionFixed ? userDefaultDivision : 'ALL';
    const defaultPin = isPincodeFixed ? userDefaultPincode : '';

    setSelectedDistrict(defaultDist);
    setSelectedDivision(defaultDiv);
    setPincodeFilterInput(defaultPin);
    setAppliedDistrict(defaultDist);
    setAppliedDivision(defaultDiv);
    setAppliedPincode(defaultPin);
    setIsFilterModalVisible(false);
  };

  const hasActiveFilters =
    appliedDistrict !== 'ALL' || appliedDivision !== 'ALL' || appliedPincode.trim().length > 0;

  // Voice Note Timer
  useEffect(() => {
    if (isRecordingVoice) {
      setVoiceDuration(0);
      timerRef.current = setInterval(() => {
        setVoiceDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecordingVoice]);

  const handleCapturePhoto = async (mode: 'camera' | 'gallery' = 'camera') => {
    try {
      const result = await cameraLocationService.capturePhotoWithGps(mode);
      if (result && result.uri) {
        setFormPhotoUri(result.uri);
        setFormPhotoName(result.fileName || (mode === 'camera' ? 'Camera_Storefront.jpg' : 'Gallery_Storefront.jpg'));
        setFormPhotoCaptured(true);
      }
    } catch {
      // Photo capture canceled
    }
  };

  const resetVisitForm = () => {
    setFormShopName('');
    setFormCategory('Service');
    setFormPhotoCaptured(false);
    setFormPhotoUri(null);
    setFormPhotoName(null);
    setFormInterestStatus('NONE');
    setFormNotInterestedReason('Not interested in digital onboarding');
    setIsRecordingVoice(false);
    setRecordedAudioUri(null);
    setVoiceDuration(0);
  };

  const handleProceedToOnboarding = async () => {
    if (!formShopName.trim()) {
      Alert.alert('Shop Name Required', 'Please enter the Shop Name / Business Title before proceeding.');
      return;
    }
    if (!formPhotoCaptured || !formPhotoUri) {
      Alert.alert('Storefront Photo Required', 'Please attach or upload a storefront photo before proceeding.');
      return;
    }

    let uploadedPhotoUrl = formPhotoUri;
    try {
      uploadedPhotoUrl = await services.mediaUploadService.uploadShopPhoto(formPhotoUri);
    } catch (e) {
      console.warn('Photo upload warning:', e);
    }

    const newRecord: VisitRecord = {
      id: `visit_${Date.now()}_op_${Math.random().toString(36).substring(2, 6)}`,
      shopName: formShopName.trim(),
      vendorCode: `vendor${formShopName.replaceAll(/\s+/g, '').toUpperCase().slice(0, 8)}`,
      category: formCategory,
      managerName: authManager?.name || 'Ramesh Kumar',
      managerRole: authManager?.role ? authManager.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'State Manager',
      location: authManager?.territoryName || 'Chennai, Tamil Nadu',
      pincode: authManager?.pincodeId || '600001',
      timestamp: 'Just now',
      isInterested: true,
      photoUrl: uploadedPhotoUrl,
      gpsCoords: formGpsCoords || undefined,
    };

    setRecords(prev => [newRecord, ...prev]);
    setIsFieldVisitModalOpen(false);
    resetVisitForm();

    if (onNavigateRoute) {
      onNavigateRoute('AddVendor', { initialBusinessName: formShopName.trim(), initialCategory: formCategory });
    }
  };

  const handleSubmitNotInterestedRecord = async () => {
    if (!formShopName.trim()) {
      Alert.alert('Shop Name Required', 'Please enter the Shop Name / Business Title.');
      return;
    }
    if (!formPhotoCaptured || !formPhotoUri) {
      Alert.alert('Storefront Photo Required', 'Please attach or upload a storefront photo before submitting a visit record.');
      return;
    }
    if (!recordedAudioUri && voiceDuration === 0) {
      Alert.alert(
        'Voice Note Required',
        'Operational policy requires attaching a mandatory voice note explaining why the merchant declined interest.'
      );
      return;
    }

    let uploadedPhotoUrl = formPhotoUri;
    try {
      uploadedPhotoUrl = await services.mediaUploadService.uploadShopPhoto(formPhotoUri);
    } catch (e) {
      console.warn('Photo upload warning:', e);
    }

    const newRecord: VisitRecord = {
      id: `visit_${Date.now()}_op_${Math.random().toString(36).substring(2, 6)}`,
      shopName: formShopName.trim(),
      vendorCode: `vendor${formShopName.replaceAll(/\s+/g, '').toUpperCase().slice(0, 8)}`,
      category: formCategory,
      managerName: authManager?.name || 'Ramesh Kumar',
      managerRole: authManager?.role ? authManager.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'State Manager',
      location: authManager?.territoryName || 'Chennai, Tamil Nadu',
      pincode: authManager?.pincodeId || '600001',
      timestamp: 'Just now',
      isInterested: false,
      photoUrl: uploadedPhotoUrl,
      reasonNotInterested: formNotInterestedReason,
      voiceNoteDuration: voiceDuration || 12,
      gpsCoords: formGpsCoords || undefined,
    };

    setRecords(prev => [newRecord, ...prev]);
    setIsFieldVisitModalOpen(false);
    resetVisitForm();
    Alert.alert('Visit Record Submitted', 'Exception visit record logged with audio note and storefront photo.');
  };

  const handleExportPDF = async (record: VisitRecord) => {
    try {
      const result = await reportExportService.generateReportFile(
        [record],
        {
          period: 'THIS_MONTH',
          format: 'PDF',
          manager: authManager || undefined,
        },
      );
      setExportResultModal(result);
    } catch {
      Alert.alert('Export Error', 'Unable to generate PDF report.');
    }
  };

  const territoryScopeText = authManager?.territoryName || 'Tamil Nadu (Whole State)';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />

      {/* Header */}
      <FICHeader
        title="Reports"
        subtitle={`Scope: ${territoryScopeText}`}
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
        rightActionIcon={<Text style={styles.headerIcon}>↻</Text>}
        onRightAction={handleRefresh}
      />

      <FlatList
        data={filteredRecords}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerContentWrapper}>
            <View style={styles.titleActionRow}>
              <View>
                <Text style={styles.headerSubtitle}>Field Visit & Audit Reports</Text>
                <Text style={styles.scopeBadgeText}>
                  📍 Scope: {territoryScopeText}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.newVisitBtn}
                activeOpacity={0.8}
                onPress={() => setIsFieldVisitModalOpen(true)}
              >
                <Icon name="plus" size={16} color="#FFFFFF" />
                <Text style={styles.newVisitBtnText}>Field Visit</Text>
              </TouchableOpacity>
            </View>

            {/* Dark Tier Badges Bar */}
            <View style={styles.darkTierStatsCard}>
              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.STATE_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.STATE_MANAGER ? 'ALL' : ManagerRole.STATE_MANAGER,
                  )
                }
              >
                <Icon name="bank" size={14} color="#FBBF24" />
                <Text style={styles.darkTierPillText}>
                  L1 State ({tierCounts[ManagerRole.STATE_MANAGER]})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.DISTRICT_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.DISTRICT_MANAGER ? 'ALL' : ManagerRole.DISTRICT_MANAGER,
                  )
                }
              >
                <Icon name="office-building" size={14} color="#38BDF8" />
                <Text style={styles.darkTierPillText}>
                  L2 District ({tierCounts[ManagerRole.DISTRICT_MANAGER]})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.DIVISION_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.DIVISION_MANAGER ? 'ALL' : ManagerRole.DIVISION_MANAGER,
                  )
                }
              >
                <Icon name="layers-outline" size={14} color="#FB923C" />
                <Text style={styles.darkTierPillText}>
                  L3 Division ({tierCounts[ManagerRole.DIVISION_MANAGER]})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.darkTierPill,
                  activeTier === ManagerRole.PINCODE_MANAGER && styles.darkTierPillSelected,
                ]}
                onPress={() =>
                  setActiveTier(prev =>
                    prev === ManagerRole.PINCODE_MANAGER ? 'ALL' : ManagerRole.PINCODE_MANAGER,
                  )
                }
              >
                <Icon name="map-marker-outline" size={14} color="#818CF8" />
                <Text style={styles.darkTierPillText}>
                  L4 PIN ({tierCounts[ManagerRole.PINCODE_MANAGER]})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scope Switcher Tabs: All / My Reports / Equal / Subordinate */}
            <View style={styles.scopeSwitcherRow}>
              <TouchableOpacity
                style={[styles.scopeBtn, activeScope === 'ALL' && styles.scopeBtnActive]}
                onPress={() => setActiveScope('ALL')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'ALL' && styles.scopeBtnTextActive,
                  ]}
                >
                  All ({scopeCounts.all})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, activeScope === 'MY' && styles.scopeBtnActive]}
                onPress={() => setActiveScope('MY')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'MY' && styles.scopeBtnTextActive,
                  ]}
                >
                  My ({scopeCounts.my})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scopeBtn, activeScope === 'EQUAL' && styles.scopeBtnActive]}
                onPress={() => setActiveScope('EQUAL')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'EQUAL' && styles.scopeBtnTextActive,
                  ]}
                >
                  Equal ({scopeCounts.equal})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.scopeBtn,
                  activeScope === 'SUBORDINATE' && styles.scopeBtnActive,
                ]}
                onPress={() => setActiveScope('SUBORDINATE')}
              >
                <Text
                  style={[
                    styles.scopeBtnText,
                    activeScope === 'SUBORDINATE' && styles.scopeBtnTextActive,
                  ]}
                >
                  Subordinate ({scopeCounts.subordinate})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Search Input Bar + Filter Trigger Button */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <Icon name="magnify" size={20} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search reports by shop, manager, area..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearBtn}
                    onPress={() => setSearchQuery('')}
                  >
                    <Icon name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.filterModalTriggerBtn,
                  hasActiveFilters && styles.filterModalTriggerBtnActive,
                ]}
                onPress={() => {
                  setSelectedDistrict(appliedDistrict);
                  setSelectedDivision(appliedDivision);
                  setPincodeFilterInput(appliedPincode);
                  setIsFilterModalVisible(true);
                }}
              >
                <Icon
                  name="filter-variant"
                  size={16}
                  color={hasActiveFilters ? theme.colors.primary : '#475569'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.filterModalTriggerText,
                    hasActiveFilters && styles.filterModalTriggerTextActive,
                  ]}
                >
                  Filter ▾
                </Text>
              </TouchableOpacity>
            </View>

            {/* Horizontal Quick Tier Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickTierPillsScroll}
            >
              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === 'ALL' && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier('ALL')}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === 'ALL' && styles.tierQuickPillTextActive,
                  ]}
                >
                  All Tiers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.STATE_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.STATE_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.STATE_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L1 State
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.DISTRICT_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.DISTRICT_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.DISTRICT_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L2 District
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.DIVISION_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.DIVISION_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.DIVISION_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L3 Division
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tierQuickPill,
                  activeTier === ManagerRole.PINCODE_MANAGER && styles.tierQuickPillActive,
                ]}
                onPress={() => setActiveTier(ManagerRole.PINCODE_MANAGER)}
              >
                <Text
                  style={[
                    styles.tierQuickPillText,
                    activeTier === ManagerRole.PINCODE_MANAGER && styles.tierQuickPillTextActive,
                  ]}
                >
                  L4 PIN Code
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => {
          return (
            <FICCard style={styles.reportCard}>
              <View style={styles.cardHeaderRow}>
                <Image
                  source={{
                    uri:
                      item.photoUrl ||
                      'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
                  }}
                  style={styles.cardShopImage}
                />

                <View style={styles.cardMainCol}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardShopTitle} numberOfLines={1}>
                      {item.shopName}
                    </Text>
                    <View
                      style={[
                        styles.interestBadge,
                        item.isInterested ? styles.interestYes : styles.interestNo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.interestBadgeText,
                          item.isInterested ? styles.interestYesText : styles.interestNoText,
                        ]}
                      >
                        {item.isInterested ? 'Interested' : 'Declined'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.managerRoleText}>
                    👤 {item.managerName} ({item.managerRole})
                  </Text>

                  <Text style={styles.cardLocationText}>
                    📍 {item.location} ({item.pincode}) • 🕒 {item.timestamp}
                  </Text>

                  {item.reasonNotInterested && (
                    <Text style={styles.reasonText} numberOfLines={2}>
                      Note: {item.reasonNotInterested}
                    </Text>
                  )}
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.pdfReportBtn}
                  onPress={() => handleExportPDF(item)}
                >
                  <Icon name="file-pdf-box" size={16} color="#DC2626" />
                  <Text style={styles.pdfReportBtnText}>PDF Report</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navigateBtn}
                  onPress={() => {
                    googleMapsLocationService.openNavigation(
                      item.latitude || null,
                      item.longitude || null,
                      item.shopName,
                      item.location,
                    );
                  }}
                >
                  <Icon name="navigation-variant" size={16} color="#FFFFFF" />
                  <Text style={styles.navigateBtnText}>Navigate</Text>
                </TouchableOpacity>
              </View>
            </FICCard>
          );
        }}
        ListEmptyComponent={
          <FICEmptyState
            title="No Visit Reports Found"
            description="No reports match the selected hierarchy scope, tier, or filter criteria."
            actionTitle="Reset All Filters"
            onAction={handleResetFilters}
          />
        }
      />

      {/* ========================================================================= */}
      {/* Hierarchy Filter Options Modal with Native Dropdowns                      */}
      {/* ========================================================================= */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalTitle}>Hierarchy Filter Options</Text>
                <Text style={styles.modalSubtitle}>
                  State Portal ({territoryScopeText}) • Filter Reports
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Field 0: State (Fixed) */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="flag-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>State Jurisdiction</Text>
                <View style={styles.fixedBadge}>
                  <Icon name="lock-outline" size={11} color="#64748B" />
                  <Text style={styles.fixedBadgeText}>Fixed</Text>
                </View>
              </View>
              <View style={[styles.dropdownSelectorBox, styles.selectorBoxDisabled]}>
                <Text style={[styles.dropdownSelectorText, styles.dropdownSelectorTextDisabled]}>
                  Tamil Nadu (State-wide)
                </Text>
                <Icon name="lock-outline" size={18} color="#94A3B8" />
              </View>
            </View>

            {/* Field 1: District Dropdown Selector */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="bank" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>Select District (State Level)</Text>
                {isDistrictFixed && (
                  <View style={styles.fixedBadge}>
                    <Icon name="lock-outline" size={11} color="#64748B" />
                    <Text style={styles.fixedBadgeText}>Fixed</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.dropdownSelectorBox, isDistrictFixed && styles.selectorBoxDisabled]}
                activeOpacity={isDistrictFixed ? 1 : 0.8}
                onPress={() => !isDistrictFixed && setShowDistrictPicker(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    isDistrictFixed && styles.dropdownSelectorTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {formatDistrictName(selectedDistrict)}
                </Text>
                <Icon
                  name={isDistrictFixed ? 'lock-outline' : 'chevron-down'}
                  size={isDistrictFixed ? 18 : 20}
                  color={isDistrictFixed ? '#94A3B8' : theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Field 2: Division Dropdown Selector */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="layers-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>Select Division (Within District)</Text>
                {isDivisionFixed && (
                  <View style={styles.fixedBadge}>
                    <Icon name="lock-outline" size={11} color="#64748B" />
                    <Text style={styles.fixedBadgeText}>Fixed</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.dropdownSelectorBox, isDivisionFixed && styles.selectorBoxDisabled]}
                activeOpacity={isDivisionFixed ? 1 : 0.8}
                onPress={() => !isDivisionFixed && setShowDivisionPicker(true)}
              >
                <Text
                  style={[
                    styles.dropdownSelectorText,
                    isDivisionFixed && styles.dropdownSelectorTextDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {formatDivisionName(selectedDivision)}
                </Text>
                <Icon
                  name={isDivisionFixed ? 'lock-outline' : 'chevron-down'}
                  size={isDivisionFixed ? 18 : 20}
                  color={isDivisionFixed ? '#94A3B8' : theme.colors.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Field 3: Pincode */}
            <View style={styles.modalFormField}>
              <View style={styles.fieldLabelRow}>
                <Icon name="map-marker-outline" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fieldLabel}>Enter Pincode (Type to Search Locality)</Text>
                {isPincodeFixed && (
                  <View style={styles.fixedBadge}>
                    <Icon name="lock-outline" size={11} color="#64748B" />
                    <Text style={styles.fixedBadgeText}>Fixed</Text>
                  </View>
                )}
              </View>
              <View style={[styles.pincodeInputBox, isPincodeFixed && styles.selectorBoxDisabled]}>
                <Icon
                  name="email-outline"
                  size={20}
                  color={isPincodeFixed ? '#94A3B8' : theme.colors.primary}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={[styles.pincodeInput, isPincodeFixed && styles.dropdownSelectorTextDisabled]}
                  placeholder={isPincodeFixed ? userDefaultPincode : 'Type 6-digit Pincode (e.g. 600001)'}
                  placeholderTextColor="#94A3B8"
                  value={pincodeFilterInput}
                  onChangeText={setPincodeFilterInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isPincodeFixed}
                />
                {isPincodeFixed && <Icon name="lock-outline" size={18} color="#94A3B8" />}
              </View>
              <Text style={styles.fieldHint}>
                {isPincodeFixed
                  ? 'Your assigned pincode territory is locked.'
                  : 'Type full or partial pincode to search reports in that area.'}
              </Text>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionButtonsRow}>
              <TouchableOpacity style={styles.modalResetBtn} onPress={handleResetFilters}>
                <Text style={styles.modalResetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalApplyBtn} onPress={handleApplyFilters}>
                <Text style={styles.modalApplyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* District Picker Dropdown Modal */}
      <FICDropdownModal
        visible={showDistrictPicker}
        title="Select District"
        options={districtDropdownOptions}
        selectedValue={selectedDistrict}
        onSelect={val => {
          setSelectedDistrict(val);
          setSelectedDivision('ALL');
        }}
        onClose={() => setShowDistrictPicker(false)}
      />

      {/* Division Picker Dropdown Modal */}
      <FICDropdownModal
        visible={showDivisionPicker}
        title="Select Division"
        options={divisionDropdownOptions}
        selectedValue={selectedDivision}
        onSelect={val => setSelectedDivision(val)}
        onClose={() => setShowDivisionPicker(false)}
      />

      {/* Field Visit Modal (Full 3-Step Workflow) */}
      <Modal
        visible={isFieldVisitModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFieldVisitModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.fieldVisitModalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={styles.modalIconBadge}>
                  <Icon name="storefront-outline" size={22} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Field Shop Visit</Text>
                  <Text style={styles.modalSubtitle}>
                    Shop Details, Storefront Photo & Interest Decision
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setIsFieldVisitModalOpen(false)}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              {/* STEP 1: Shop Details & Category */}
              <View style={styles.stepBox}>
                <View style={styles.stepHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>1</Text>
                  </View>
                  <Text style={styles.stepTitle}>Shop Details & Business Category *</Text>
                </View>

                <View style={styles.stepInputsRow}>
                  <View style={[styles.inputGroupCol, { flex: 1.2 }]}>
                    <Text style={styles.fieldLabelStep}>Shop Name / Business Title</Text>
                    <TextInput
                      style={styles.textInputStyle}
                      placeholder="e.g. Sri Lakshmi Supermarket"
                      placeholderTextColor="#94A3B8"
                      value={formShopName}
                      onChangeText={setFormShopName}
                    />
                  </View>

                  <View style={[styles.inputGroupCol, { flex: 1 }]}>
                    <Text style={styles.fieldLabelStep}>Business Category</Text>
                    <TouchableOpacity
                      style={styles.selectCategoryBtn}
                      onPress={() => setShowFormCategoryModal(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectCategoryText}>{formCategory}</Text>
                      <Icon name="chevron-down" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* STEP 2: Shop Storefront Photo (Manual Upload & Real Working Photo) */}
              <View style={styles.stepBox}>
                <View style={styles.stepHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>2</Text>
                  </View>
                  <Text style={styles.stepTitle}>Shop Storefront Photo *</Text>
                </View>

                {formPhotoUri ? (
                  <View style={styles.storefrontPreviewContainer}>
                    <Image source={{ uri: formPhotoUri }} style={styles.storefrontPreviewImage} resizeMode="cover" />
                    <View style={styles.storefrontMetaRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Icon name="check-circle" size={16} color="#16A34A" style={{ marginRight: 5 }} />
                          <Text style={styles.storefrontAttachedTitle}>
                            Storefront Photo Attached
                          </Text>
                        </View>
                        <Text style={styles.storefrontAttachedSubtitle} numberOfLines={1}>
                          {formPhotoName || 'Real Storefront Photo'} • Verified
                        </Text>
                      </View>
                      <View style={styles.storefrontBtnGroup}>
                        <TouchableOpacity
                          style={styles.storefrontChangeBtn}
                          onPress={() => setShowStorefrontUploadModal(true)}
                          activeOpacity={0.8}
                        >
                          <Icon name="folder-image" size={14} color={theme.colors.primary} style={{ marginRight: 4 }} />
                          <Text style={styles.storefrontChangeBtnText}>Change</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.storefrontRemoveBtn}
                          onPress={() => {
                            setFormPhotoUri(null);
                            setFormPhotoName(null);
                            setFormPhotoCaptured(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <Icon name="trash-can-outline" size={16} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.storefrontUploadBox}>
                    <TouchableOpacity
                      style={styles.storefrontUploadCard}
                      onPress={() => setShowStorefrontUploadModal(true)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.storefrontUploadIconWrap}>
                        <Icon name="cloud-upload" size={26} color={theme.colors.primary} />
                      </View>
                      <Text style={styles.storefrontUploadMainText}>Click to upload storefront photo</Text>
                      <Text style={styles.storefrontUploadSubText}>
                        Manual upload from Device Gallery or snap with Camera
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.quickUploadActionsRow}>
                      <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => handleCapturePhoto('camera')}
                        activeOpacity={0.8}
                      >
                        <Icon name="camera" size={16} color={theme.colors.primary} style={{ marginRight: 6 }} />
                        <Text style={styles.quickActionBtnText}>Camera</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.quickActionBtn, styles.quickActionBtnGallery]}
                        onPress={() => handleCapturePhoto('gallery')}
                        activeOpacity={0.8}
                      >
                        <Icon name="image-multiple" size={16} color="#16A34A" style={{ marginRight: 6 }} />
                        <Text style={[styles.quickActionBtnText, { color: '#15803D' }]}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* STEP 3: Merchant Interest Status */}
              <View style={styles.stepBox}>
                <View style={styles.stepHeaderRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>3</Text>
                  </View>
                  <Text style={styles.stepTitle}>Merchant Interest Status *</Text>
                </View>

                <View style={styles.interestDecisionRow}>
                  <TouchableOpacity
                    style={[
                      styles.interestBtn,
                      formInterestStatus === 'YES' && styles.interestBtnYesActive,
                    ]}
                    onPress={() => setFormInterestStatus('YES')}
                    activeOpacity={0.8}
                  >
                    <Icon
                      name="thumb-up-outline"
                      size={20}
                      color={formInterestStatus === 'YES' ? '#059669' : '#475569'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.interestBtnText,
                        formInterestStatus === 'YES' && styles.interestBtnTextYes,
                      ]}
                    >
                      YES (Interested)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.interestBtn,
                      formInterestStatus === 'NO' && styles.interestBtnNoActive,
                    ]}
                    onPress={() => setFormInterestStatus('NO')}
                    activeOpacity={0.8}
                  >
                    <Icon
                      name="thumb-down-outline"
                      size={20}
                      color={formInterestStatus === 'NO' ? '#DC2626' : '#475569'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.interestBtnText,
                        formInterestStatus === 'NO' && styles.interestBtnTextNo,
                      ]}
                    >
                      NO (Not Interested)
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* YES (INTERESTED) WORKFLOW */}
                {formInterestStatus === 'YES' && (
                  <View style={styles.yesWorkflowContainer}>
                    <Text style={styles.yesWorkflowHeading}>Ready to Onboard Merchant.</Text>
                    <Text style={styles.yesWorkflowSub}>
                      Proceed to the 5-step Vendor Registration form.
                    </Text>

                    <TouchableOpacity
                      style={styles.proceedOnboardingBtn}
                      activeOpacity={0.85}
                      onPress={handleProceedToOnboarding}
                    >
                      <Text style={styles.proceedOnboardingBtnText}>
                        Proceed to Onboarding Form →
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* NO (NOT INTERESTED) WORKFLOW */}
                {formInterestStatus === 'NO' && (
                  <View style={styles.noWorkflowContainer}>
                    <Text style={styles.noWorkflowLabel}>Select Reason for Refusal *</Text>
                    <TouchableOpacity
                      style={styles.reasonDropdownBtn}
                      onPress={() => setShowFormReasonModal(true)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.reasonDropdownText}>{formNotInterestedReason}</Text>
                      <Icon name="chevron-down" size={18} color="#64748B" />
                    </TouchableOpacity>

                    <Text style={[styles.noWorkflowLabel, { marginTop: 14 }]}>
                      Mandatory Voice Note *
                    </Text>

                    {/* Talk & Hear Voice Recorder / Player Component */}
                    <FICAudioPlayerRecorder
                      title="🎙️ Voice Note / Field Audit Audio"
                      subtitle="Record audio explanation of merchant refusal. Talk into mic and press play to listen back."
                      recordedAudioUri={recordedAudioUri}
                      audioDurationSeconds={voiceDuration}
                      onStartRecording={() => setIsRecordingVoice(true)}
                      onStopRecording={(uri, durationSecs) => {
                        setRecordedAudioUri(uri);
                        setVoiceDuration(durationSecs);
                        setIsRecordingVoice(false);
                      }}
                      onDeleteRecording={() => {
                        setRecordedAudioUri(null);
                        setVoiceDuration(0);
                        setIsRecordingVoice(false);
                      }}
                    />

                    <TouchableOpacity
                      style={styles.submitNotInterestedBtn}
                      onPress={handleSubmitNotInterestedRecord}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.submitNotInterestedBtnText}>Submit Visit Record</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Storefront Image Upload Modal */}
      <FICImageUploadModal
        visible={showStorefrontUploadModal}
        title="Upload Storefront Photo"
        subtitle="Upload shop front board photo with GPS verification."
        onImageSelected={(uri) => {
          setFormPhotoUri(uri);
          setFormPhotoName('Storefront_Photo.jpg');
          setFormPhotoCaptured(true);
          setShowStorefrontUploadModal(false);
        }}
        onClose={() => setShowStorefrontUploadModal(false)}
      />

      {/* Form Category Picker Modal */}
      <FICDropdownModal
        visible={showFormCategoryModal}
        title="Select Business Category"
        options={[
          { label: 'Service', value: 'Service' },
          { label: 'Product', value: 'Product' },
          { label: 'Food', value: 'Food' },
          { label: 'Daily Needs', value: 'Daily Needs' },
          { label: 'Travel', value: 'Travel' },
          { label: 'Stay', value: 'Stay' },
          { label: 'Jobs', value: 'Jobs' },
        ]}
        selectedValue={formCategory}
        onSelect={val => setFormCategory(val)}
        onClose={() => setShowFormCategoryModal(false)}
      />

      {/* Form Refusal Reason Picker Modal */}
      <FICDropdownModal
        visible={showFormReasonModal}
        title="Select Reason for Refusal"
        options={[
          { label: 'Not interested in digital onboarding', value: 'Not interested in digital onboarding' },
          { label: 'Already registered with competitor platform', value: 'Already registered with competitor platform' },
          { label: 'Owner / Decision maker not available', value: 'Owner / Decision maker not available' },
          { label: 'High commission rate concerns', value: 'High commission rate concerns' },
          { label: 'Cash-only business policy', value: 'Cash-only business policy' },
          { label: 'Shop closing / relocation planned', value: 'Shop closing / relocation planned' },
        ]}
        selectedValue={formNotInterestedReason}
        onSelect={val => setFormNotInterestedReason(val)}
        onClose={() => setShowFormReasonModal(false)}
      />

      {/* Export Result Modal */}
      {exportResultModal && (
        <Modal
          visible={Boolean(exportResultModal)}
          transparent
          animationType="fade"
          onRequestClose={() => setExportResultModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.filterModalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>Report Exported</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setExportResultModal(null)}
                >
                  <Icon name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>
                Report "{exportResultModal.fileName}" generated successfully ({exportResultModal.recordCount} records).
              </Text>
              <TouchableOpacity
                style={styles.modalApplyBtn}
                onPress={() => setExportResultModal(null)}
              >
                <Text style={styles.modalApplyBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  headerContentWrapper: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  titleActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerSubtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  scopeBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: theme.spacing.xs,
  },
  newVisitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  newVisitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Dark Tier Badges Bar
  darkTierStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 6,
    marginVertical: theme.spacing.xs,
    justifyContent: 'space-between',
    gap: 4,
  },
  darkTierPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 3,
    borderRadius: 6,
    backgroundColor: '#334155',
    gap: 3,
  },
  darkTierPillSelected: {
    backgroundColor: theme.colors.primary,
  },
  darkTierPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F8FAFC',
  },

  // Scope Switcher Tabs
  scopeSwitcherRow: {
    flexDirection: 'row',
    marginVertical: theme.spacing.xs,
    gap: 6,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  scopeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  scopeBtnTextActive: {
    color: theme.colors.surface,
  },

  // Search & Filter
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filterModalTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    height: 44,
  },
  filterModalTriggerBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary,
  },
  filterModalTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  filterModalTriggerTextActive: {
    color: theme.colors.primary,
  },

  // Quick Tier Filter Pills
  quickTierPillsScroll: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.xs,
    gap: 6,
  },
  tierQuickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tierQuickPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tierQuickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  tierQuickPillTextActive: {
    color: '#FFFFFF',
  },

  // Report Card
  reportCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardShopImage: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.sm,
    backgroundColor: '#E2E8F0',
  },
  cardMainCol: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cardShopTitle: {
    ...theme.typography.title,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    flex: 1,
    marginRight: 6,
  },
  interestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  interestYes: {
    backgroundColor: '#DCFCE7',
  },
  interestNo: {
    backgroundColor: '#FEE2E2',
  },
  interestBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  interestYesText: {
    color: '#15803D',
  },
  interestNoText: {
    color: '#DC2626',
  },
  managerRoleText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 1,
  },
  cardLocationText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  reasonText: {
    fontSize: 10,
    color: '#DC2626',
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: theme.spacing.xs,
  },
  pdfReportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  pdfReportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  navigateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.primary,
    gap: 4,
  },
  navigateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  filterModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFormField: {
    marginBottom: 14,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  fixedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    gap: 3,
  },
  fixedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  dropdownSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  selectorBoxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  dropdownSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  dropdownSelectorTextDisabled: {
    color: '#64748B',
    fontWeight: '600',
  },
  pincodeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  pincodeInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  fieldHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalResetBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalResetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  modalApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalApplyBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Field Visit Full Modal Styles
  fieldVisitModalContent: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  modalIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalScrollBody: {
    maxHeight: 520,
    marginTop: 6,
  },
  stepBox: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputGroupCol: {
    flex: 1,
  },
  fieldLabelStep: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  textInputStyle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
  },
  selectCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  selectCategoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  storefrontPreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    padding: 10,
  },
  storefrontPreviewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  storefrontMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storefrontAttachedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
  },
  storefrontAttachedSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  storefrontBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storefrontChangeBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  storefrontChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  storefrontRemoveBtn: {
    backgroundColor: '#FEE2E2',
    padding: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storefrontUploadBox: {
    gap: 8,
  },
  storefrontUploadCard: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storefrontUploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  storefrontUploadMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  storefrontUploadSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  quickUploadActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 8,
  },
  quickActionBtnGallery: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  quickActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  interestDecisionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  interestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
  },
  interestBtnYesActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  interestBtnNoActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  interestBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  interestBtnTextYes: {
    color: '#047857',
  },
  interestBtnTextNo: {
    color: '#B91C1C',
  },
  yesWorkflowContainer: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  yesWorkflowHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
    marginBottom: 2,
  },
  yesWorkflowSub: {
    fontSize: 11,
    color: '#065F46',
    marginBottom: 10,
  },
  proceedOnboardingBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  proceedOnboardingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  noWorkflowContainer: {
    marginTop: 14,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  noWorkflowLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    marginBottom: 6,
  },
  reasonDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
  },
  reasonDropdownText: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  submitNotInterestedBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 14,
  },
  submitNotInterestedBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
