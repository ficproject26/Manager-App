import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { services } from '../../services';
import { Vendor } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICButton } from '../../components/ui/FICButton';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FieldActionButtons } from '../../components/ui/FieldActionButtons';

export interface VendorVisitScreenProps {
  vendorId?: string;
  onBack: () => void;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const VendorVisitScreen: React.FC<VendorVisitScreenProps> = ({
  vendorId,
  onBack,
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Decision State
  const [interestDecision, setInterestDecision] = useState<'NONE' | 'INTERESTED' | 'NOT_INTERESTED'>('NONE');

  // Exception Report State (Mandatory if NOT_INTERESTED)
  const [reportMode, setReportMode] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [exceptionNotes, setExceptionNotes] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    const loadVendor = async () => {
      if (!vendorId) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await services.vendorRepository.getVendorById(vendorId);
        if (isMounted) setVendor(data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadVendor();
    return () => {
      isMounted = false;
    };
  }, [vendorId]);

  const handleStartRecording = async () => {
    try {
      await services.audioRecorderService.startRecording();
      setIsRecording(true);
      setRecordedAudioUri(null);
    } catch {
      Alert.alert('Microphone Error', 'Unable to start audio recording.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const res = await services.audioRecorderService.stopRecording();
      setIsRecording(false);
      setRecordedAudioUri(res.filePath);
      setAudioDuration(res.durationSeconds || 14);
    } catch {
      Alert.alert('Audio Error', 'Error finalizing audio recording.');
    }
  };

  const handleSubmitVisit = async () => {
    if (!vendor) return;

    if (interestDecision === 'NONE') {
      Alert.alert('Decision Required', 'Please indicate whether the vendor was interested or not interested.');
      return;
    }

    if (interestDecision === 'NOT_INTERESTED') {
      if (reportMode === 'TEXT' && exceptionNotes.trim().length < 10) {
        Alert.alert(
          'Exception Report Required',
          'Per operational policy, a mandatory explanation (at least 10 characters) is required when marking a vendor Not Interested.'
        );
        return;
      }
      if (reportMode === 'VOICE' && !recordedAudioUri) {
        Alert.alert(
          'Voice Note Required',
          'Please record a voice exception note explaining why the vendor declined interest.'
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const isInterested = interestDecision === 'INTERESTED';
      await services.vendorRepository.recordVendorVisit(
        vendor.id,
        isInterested,
        interestDecision === 'NOT_INTERESTED' ? exceptionNotes : 'Vendor confirmed interest'
      );

      // Auto log activity
      await services.activityRepository.logActivity({
        managerId: manager?.id || 'mgr-001',
        activityType: isInterested ? 'VENDOR_VISIT_INTERESTED' : 'VENDOR_VISIT_NOT_INTERESTED',
        entityId: vendor.id,
        entityName: vendor.businessName,
        stateId: vendor.stateId,
        districtId: vendor.districtId,
        divisionId: vendor.divisionId,
        pincodeId: vendor.pincodeId,
      });

      Alert.alert(
        'Visit Recorded',
        isInterested
          ? `Visit recorded for ${vendor.businessName}. Automatic activity logged.`
          : `Exception report submitted for ${vendor.businessName}. Supervisor notified.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onNavigateRoute) {
                onNavigateRoute('Vendors');
              } else {
                onBack();
              }
            },
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Unable to record vendor visit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FICLoadingState message="Preparing visit checklist..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Field Visit Form"
        leftActionIcon={<Text style={styles.headerIcon}>←</Text>}
        onLeftAction={onBack}
        rightActionIcon={onOpenDrawer ? <Text style={styles.headerIcon}>☰</Text> : undefined}
        onRightAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Vendor Snapshot */}
        <FICCard style={styles.card}>
          <Text style={styles.businessName}>{vendor?.businessName || 'Vendor'}</Text>
          <Text style={styles.vendorSub}>👤 {vendor?.vendorName} • {vendor?.category}</Text>
          <Text style={styles.address}>📍 {vendor?.address}</Text>
          <FieldActionButtons
            phoneNumber={vendor?.phone}
            latitude={vendor?.latitude}
            longitude={vendor?.longitude}
            titleOrLabel={vendor?.businessName || vendor?.name}
            address={vendor?.address}
            style={{ marginTop: 12 }}
          />
        </FICCard>

        {/* Decision Checklist Card */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionTitle}>Vendor Interest Decision *</Text>
          <Text style={styles.sectionSubtitle}>
            Evaluate the vendor's commercial intent during this field audit
          </Text>

          <View style={styles.decisionRow}>
            <TouchableOpacity
              style={[
                styles.decisionBtn,
                interestDecision === 'INTERESTED' && styles.decisionBtnInterested,
              ]}
              onPress={() => setInterestDecision('INTERESTED')}
            >
              <Text style={styles.decisionEmoji}>👍</Text>
              <Text
                style={[
                  styles.decisionBtnText,
                  interestDecision === 'INTERESTED' && styles.decisionBtnTextActive,
                ]}
              >
                Interested
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.decisionBtn,
                interestDecision === 'NOT_INTERESTED' && styles.decisionBtnNotInterested,
              ]}
              onPress={() => setInterestDecision('NOT_INTERESTED')}
            >
              <Text style={styles.decisionEmoji}>👎</Text>
              <Text
                style={[
                  styles.decisionBtnText,
                  interestDecision === 'NOT_INTERESTED' && styles.decisionBtnTextActive,
                ]}
              >
                Not Interested
              </Text>
            </TouchableOpacity>
          </View>
        </FICCard>

        {/* Interested Info Banner */}
        {interestDecision === 'INTERESTED' ? (
          <FICCard style={[styles.card, styles.interestedBanner]}>
            <Text style={styles.interestedBannerTitle}>✅ Standard Visit Flow</Text>
            <Text style={styles.interestedBannerBody}>
              Vendor confirmed commercial intent. Per policy, an automatic activity log will be created upon submission. No manual end-of-day report is required.
            </Text>
          </FICCard>
        ) : null}

        {/* Exception Reporting Section (Mandatory if NOT_INTERESTED) */}
        {interestDecision === 'NOT_INTERESTED' ? (
          <FICCard style={[styles.card, styles.exceptionCard]}>
            <View style={styles.exceptionHeader}>
              <Text style={styles.exceptionTitle}>⚠️ Mandatory Exception Report</Text>
              <Text style={styles.exceptionSubtitle}>
                Operational policy requires documenting specific reasons when a vendor declines interest.
              </Text>
            </View>

            {/* Mode Selector */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, reportMode === 'TEXT' && styles.activeModeTab]}
                onPress={() => setReportMode('TEXT')}
              >
                <Text style={[styles.modeTabText, reportMode === 'TEXT' && styles.activeModeTabText]}>
                  ✏️ Text Notes
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

            {reportMode === 'TEXT' ? (
              <View style={styles.textModeContainer}>
                <FICTextInput
                  label="Detailed Reason *"
                  placeholder="Explain why vendor declined (e.g., pricing, existing distributor exclusivity)..."
                  multiline={true}
                  numberOfLines={4}
                  value={exceptionNotes}
                  onChangeText={setExceptionNotes}
                />
              </View>
            ) : (
              <View style={styles.voiceModeContainer}>
                {isRecording ? (
                  <View style={styles.recordingState}>
                    <Text style={styles.recordingIndicator}>🔴 Recording audio...</Text>
                    <FICButton
                      title="Stop Recording"
                      variant="outline"
                      onPress={handleStopRecording}
                      style={styles.recordActionBtn}
                    />
                  </View>
                ) : recordedAudioUri ? (
                  <View style={styles.recordedState}>
                    <Text style={styles.audioDurationText}>🎵 Voice Note ({audioDuration}s recorded)</Text>
                    <View style={styles.audioActionRow}>
                      <FICButton
                        title="Re-record"
                        variant="outline"
                        onPress={handleStartRecording}
                        style={styles.reRecordBtn}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.readyRecordState}>
                    <Text style={styles.recordHelpText}>
                      Tap below to record an audio exception report explaining why the vendor declined.
                    </Text>
                    <FICButton
                      title="🎙️ Start Recording"
                      variant="secondary"
                      onPress={handleStartRecording}
                      style={styles.recordActionBtn}
                    />
                  </View>
                )}
              </View>
            )}
          </FICCard>
        ) : null}

        {/* Submit Button */}
        {interestDecision !== 'NONE' ? (
          <FICButton
            title={isSubmitting ? 'Recording Visit...' : 'Complete & Submit Visit'}
            variant="primary"
            loading={isSubmitting}
            onPress={handleSubmitVisit}
            style={styles.submitBtn}
          />
        ) : null}
      </ScrollView>
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
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  businessName: {
    ...theme.typography.headingMedium,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  vendorSub: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  address: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: 4,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  decisionRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  decisionBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  decisionBtnInterested: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successLight,
  },
  decisionBtnNotInterested: {
    borderColor: theme.colors.error,
    backgroundColor: '#FEE2E2',
  },
  decisionEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  decisionBtnText: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.text,
  },
  decisionBtnTextActive: {
    fontWeight: '700',
  },
  interestedBanner: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.success,
    borderLeftWidth: 4,
  },
  interestedBannerTitle: {
    ...theme.typography.title,
    color: theme.colors.success,
    fontWeight: '700',
    marginBottom: 4,
  },
  interestedBannerBody: {
    ...theme.typography.bodySmall,
    color: theme.colors.text,
    lineHeight: 18,
  },
  exceptionCard: {
    borderColor: theme.colors.warning,
    borderLeftWidth: 4,
  },
  exceptionHeader: {
    marginBottom: theme.spacing.md,
  },
  exceptionTitle: {
    ...theme.typography.title,
    color: theme.colors.warning,
    fontWeight: '700',
    marginBottom: 2,
  },
  exceptionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  modeTab: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    borderRadius: theme.radius.sm - 2,
  },
  activeModeTab: {
    backgroundColor: theme.colors.surface,
    ...theme.elevation.card,
  },
  modeTabText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeModeTabText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  textModeContainer: {
    marginTop: theme.spacing.xs,
  },
  voiceModeContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  readyRecordState: {
    alignItems: 'center',
    width: '100%',
  },
  recordHelpText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  recordActionBtn: {
    width: '100%',
  },
  recordingState: {
    alignItems: 'center',
    width: '100%',
  },
  recordingIndicator: {
    ...theme.typography.bodyMedium,
    color: theme.colors.error,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  recordedState: {
    alignItems: 'center',
    width: '100%',
  },
  audioDurationText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  audioActionRow: {
    width: '100%',
  },
  reRecordBtn: {
    width: '100%',
  },
  submitBtn: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
});
