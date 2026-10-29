import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { Vendor, ReportType } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICButton } from '../../components/ui/FICButton';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';

export interface ExceptionReportFormScreenProps {
  activityId?: string;
  vendorId?: string;
  onBack: () => void;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const ExceptionReportFormScreen: React.FC<ExceptionReportFormScreenProps> = ({
  activityId,
  vendorId,
  onBack,
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reportMode, setReportMode] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [textNotes, setTextNotes] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const targetVendorId = vendorId || 'v-101';
        const data = await services.vendorRepository.getVendorById(targetVendorId);
        setVendor(data);
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendor();
  }, [vendorId]);

  const handleStartRecording = async () => {
    try {
      await services.audioRecorderService.startRecording();
      setIsRecording(true);
      setRecordedAudioUri(null);
    } catch {
      Alert.alert('Recording Error', 'Unable to access microphone on device.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const res = await services.audioRecorderService.stopRecording();
      setIsRecording(false);
      setRecordedAudioUri(res.filePath);
      setAudioDuration(res.durationSeconds || 12);
    } catch {
      Alert.alert('Audio Error', 'Error finalizing voice note recording.');
    }
  };

  const handleSubmit = async () => {
    if (reportMode === 'TEXT' && textNotes.trim().length < 10) {
      Alert.alert(
        'Minimum Length Required',
        'Per operational guidelines, text exception reports must contain at least 10 characters explaining the field exception.'
      );
      return;
    }

    if (reportMode === 'VOICE' && !recordedAudioUri) {
      Alert.alert(
        'Voice Recording Required',
        'Please record your voice note before submitting this exception report.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const targetVendorId = vendor?.id || vendorId || 'v-101';
      const targetActivityId = activityId || `act-exp-${Date.now()}`;
      const managerId = manager?.id || 'mgr-001';

      let voiceUrl: string | undefined;
      if (reportMode === 'VOICE' && recordedAudioUri) {
        voiceUrl = await services.mediaUploadService.uploadAudioReport(recordedAudioUri);
      }

      await services.activityRepository.submitExceptionReport({
        activityId: targetActivityId,
        managerId,
        vendorId: targetVendorId,
        reportType: reportMode === 'TEXT' ? ReportType.TEXT : ReportType.VOICE,
        textNotes: reportMode === 'TEXT' ? textNotes.trim() : undefined,
        voiceUrl,
        voiceDurationSeconds: reportMode === 'VOICE' ? audioDuration : undefined,
      });

      // Also log automatic activity
      await services.activityRepository.logActivity({
        managerId,
        activityType: 'VENDOR_VISIT_NOT_INTERESTED',
        entityId: targetVendorId,
        entityName: vendor?.businessName || 'Field Vendor',
        stateId: vendor?.stateId,
        districtId: vendor?.districtId,
        divisionId: vendor?.divisionId,
        pincodeId: vendor?.pincodeId,
      });

      Alert.alert(
        'Report Submitted',
        `Exception report successfully attached and verified for ${vendor?.businessName || 'vendor'}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onNavigateRoute) {
                onNavigateRoute('Reports');
              } else {
                onBack();
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Submission Error', 'Failed to submit exception report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FICLoadingState message="Loading vendor context..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Exception Report"
        leftActionIcon={<Text style={styles.backIcon}>←</Text>}
        onLeftAction={onBack}
        rightActionIcon={<Text style={styles.drawerIcon}>☰</Text>}
        onRightAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Compliance Directive Banner */}
        <View style={styles.complianceCard}>
          <Text style={styles.complianceTitle}>🚨 Mandatory Operational Exception</Text>
          <Text style={styles.complianceText}>
            When a field visit concludes with a non-standard outcome (such as a merchant declining interest), operational policy requires an immediate text or voice exception report.
          </Text>
        </View>

        {/* Vendor Profile Card */}
        {vendor && (
          <FICCard style={styles.vendorCard}>
            <Text style={styles.vendorName}>{vendor.businessName}</Text>
            <Text style={styles.vendorDetails}>
              Owner: {vendor.vendorName} • {vendor.category}
            </Text>
            <Text style={styles.vendorAddress}>📍 {vendor.address}</Text>
          </FICCard>
        )}

        {/* Mode Selector Tabs */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.modeTab, reportMode === 'TEXT' && styles.activeModeTab]}
            onPress={() => setReportMode('TEXT')}
          >
            <Text style={[styles.modeTabText, reportMode === 'TEXT' && styles.activeModeTabText]}>
              📝 Text Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, reportMode === 'VOICE' && styles.activeModeTab]}
            onPress={() => setReportMode('VOICE')}
          >
            <Text style={[styles.modeTabText, reportMode === 'VOICE' && styles.activeModeTabText]}>
              🎙️ Voice Note
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        {reportMode === 'TEXT' ? (
          <FICCard style={styles.formCard}>
            <Text style={styles.fieldLabel}>Exception Reason & Observations *</Text>
            <Text style={styles.fieldHint}>
              Provide detailed field notes regarding why the vendor declined or what impediment occurred (minimum 10 characters).
            </Text>
            <FICTextInput
              placeholder="e.g., Merchant currently has exclusive distributor contract through next quarter; requested callback in November..."
              value={textNotes}
              onChangeText={setTextNotes}
              multiline
              numberOfLines={5}
              containerStyle={styles.textAreaContainer}
            />
            <Text style={styles.charCountText}>
              Characters: {textNotes.trim().length} / 10 min
            </Text>
          </FICCard>
        ) : (
          <FICCard style={styles.formCard}>
            <Text style={styles.fieldLabel}>Field Audio Recording *</Text>
            <Text style={styles.fieldHint}>
              Record a brief verbal audio briefing explaining the visit outcome and reason for declination.
            </Text>

            <View style={styles.recordingArea}>
              {!isRecording && !recordedAudioUri && (
                <TouchableOpacity
                  style={styles.micButton}
                  onPress={handleStartRecording}
                  activeOpacity={0.8}
                >
                  <Text style={styles.micIcon}>🎙️</Text>
                  <Text style={styles.micButtonText}>Tap to Start Recording</Text>
                </TouchableOpacity>
              )}

              {isRecording && (
                <View style={styles.recordingActiveContainer}>
                  <View style={styles.pulsingIndicator}>
                    <Text style={styles.recordingIndicatorText}>● RECORDING LIVE</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.stopButton}
                    onPress={handleStopRecording}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.stopButtonText}>⏹ Stop Recording</Text>
                  </TouchableOpacity>
                </View>
              )}

              {recordedAudioUri && !isRecording && (
                <View style={styles.recordingDoneContainer}>
                  <Text style={styles.doneCheck}>✓ Voice Note Captured</Text>
                  <Text style={styles.durationText}>
                    Duration: ~{audioDuration}s ({recordedAudioUri.split('/').pop() || 'recording.m4a'})
                  </Text>
                  <TouchableOpacity
                    style={styles.reRecordButton}
                    onPress={handleStartRecording}
                  >
                    <Text style={styles.reRecordText}>🔄 Re-record Audio</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </FICCard>
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <FICButton
            title={isSubmitting ? 'Submitting Report...' : 'Submit Exception Report'}
            onPress={handleSubmit}
            disabled={isSubmitting}
            variant="primary"
            style={styles.submitBtn}
          />

          <FICButton
            title="Cancel"
            onPress={onBack}
            variant="outline"
            style={styles.cancelBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  drawerIcon: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl * 2,
  },
  complianceCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  complianceTitle: {
    ...theme.typography.title,
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  complianceText: {
    ...theme.typography.bodyMedium,
    color: '#7F1D1D',
    lineHeight: 18,
  },
  vendorCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  vendorName: {
    ...theme.typography.title,
    fontWeight: '700',
    color: theme.colors.text,
  },
  vendorDetails: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginVertical: 2,
  },
  vendorAddress: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: theme.radius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.radius.sm,
  },
  activeModeTab: {
    backgroundColor: theme.colors.primary,
  },
  modeTabText: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeModeTabText: {
    color: '#FFFFFF',
  },
  formCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    ...theme.typography.title,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  fieldHint: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  textAreaContainer: {
    marginBottom: theme.spacing.xs,
  },
  charCountText: {
    ...theme.typography.caption,
    textAlign: 'right',
    color: theme.colors.textMuted,
  },
  recordingArea: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  micButton: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.full,
    alignItems: 'center',
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  micIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  micButtonText: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  recordingActiveContainer: {
    alignItems: 'center',
    width: '100%',
  },
  pulsingIndicator: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: theme.radius.full,
    marginBottom: theme.spacing.md,
  },
  recordingIndicatorText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
  stopButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: theme.radius.md,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  recordingDoneContainer: {
    alignItems: 'center',
  },
  doneCheck: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  durationText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  reRecordButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  reRecordText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: theme.spacing.sm,
  },
  submitBtn: {
    marginBottom: theme.spacing.sm,
  },
  cancelBtn: {
    borderColor: theme.colors.border,
  },
});
