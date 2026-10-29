import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { DailyReport, DailyReportVendorVisited, Vendor } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICButton } from '../../components/ui/FICButton';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { VendorPickerModal } from './components/VendorPickerModal';
import { SubmitDailyReportPayload } from '../../services/repositories/IDailyReportRepository';

export interface DailyReportScreenProps {
  initialVendorId?: string;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const getFormattedCurrentDate = (d = new Date()): { displayDate: string; isoDate: string } => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const displayDate = `${day} ${monthName} ${year}`;
  
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const isoDate = `${year}-${m}-${dd}`;

  return { displayDate, isoDate };
};

export const DailyReportScreen: React.FC<DailyReportScreenProps> = ({
  initialVendorId,
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const dateInfo = getFormattedCurrentDate();

  const [existingReport, setExistingReport] = useState<DailyReport | null>(null);
  const [isLoadingCheck, setIsLoadingCheck] = useState<boolean>(true);

  // 1. Shops Visited Counter
  const [shopsVisitedCount, setShopsVisitedCount] = useState<number>(4);
  const [vendorsVisited, setVendorsVisited] = useState<DailyReportVendorVisited[]>([]);

  // 2. Day Summary
  const [workSummary, setWorkSummary] = useState<string>('');

  // 3. Voice Memo (.m4a/.aac)
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [voiceUri, setVoiceUri] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 4. Photo Attachments
  const [photo1, setPhoto1] = useState<string | null>(null);
  const [photo2, setPhoto2] = useState<string | null>(null);

  // 5. Optional Notes & Issues Follow-Up
  const [issuesFollowUp, setIssuesFollowUp] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // UI State
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState<boolean>(false);
  const [isVendorPickerVisible, setIsVendorPickerVisible] = useState<boolean>(false);

  const checkExistingTodayReport = useCallback(async () => {
    setIsLoadingCheck(true);
    setSubmitError(null);
    try {
      const managerId = manager?.id || 'mgr-000';
      const found = await services.dailyReportRepository.getTodayReport(managerId, dateInfo.isoDate);
      if (found) {
        setExistingReport(found);
      }
    } catch {
      // Ignore initial check failure
    } finally {
      setIsLoadingCheck(false);
    }
  }, [manager, dateInfo.isoDate]);

  useEffect(() => {
    checkExistingTodayReport();
  }, [checkExistingTodayReport]);

  // Automatically sync newly added or navigated vendor directly into daily report
  useEffect(() => {
    const syncVendorsIntoReport = async () => {
      try {
        // 1. If an explicit vendorId was passed via navigation
        if (initialVendorId) {
          const vendor = await services.vendorRepository.getVendorById(initialVendorId);
          if (vendor) {
            setVendorsVisited(prev => {
              if (prev.some(v => v.vendorId === vendor.id)) return prev;
              return [
                ...prev,
                {
                  vendorId: vendor.id,
                  vendorName: vendor.businessName,
                  location: vendor.locationDistrict || vendor.address || 'Field Location',
                },
              ];
            });
            setShopsVisitedCount(prev => Math.max(prev, 1));
            setWorkSummary(prev => {
              if (prev.trim()) return prev;
              return `Completed territory field visit and onboarding for ${vendor.businessName} in ${vendor.locationDistrict || 'territory'}. Verified documents and storefront signage.`;
            });
          }
        }

        // 2. Also sync any pending vendors added today
        const pendingVendors = services.fieldVisitService.getPendingDailyReportVendors();
        if (pendingVendors.length > 0) {
          setVendorsVisited(prev => {
            const existingIds = new Set(prev.map(v => v.vendorId));
            const newlyAdded: DailyReportVendorVisited[] = [];
            for (const pv of pendingVendors) {
              if (!existingIds.has(pv.id)) {
                newlyAdded.push({
                  vendorId: pv.id,
                  vendorName: pv.businessName,
                  location: pv.locationDistrict || pv.address || 'Field Location',
                });
                existingIds.add(pv.id);
              }
            }
            return [...prev, ...newlyAdded];
          });
          setShopsVisitedCount(prev => Math.max(prev, pendingVendors.length));
        }
      } catch {
        // Ignore sync failure
      }
    };

    syncVendorsIntoReport();
  }, [initialVendorId]);

  // Voice recording duration timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      await services.audioRecorderService.startRecording();
      setIsRecording(true);
      setVoiceUri(null);
    } catch {
      Alert.alert('Microphone Error', 'Unable to start audio recording.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const result = await services.audioRecorderService.stopRecording();
      setIsRecording(false);
      setVoiceUri(result.filePath);
    } catch {
      setIsRecording(false);
    }
  };

  const handleTogglePlayback = () => {
    if (!voiceUri) return;
    setIsPlayingAudio(!isPlayingAudio);
    if (!isPlayingAudio) {
      setTimeout(() => setIsPlayingAudio(false), 3000);
    }
  };

  const handleAddVendor = (vendor: Vendor) => {
    setVendorsVisited(prev => [
      ...prev,
      {
        vendorId: vendor.id,
        vendorName: vendor.businessName,
        location: vendor.address || vendor.districtId,
      },
    ]);
    setShopsVisitedCount(prev => prev + 1);
  };

  const handleRemoveVendor = (vendorId: string) => {
    setVendorsVisited(prev => prev.filter(v => v.vendorId !== vendorId));
    setShopsVisitedCount(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    setValidationError(null);
    setSubmitError(null);

    const trimmedWork = workSummary.trim();
    if (!trimmedWork) {
      setValidationError("Please enter today's work summary.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const managerId = manager?.id || 'mgr-000';
      const payload: SubmitDailyReportPayload = {
        managerId,
        date: dateInfo.isoDate,
        workSummary: trimmedWork,
        shopsVisitedCount,
        vendorsVisited,
        voiceUrl: voiceUri || undefined,
        voiceDurationSeconds: recordingDuration || undefined,
        photo1Url: photo1 || undefined,
        photo2Url: photo2 || undefined,
        issuesFollowUp: issuesFollowUp.trim() || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
      };

      await services.dailyReportRepository.submitDailyReport(payload);
      setIsSubmittedSuccess(true);
    } catch (err: any) {
      // Offline fallback
      await services.offlineQueueService.enqueue('SUBMIT_DAILY_REPORT', {
        managerId: manager?.id || 'mgr-000',
        date: dateInfo.isoDate,
        workSummary: trimmedWork,
        shopsVisitedCount,
      });

      Alert.alert(
        'Offline Mode',
        'Saved offline — will sync when connection is restored.',
        [{ text: 'OK', onPress: () => setIsSubmittedSuccess(true) }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDonePress = () => {
    if (onNavigateRoute) {
      onNavigateRoute('Dashboard');
    }
  };

  if (isLoadingCheck) {
    return <FICLoadingState message="Checking daily report status..." />;
  }

  // Already submitted today
  if (existingReport && !isSubmittedSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
        <FICHeader
          title="Daily Report"
          subtitle={dateInfo.displayDate}
          leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
          onLeftAction={onOpenDrawer}
        />
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          <FICCard style={[styles.card, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
            <View style={styles.successIconRow}>
              <Icon name="check-circle" size={36} color="#16A34A" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.alreadySubmittedTitle}>Report Submitted for Today</Text>
                <Text style={styles.alreadySubmittedSub}>{dateInfo.displayDate}</Text>
              </View>
            </View>
            <Text style={styles.existingWorkSummary}>{existingReport.workSummary}</Text>
            <View style={styles.statsSummaryRow}>
              <Text style={styles.statsSummaryText}>
                🏪 {existingReport.shopsVisitedCount || existingReport.vendorsVisited?.length || 0} Shops Visited
              </Text>
            </View>
          </FICCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Submitted success state
  if (isSubmittedSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
        <FICHeader title="Report Submitted" />
        <View style={styles.successContainer}>
          <Icon name="check-circle" size={64} color="#16A34A" style={{ marginBottom: 16 }} />
          <Text style={styles.successHeading}>Daily Report Submitted</Text>
          <Text style={styles.successSubtext}>
            Your daily operational report for {dateInfo.displayDate} has been logged and synchronized.
          </Text>
          <FICButton title="Return to Dashboard" onPress={handleDonePress} style={{ width: '100%', marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Daily Report"
        subtitle={dateInfo.displayDate}
        leftActionIcon={<Text style={styles.headerIcon}>☰</Text>}
        onLeftAction={onOpenDrawer}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {validationError ? (
            <View style={styles.errorAlert}>
              <Icon name="alert-circle-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorAlertText}>{validationError}</Text>
            </View>
          ) : null}

          {/* 1. SHOPS VISITED COUNTER */}
          <FICCard style={styles.card}>
            <Text style={styles.sectionHeading}>1. Shops Visited Counter</Text>
            <Text style={styles.sectionSubtitle}>
              Total merchant outlets visited during territory operational shift:
            </Text>

            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setShopsVisitedCount(prev => Math.max(0, prev - 1))}
                activeOpacity={0.7}
              >
                <Icon name="minus" size={20} color="#1E293B" />
              </TouchableOpacity>

              <View style={styles.counterDisplay}>
                <Text style={styles.counterValue}>{shopsVisitedCount}</Text>
                <Text style={styles.counterLabel}>Outlets Visited</Text>
              </View>

              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() => setShopsVisitedCount(prev => prev + 1)}
                activeOpacity={0.7}
              >
                <Icon name="plus" size={20} color="#1E293B" />
              </TouchableOpacity>
            </View>

            {/* List tagged vendors */}
            <TouchableOpacity
              style={styles.tagVendorBtn}
              onPress={() => setIsVendorPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Icon name="tag-plus-outline" size={18} color="#1D4ED8" style={{ marginRight: 6 }} />
              <Text style={styles.tagVendorBtnText}>Tag Specific Merchants Visited ({vendorsVisited.length})</Text>
            </TouchableOpacity>

            {vendorsVisited.length > 0 && (
              <View style={styles.taggedList}>
                {vendorsVisited.map(v => (
                  <View key={v.vendorId} style={styles.taggedChip}>
                    <Text style={styles.taggedText} numberOfLines={1}>🏪 {v.vendorName}</Text>
                    <TouchableOpacity onPress={() => handleRemoveVendor(v.vendorId)}>
                      <Icon name="close" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </FICCard>

          {/* 2. DAY SUMMARY */}
          <FICCard style={styles.card}>
            <Text style={styles.sectionHeading}>2. Day Summary *</Text>
            <Text style={styles.sectionSubtitle}>
              Summarize operational activities, merchant interactions, and milestones achieved:
            </Text>
            <FICTextInput
              placeholder="e.g. Conducted 4 merchant visits in Dharmapuri. Onboarded 1 wholesale vendor and verified 3 QR soundboxes..."
              multiline
              numberOfLines={4}
              value={workSummary}
              onChangeText={setWorkSummary}
            />
          </FICCard>

          {/* 3. VOICE MEMO (.m4a / .aac) */}
          <FICCard style={styles.card}>
            <Text style={styles.sectionHeading}>3. Voice Memo (.m4a / .aac)</Text>
            <Text style={styles.sectionSubtitle}>
              Record an audio memo summarizing field observations:
            </Text>

            <View style={styles.voiceRecordBox}>
              {isRecording ? (
                <View style={styles.recordingState}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.recordingTimer}>
                    Recording: {recordingDuration}s (.m4a)
                  </Text>
                  {/* Waveform Visualization */}
                  <View style={styles.waveformRow}>
                    {[12, 24, 18, 32, 14, 28, 20, 36, 16, 26, 14].map((h, i) => (
                      <View key={i} style={[styles.waveBar, { height: h }]} />
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.stopRecordBtn}
                    onPress={handleStopRecording}
                    activeOpacity={0.8}
                  >
                    <Icon name="stop" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.stopRecordText}>Stop Recording</Text>
                  </TouchableOpacity>
                </View>
              ) : voiceUri ? (
                <View style={styles.audioPlaybackRow}>
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={handleTogglePlayback}
                    activeOpacity={0.8}
                  >
                    <Icon name={isPlayingAudio ? 'pause' : 'play'} size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.audioTitleText}>Voice Memo Attached ({recordingDuration || 24}s)</Text>
                    <Text style={styles.audioFormatText}>Audio format: AAC / .m4a</Text>
                  </View>
                  <TouchableOpacity onPress={() => setVoiceUri(null)}>
                    <Icon name="delete-outline" size={22} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.startRecordBtn}
                  onPress={handleStartRecording}
                  activeOpacity={0.8}
                >
                  <Icon name="microphone" size={24} color="#1D4ED8" style={{ marginRight: 8 }} />
                  <Text style={styles.startRecordText}>Start Voice Recording</Text>
                </TouchableOpacity>
              )}
            </View>
          </FICCard>

          {/* 4. PHOTO ATTACHMENTS (2 Storefront Photos) */}
          <FICCard style={styles.card}>
            <Text style={styles.sectionHeading}>4. Storefront Photo Attachments</Text>
            <Text style={styles.sectionSubtitle}>
              Attach up to 2 field photographs for ground verification:
            </Text>

            <View style={styles.photosGrid}>
              {/* Photo 1 */}
              <View style={styles.photoCol}>
                <Text style={styles.photoLabel}>Storefront Photo 1</Text>
                {photo1 ? (
                  <View style={styles.photoAttachedBox}>
                    <Icon name="image-check" size={28} color="#16A34A" />
                    <Text style={styles.photoAttachedText}>Photo 1 Attached</Text>
                    <TouchableOpacity onPress={() => setPhoto1(null)}>
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.photoPlaceholder}
                    onPress={() => setPhoto1('storefront_photo_1.jpg')}
                    activeOpacity={0.7}
                  >
                    <Icon name="camera-plus-outline" size={26} color="#64748B" />
                    <Text style={styles.uploadPhotoText}>Add Photo 1</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Photo 2 */}
              <View style={styles.photoCol}>
                <Text style={styles.photoLabel}>Storefront Photo 2</Text>
                {photo2 ? (
                  <View style={styles.photoAttachedBox}>
                    <Icon name="image-check" size={28} color="#16A34A" />
                    <Text style={styles.photoAttachedText}>Photo 2 Attached</Text>
                    <TouchableOpacity onPress={() => setPhoto2(null)}>
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.photoPlaceholder}
                    onPress={() => setPhoto2('storefront_photo_2.jpg')}
                    activeOpacity={0.7}
                  >
                    <Icon name="camera-plus-outline" size={26} color="#64748B" />
                    <Text style={styles.uploadPhotoText}>Add Photo 2</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </FICCard>

          {/* 5. OPTIONAL NOTES & ISSUES */}
          <FICCard style={styles.card}>
            <Text style={styles.sectionHeading}>5. Optional Notes & Issue Follow-Ups</Text>
            <FICTextInput
              label="Issue Follow-Ups"
              placeholder="e.g. Awaiting QR replacement at Fresh Mart..."
              value={issuesFollowUp}
              onChangeText={setIssuesFollowUp}
            />
            <FICTextInput
              label="Additional Notes"
              placeholder="Any other observations or inventory requests..."
              value={additionalNotes}
              onChangeText={setAdditionalNotes}
            />
          </FICCard>

          {/* Submit Button */}
          <FICButton
            title="Submit Daily Report"
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <VendorPickerModal
        visible={isVendorPickerVisible}
        onClose={() => setIsVendorPickerVisible(false)}
        onSelectVendor={handleAddVendor}
        alreadySelectedIds={vendorsVisited.map(v => v.vendorId)}
      />
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
    color: '#0F172A',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  counterDisplay: {
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tagVendorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  tagVendorBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  taggedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  taggedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  taggedText: {
    fontSize: 12,
    color: '#1E293B',
    maxWidth: 160,
  },
  voiceRecordBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  startRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  startRecordText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  recordingState: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    marginBottom: 6,
  },
  recordingTimer: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 10,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    marginBottom: 12,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: '#DC2626',
  },
  stopRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stopRecordText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  audioPlaybackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1D4ED8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  audioFormatText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  photoCol: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  photoPlaceholder: {
    height: 100,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  uploadPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  photoAttachedBox: {
    height: 100,
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoAttachedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  removePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  submitBtn: {
    marginTop: 8,
    marginBottom: 20,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorAlertText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  successIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alreadySubmittedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  alreadySubmittedSub: {
    fontSize: 12,
    color: '#15803D',
  },
  existingWorkSummary: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  statsSummaryRow: {
    borderTopWidth: 1,
    borderTopColor: '#DCFCE7',
    paddingTop: 8,
  },
  statsSummaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
});
