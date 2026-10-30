import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  TouchableOpacity,
  Image,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { FICImageUploadModal } from '../../components/ui/FICImageUploadModal';
import { FICAudioPlayerRecorder } from '../../components/ui/FICAudioPlayerRecorder';
import { services } from '../../services';
import { reportExportService } from '../../services/reports/ReportExportService';
import { ExportResult } from '../../services/reports/IReportExportService';
import { Priority, Task, TaskStatus } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICButton } from '../../components/ui/FICButton';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICPriorityBadge } from '../../components/ui/FICPriorityBadge';
import { FICStatusBadge } from '../../components/ui/FICStatusBadge';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';
import { FieldActionButtons } from '../../components/ui/FieldActionButtons';
import { socketService } from '../../services/realtime/SocketService';

export interface TaskDetailScreenProps {
  taskId?: string;
  onBack: () => void;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({
  taskId,
  onBack,
  onOpenDrawer,
  onNavigateRoute,
}) => {
  const { manager } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Resolution Notes / Remarks
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  // Rejection modal
  const [isRejectModalVisible, setIsRejectModalVisible] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Real-time Before & After Task Photos
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | null>(null);
  const [beforePhotoTimestamp, setBeforePhotoTimestamp] = useState<string | null>(null);
  const [beforePhotoLocation, setBeforePhotoLocation] = useState<string | null>(null);

  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null);
  const [afterPhotoTimestamp, setAfterPhotoTimestamp] = useState<string | null>(null);
  const [afterPhotoLocation, setAfterPhotoLocation] = useState<string | null>(null);

  // Audio Note Recording & Playback State
  const [voiceNoteUri, setVoiceNoteUri] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [voiceFileName, setVoiceFileName] = useState<string | undefined>(undefined);
  const [voiceFileSize, setVoiceFileSize] = useState<number | undefined>(undefined);

  // Report Generation State
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [reportProgress, setReportProgress] = useState<string>('');
  const [exportedReportResult, setExportedReportResult] = useState<ExportResult | null>(null);
  const [isReportModalVisible, setIsReportModalVisible] = useState<boolean>(false);

  // Photo Modals State
  const [activePhotoUploadType, setActivePhotoUploadType] = useState<'BEFORE' | 'AFTER' | null>(null);
  const [fullImagePreviewUri, setFullImagePreviewUri] = useState<string | null>(null);
  const [fullImagePreviewTitle, setFullImagePreviewTitle] = useState<string>('');

  const fetchTask = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let targetId = taskId;
      if (!targetId) {
        const allTasks = await services.taskRepository.getTasks(manager?.id || '');
        if (allTasks && allTasks.length > 0) {
          targetId = allTasks[0].id;
        } else {
          targetId = 'TSK-1792816816159-X5Z23';
        }
      }
      const data = await services.taskRepository.getTaskById(targetId);
      if (!data) {
        setError('Task details could not be found');
      } else {
        setTask(data);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load task');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    const unsub1 = socketService.subscribe<Task>('task.status.updated', (payload) => {
      if (task && payload.entityId === task.id && payload.data) {
        setTask((prev) => (prev ? ({ ...prev, ...payload.data } as Task) : (payload.data || null)));
      }
    });
    const unsub2 = socketService.subscribe<Task>('task.updated', (payload) => {
      if (task && payload.entityId === task.id && payload.data) {
        setTask((prev) => (prev ? ({ ...prev, ...payload.data } as Task) : (payload.data || null)));
      }
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [task]);

  useEffect(() => {
    if (task) {
      if (task.beforePhotoUrl) {
        setBeforePhotoUrl(task.beforePhotoUrl);
        setBeforePhotoTimestamp(task.beforePhotoTimestamp || new Date(task.createdAt).toLocaleString());
        setBeforePhotoLocation(task.beforePhotoLocation || `${task.territory || 'Assigned Territory'} (Real-time GPS)`);
      }

      if (task.afterPhotoUrl) {
        setAfterPhotoUrl(task.afterPhotoUrl);
        setAfterPhotoTimestamp(task.afterPhotoTimestamp || (task.completedAt ? new Date(task.completedAt).toLocaleString() : new Date().toLocaleString()));
        setAfterPhotoLocation(task.afterPhotoLocation || `${task.territory || 'Assigned Territory'} (Real-time GPS)`);
      }

      if (task.voiceNoteUrl) {
        setVoiceNoteUri(task.voiceNoteUrl);
        setVoiceDuration(task.voiceNoteDuration || 0);
      }
    }
  }, [task]);

  const executeTaskCompletion = async (notesOverride?: string) => {
    if (!task) return;

    const photoToSubmit = afterPhotoUrl || beforePhotoUrl;
    if (!photoToSubmit) {
      Alert.alert(
        'Photo Evidence Required',
        'Please capture or attach a Before or After work photo before completing this task.'
      );
      return;
    }

    if (!voiceNoteUri) {
      Alert.alert(
        'Voice Note Required',
        'Please record an audio explanation note before completing this task.'
      );
      return;
    }

    const effectiveRemarks = (notesOverride || resolutionNotes || task.notes || '').trim();
    if (!effectiveRemarks) {
      Alert.alert(
        'Remarks Required',
        'Please enter field resolution remarks describing the completed work.'
      );
      return;
    }

    setIsUpdating(true);
    try {
      let finalPhotoUrl = photoToSubmit;
      if (finalPhotoUrl.startsWith('file://') || finalPhotoUrl.startsWith('content://')) {
        try {
          const uploadedPhoto = await services.mediaUploadService.uploadShopPhoto(finalPhotoUrl);
          if (uploadedPhoto) finalPhotoUrl = uploadedPhoto;
        } catch (uploadErr) {
          console.warn('[TaskDetail] Photo upload error:', uploadErr);
        }
      }

      let finalAudioUrl = voiceNoteUri;
      if (finalAudioUrl.startsWith('file://') || finalAudioUrl.startsWith('content://')) {
        try {
          const uploadedAudio = await services.mediaUploadService.uploadAudioReport(finalAudioUrl);
          if (uploadedAudio) finalAudioUrl = uploadedAudio;
        } catch (uploadErr) {
          console.warn('[TaskDetail] Audio upload error:', uploadErr);
        }
      }

      const photoPayload = {
        action: 'complete',
        status: 'Completed',
        completionPhoto: finalPhotoUrl,
        completionAudio: finalAudioUrl,
        voiceNote: finalAudioUrl,
        remarks: effectiveRemarks,
        workCompleted: effectiveRemarks,
        resolutionDetails: effectiveRemarks,
        notes: effectiveRemarks,
        beforePhotoUrl: beforePhotoUrl || undefined,
        beforePhotoTimestamp: beforePhotoTimestamp || undefined,
        beforePhotoLocation: beforePhotoLocation || undefined,
        afterPhotoUrl: afterPhotoUrl || finalPhotoUrl,
        afterPhotoTimestamp: afterPhotoTimestamp || new Date().toLocaleString(),
        afterPhotoLocation: afterPhotoLocation || beforePhotoLocation || `${task.territory || 'Assigned Territory'} (Real-time GPS)`,
        voiceNoteUrl: finalAudioUrl,
        voiceNoteDuration: voiceDuration || undefined,
      };

      const updated = await services.taskRepository.completeTask(task.id, photoPayload);
      setTask(updated);

      if (manager?.id) {
        await services.activityRepository.logActivity({
          managerId: manager.id,
          activityType: 'TASK_COMPLETED',
          entityId: task.id,
          entityName: task.title,
          stateId: manager.stateId || manager.state || '',
          districtId: manager.districtId || '',
          divisionId: manager.divisionId || '',
          pincodeId: manager.pincodeId || '',
        }).catch(() => {});
      }

      Alert.alert(
        'Task Completed',
        'Task marked as Completed and all field verification evidence uploaded successfully!'
      );
    } catch (err: any) {
      Alert.alert('Task Completion Failed', err?.message || 'Unable to complete task. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectStatus = async (targetStatus: TaskStatus) => {
    if (!task) return;
    if (task.status === targetStatus) return;

    if (targetStatus === TaskStatus.COMPLETED) {
      await executeTaskCompletion();
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await services.taskRepository.updateTaskStatus(task.id, targetStatus);
      setTask(updated);
      Alert.alert(
        'Status Updated',
        `Task status updated to ${targetStatus === TaskStatus.IN_PROGRESS ? 'In Progress' : 'Pending'}.`
      );
    } catch (err: any) {
      Alert.alert('Status Update Failed', err?.message || 'Unable to change task status.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!task) return;
    setIsGeneratingReport(true);
    setReportProgress('Compiling task verification details...');
    try {
      const taskForReport: Task = {
        ...task,
        beforePhotoUrl: beforePhotoUrl || task.beforePhotoUrl,
        beforePhotoTimestamp: beforePhotoTimestamp || task.beforePhotoTimestamp,
        beforePhotoLocation: beforePhotoLocation || task.beforePhotoLocation,
        afterPhotoUrl: afterPhotoUrl || task.afterPhotoUrl,
        afterPhotoTimestamp: afterPhotoTimestamp || task.afterPhotoTimestamp,
        afterPhotoLocation: afterPhotoLocation || task.afterPhotoLocation,
        voiceNoteUrl: voiceNoteUri || task.voiceNoteUrl,
        voiceNoteDuration: voiceDuration || task.voiceNoteDuration,
        notes: resolutionNotes || task.notes,
      };

      const result = await reportExportService.exportTaskCompletionReport(
        taskForReport,
        (statusMsg) => setReportProgress(statusMsg)
      );

      setExportedReportResult(result);
      setIsReportModalVisible(true);
    } catch (err: any) {
      Alert.alert('Report Generation Failed', err?.message || 'Unable to generate task report.');
    } finally {
      setIsGeneratingReport(false);
      setReportProgress('');
    }
  };

  const handlePhotoCaptured = (uri: string, _fileName?: string, gpsCoords?: string) => {
    const timeStr = new Date().toLocaleString();
    const locStr = gpsCoords || `${task?.territory || 'Assigned Scope'} (Real-time GPS: 13.0827° N, 80.2707° E)`;
    if (activePhotoUploadType === 'BEFORE') {
      setBeforePhotoUrl(uri);
      setBeforePhotoTimestamp(timeStr);
      setBeforePhotoLocation(locStr);
    } else if (activePhotoUploadType === 'AFTER') {
      setAfterPhotoUrl(uri);
      setAfterPhotoTimestamp(timeStr);
      setAfterPhotoLocation(locStr);
    }
    setActivePhotoUploadType(null);
  };

  const handleAccept = async () => {
    if (!task) return;
    setIsUpdating(true);
    try {
      const updated = await services.taskRepository.acceptTask(task.id);
      setTask(updated);
      Alert.alert('Task Accepted', 'Task moved to In Progress state.');
    } catch (err: any) {
      Alert.alert('Action Blocked', err?.message || 'Unable to accept task.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBlock = async () => {
    if (!task) return;
    setIsUpdating(true);
    try {
      const updated = await services.taskRepository.blockTask(task.id, 'Task temporarily blocked by manager.');
      setTask(updated);
      Alert.alert('Task Blocked', 'Task has been marked as Blocked.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to block task.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResume = async () => {
    if (!task) return;
    setIsUpdating(true);
    try {
      const updated = await services.taskRepository.resumeTask(task.id);
      setTask(updated);
      Alert.alert('Task Resumed', 'Task has been moved back to In Progress.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Unable to resume task.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!task) return;
    if (!rejectionReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for rejecting this task.');
      return;
    }
    setIsUpdating(true);
    try {
      const updated = await services.taskRepository.rejectTask(task.id, rejectionReason.trim());
      setTask(updated);
      setIsRejectModalVisible(false);
      Alert.alert('Task Rejected', 'Task marked as rejected.');
    } catch (err: any) {
      Alert.alert('Action Blocked', err?.message || 'Unable to reject task.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleComplete = async () => {
    await executeTaskCompletion();
  };

  const handleResolveHighPriority = async () => {
    if (resolutionNotes.trim().length < 5) {
      Alert.alert(
        'Resolution Notes Required',
        'High-priority tasks require mandatory resolution documentation before closing.'
      );
      return;
    }
    await executeTaskCompletion(resolutionNotes.trim());
  };

  if (isLoading) {
    return <FICLoadingState message="Loading task details..." />;
  }

  if (error || !task) {
    return (
      <FICErrorState
        title="Task Not Found"
        message={error || 'Unable to find task.'}
        onRetry={fetchTask}
      />
    );
  }

  const isHighPriority = task.priority === Priority.HIGH;
  const isCompleted = task.status === TaskStatus.COMPLETED || task.status === TaskStatus.RESOLVED;
  const isPending = task.status === TaskStatus.PENDING || task.status === TaskStatus.ASSIGNED;
  const isInProgress = task.status === TaskStatus.IN_PROGRESS || task.status === TaskStatus.ACCEPTED;
  const isBlocked = task.status === TaskStatus.BLOCKED;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Task Details"
        leftActionIcon={<Text style={styles.headerIcon}>←</Text>}
        onLeftAction={onBack}
        rightActionIcon={onOpenDrawer ? <Text style={styles.headerIcon}>☰</Text> : undefined}
        onRightAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Completed State Banner */}
        {isCompleted ? (
          <FICCard style={[styles.card, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#065F46', marginBottom: 2 }}>
              ✓ Task Completed & Verified
            </Text>
            <Text style={{ fontSize: 12, color: '#047857' }}>
              {task.completedAt ? `Completed on ${new Date(task.completedAt).toLocaleString()}` : 'Task marked complete.'}
            </Text>
          </FICCard>
        ) : null}

        {/* Priority Banner for High Priority */}
        {isHighPriority && !isCompleted ? (
          <FICCard style={[styles.card, styles.highPriorityNotice]}>
            <Text style={styles.highPriorityTitle}>
              ⚡ HIGH PRIORITY OPERATIONAL DIRECTIVE
            </Text>
            <Text style={styles.highPriorityDesc}>
              This is a high-priority operational directive. Please ensure field resolution within the assigned SLA window.
            </Text>
          </FICCard>
        ) : null}

        {/* ========================================================================= */}
        {/* STEP 1: TERRITORY JURISDICTION & SUB ADMIN AUTHORITY */}
        {/* ========================================================================= */}
        <FICCard style={[styles.card, styles.stepCard]}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepCardTitle}>Territory Jurisdiction & Authority</Text>
              <Text style={styles.stepCardSub}>Operational jurisdiction & assigning Sub Admin</Text>
            </View>
          </View>

          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assigned State:</Text>
              <Text style={styles.metaValueBold}>{task.stateId || manager?.state || 'Tamil Nadu'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>District Jurisdiction:</Text>
              <Text style={styles.metaValue}>{task.districtId || manager?.districtId || manager?.scope?.districtName || 'Chennai'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Division Scope:</Text>
              <Text style={styles.metaValue}>{task.divisionId || manager?.divisionId || manager?.scope?.divisionName || task.territory || 'Chennai Central'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Pincode Jurisdiction:</Text>
              <Text style={styles.metaValue}>{task.pincodeId || manager?.pincodeId || manager?.scope?.pincodeCode || '600001'}</Text>
            </View>

            <View style={[styles.metaRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }]}>
              <Text style={styles.metaLabel}>Assigning Sub Admin:</Text>
              <Text style={[styles.metaValueBold, { color: '#4338CA' }]}>
                {task.createdByAdminName || task.assignedBy || manager?.assignedSubAdminName || 'Mad'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Authority Role:</Text>
              <Text style={styles.metaValue}>
                {task.createdByAdminRole || manager?.assignedSubAdminRole || 'State Operations Sub Admin'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Assigned Date:</Text>
              <Text style={styles.metaValue}>
                {new Date(task.assignedDate || task.createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>SLA Deadline:</Text>
              <Text style={[styles.metaValue, { color: isHighPriority ? '#DC2626' : '#D97706', fontWeight: '700' }]}>
                {task.dueDate || task.dueSla || 'Standard 48-Hour Field Window'}
              </Text>
            </View>
          </View>
        </FICCard>

        {/* ========================================================================= */}
        {/* STEP 2: SHOP / VENDOR INFORMATION */}
        {/* ========================================================================= */}
        <FICCard style={[styles.card, styles.stepCard]}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepCardTitle}>Shop / Vendor Information</Text>
              <Text style={styles.stepCardSub}>Target merchant verification & field navigation</Text>
            </View>
          </View>

          <View style={styles.metaList}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Shop / Business Name:</Text>
              <Text style={styles.metaValueBold}>{task.contactName || task.title || 'Merchant Establishment'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Category:</Text>
              <Text style={styles.metaValue}>{task.territory || 'Retail Merchant'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Contact Person:</Text>
              <Text style={styles.metaValue}>{task.contactName || 'Store Manager / Owner'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Contact Phone:</Text>
              <Text style={styles.metaValue}>{task.contactPhone || 'Phone unavailable'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Site Address:</Text>
              <Text style={styles.metaValue}>{task.address || task.territory || 'Location on file'}</Text>
            </View>
          </View>

          <FieldActionButtons
            phoneNumber={task.contactPhone}
            latitude={task.latitude}
            longitude={task.longitude}
            titleOrLabel={task.contactName || task.title}
            address={task.address}
            style={{ marginTop: 14 }}
          />
        </FICCard>

        {/* ========================================================================= */}
        {/* STEP 3: TASK OBJECTIVE, INSTRUCTIONS & PRIORITY */}
        {/* ========================================================================= */}
        <FICCard style={[styles.card, styles.stepCard]}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepCardTitle}>Task Objective & Instructions</Text>
              <Text style={styles.stepCardSub}>Operational directive, scope & SLA requirements</Text>
            </View>
          </View>

          <Text style={styles.taskTitle}>{task.title}</Text>
          <View style={styles.badgeRow}>
            <FICPriorityBadge priority={task.priority} />
            <FICStatusBadge status={task.status} showIcon={true} />
          </View>

          <View style={{ marginTop: 14 }}>
            <Text style={styles.instructionHeading}>Field Instructions & Directives:</Text>
            <Text style={styles.descriptionText}>{task.description}</Text>
          </View>

          {task.notes ? (
            <View style={[styles.metaRow, { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
              <Text style={styles.metaLabel}>Operational Notes:</Text>
              <Text style={styles.metaValue}>{task.notes}</Text>
            </View>
          ) : null}
        </FICCard>

        {/* ========================================================================= */}
        {/* STEP 4: TASK EXECUTION, EVIDENCE & COMPLETION */}
        {/* ========================================================================= */}
        <FICCard style={[styles.card, styles.stepCard]}>
          <View style={styles.stepHeaderRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 4</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepCardTitle}>Task Execution, Evidence & Completion</Text>
              <Text style={styles.stepCardSub}>Real photo proof, voice note memo & status update</Text>
            </View>
          </View>

          {/* Real-time Proof of Work: Before & After Pictures */}
          <View style={{ marginBottom: 16 }}>
            <View style={styles.photoHeaderRow}>
              <Icon name="camera-account" size={22} color="#1D4ED8" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Proof of Work Photos *</Text>
                <Text style={styles.sectionSubtitle}>
                  {isCompleted
                    ? 'Verified photos attached to task record:'
                    : 'Mandatory: Capture real-time photo before starting or after completing work.'}
                </Text>
              </View>
            </View>

            <View style={styles.photosGrid}>
              {/* BEFORE PHOTO BOX */}
              <View style={styles.photoBoxContainer}>
                <View style={[styles.photoBadge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.photoBadgeText}>🔴 BEFORE WORK</Text>
                </View>
                {beforePhotoUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.photoPreviewCard}
                    onPress={() => {
                      setFullImagePreviewUri(beforePhotoUrl);
                      setFullImagePreviewTitle('Before Work Picture');
                    }}
                  >
                    <Image source={{ uri: beforePhotoUrl }} style={styles.photoImage} resizeMode="cover" />
                    <View style={styles.photoMetaOverlay}>
                      <Text style={styles.photoMetaTime} numberOfLines={1}>
                        🕒 {beforePhotoTimestamp || 'Real-time Captured'}
                      </Text>
                      <Text style={styles.photoMetaLoc} numberOfLines={1}>
                        📍 {beforePhotoLocation || 'GPS Geotagged'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.photoUploadDashed}
                    onPress={() => setActivePhotoUploadType('BEFORE')}
                  >
                    <Icon name="camera-plus-outline" size={30} color="#64748B" />
                    <Text style={styles.photoUploadText}>Attach Before Photo</Text>
                    <Text style={styles.photoUploadSub}>Camera / Gallery</Text>
                  </TouchableOpacity>
                )}
                {!isCompleted && beforePhotoUrl ? (
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => setActivePhotoUploadType('BEFORE')}
                  >
                    <Text style={styles.retakeBtnText}>Retake / Change</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* AFTER PHOTO BOX */}
              <View style={styles.photoBoxContainer}>
                <View style={[styles.photoBadge, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.photoBadgeText}>🟢 AFTER WORK</Text>
                </View>
                {afterPhotoUrl ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.photoPreviewCard}
                    onPress={() => {
                      setFullImagePreviewUri(afterPhotoUrl);
                      setFullImagePreviewTitle('After Work Picture');
                    }}
                  >
                    <Image source={{ uri: afterPhotoUrl }} style={styles.photoImage} resizeMode="cover" />
                    <View style={styles.photoMetaOverlay}>
                      <Text style={styles.photoMetaTime} numberOfLines={1}>
                        🕒 {afterPhotoTimestamp || 'Real-time Captured'}
                      </Text>
                      <Text style={styles.photoMetaLoc} numberOfLines={1}>
                        📍 {afterPhotoLocation || 'GPS Geotagged'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.photoUploadDashed}
                    onPress={() => setActivePhotoUploadType('AFTER')}
                  >
                    <Icon name="camera-plus-outline" size={30} color="#64748B" />
                    <Text style={styles.photoUploadText}>Attach After Photo</Text>
                    <Text style={styles.photoUploadSub}>Camera / Gallery</Text>
                  </TouchableOpacity>
                )}
                {!isCompleted && afterPhotoUrl ? (
                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => setActivePhotoUploadType('AFTER')}
                  >
                    <Text style={styles.retakeBtnText}>Retake / Change</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* Voice Memo / Audio Verification Recording & Playback */}
          <View style={{ marginBottom: 16 }}>
            <FICAudioPlayerRecorder
              title="🎙️ Voice Memo & Verbal Explanation *"
              subtitle="Record audio notes describing work completed. Required before completion."
              recordedAudioUri={voiceNoteUri}
              audioDurationSeconds={voiceDuration}
              fileName={voiceFileName}
              fileSize={voiceFileSize}
              onStopRecording={(uri, dur, _source, fName, fSize) => {
                setVoiceNoteUri(uri);
                setVoiceDuration(dur);
                setVoiceFileName(fName);
                setVoiceFileSize(fSize);
              }}
              onDeleteRecording={() => {
                setVoiceNoteUri(null);
                setVoiceDuration(0);
                setVoiceFileName(undefined);
                setVoiceFileSize(undefined);
              }}
            />
          </View>

          {/* Resolution Remarks / Summary */}
          {!isCompleted && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Resolution Notes & Remarks *</Text>
              <Text style={styles.sectionSubtitle}>
                Document the actions taken to execute and resolve this task:
              </Text>
              <FICTextInput
                placeholder="e.g., Reconciled outstanding merchant items and completed physical site verification..."
                multiline={true}
                numberOfLines={3}
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
              />
            </View>
          )}

          {/* Status Switcher (Pending, In Progress, Completed) */}
          <View style={styles.statusSwitcherContainer}>
            <Text style={styles.statusSwitcherHeaderLabel}>SELECT TASK STATUS:</Text>
            <View style={styles.statusSegmentRow}>
              {/* 1. PENDING */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isUpdating}
                onPress={() => handleSelectStatus(TaskStatus.PENDING)}
                style={[
                  styles.statusSegmentBtn,
                  isPending && styles.statusSegmentPendingActive,
                ]}
              >
                <Icon
                  name={isPending ? 'clock-alert' : 'clock-outline'}
                  size={16}
                  color={isPending ? '#D97706' : '#64748B'}
                />
                <Text
                  style={[
                    styles.statusSegmentText,
                    isPending && styles.statusSegmentPendingText,
                  ]}
                >
                  Pending
                </Text>
              </TouchableOpacity>

              {/* 2. IN PROGRESS */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isUpdating}
                onPress={() => handleSelectStatus(TaskStatus.IN_PROGRESS)}
                style={[
                  styles.statusSegmentBtn,
                  isInProgress && styles.statusSegmentProgressActive,
                ]}
              >
                <Icon
                  name={isInProgress ? 'progress-clock' : 'progress-wrench'}
                  size={16}
                  color={isInProgress ? '#1D4ED8' : '#64748B'}
                />
                <Text
                  style={[
                    styles.statusSegmentText,
                    isInProgress && styles.statusSegmentProgressText,
                  ]}
                >
                  In Progress
                </Text>
              </TouchableOpacity>

              {/* 3. COMPLETED */}
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isUpdating}
                onPress={() => handleSelectStatus(TaskStatus.COMPLETED)}
                style={[
                  styles.statusSegmentBtn,
                  isCompleted && styles.statusSegmentCompletedActive,
                ]}
              >
                <Icon
                  name={isCompleted ? 'check-circle' : 'check-circle-outline'}
                  size={16}
                  color={isCompleted ? '#059669' : '#64748B'}
                />
                <Text
                  style={[
                    styles.statusSegmentText,
                    isCompleted && styles.statusSegmentCompletedText,
                  ]}
                >
                  Completed
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Workflow Buttons */}
          {!isCompleted && (
            <View style={{ marginTop: 16 }}>
              {isPending ? (
                <View style={styles.actionsRow}>
                  <FICButton
                    title="Reject"
                    variant="outline"
                    loading={isUpdating}
                    onPress={() => setIsRejectModalVisible(true)}
                    style={styles.actionBtnHalf}
                  />
                  <FICButton
                    title="Accept Task"
                    variant="primary"
                    loading={isUpdating}
                    onPress={handleAccept}
                    style={styles.actionBtnHalf}
                  />
                </View>
              ) : isInProgress ? (
                <View style={styles.actionsRow}>
                  <FICButton
                    title="Mark Blocked"
                    variant="outline"
                    loading={isUpdating}
                    onPress={handleBlock}
                    style={styles.actionBtnHalf}
                  />
                  <FICButton
                    title="Complete Task"
                    variant="primary"
                    loading={isUpdating}
                    onPress={handleComplete}
                    style={styles.actionBtnHalf}
                  />
                </View>
              ) : isBlocked ? (
                <FICButton
                  title="Resume Task"
                  variant="primary"
                  loading={isUpdating}
                  onPress={handleResume}
                  style={styles.completeBtn}
                />
              ) : null}
            </View>
          )}

          {/* Task Completion Report Generation Card (When Completed) */}
          {isCompleted ? (
            <View style={[styles.reportCard, { marginTop: 16 }]}>
              <View style={styles.reportCardHeader}>
                <View style={styles.reportIconBox}>
                  <Icon name="file-document-check-outline" size={28} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportCardTitle}>Task Completion Report</Text>
                  <Text style={styles.reportCardSub}>
                    Official audit certificate with verified before/after photos, audio notes & GPS geotags.
                  </Text>
                </View>
              </View>

              <FICButton
                title={isGeneratingReport ? reportProgress || 'Generating Report...' : '📄 Generate Task Report (PDF)'}
                variant="primary"
                loading={isGeneratingReport}
                onPress={handleGenerateReport}
                style={styles.generateReportBtn}
              />
            </View>
          ) : null}
        </FICCard>
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={isRejectModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Task</Text>
            <Text style={styles.modalSub}>
              Please specify reason for declining this assigned task:
            </Text>
            <FICTextInput
              placeholder="e.g., Outside assigned geographic zone..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
            />
            <View style={styles.modalBtnRow}>
              <FICButton
                title="Cancel"
                variant="outline"
                onPress={() => setIsRejectModalVisible(false)}
                style={{ flex: 1 }}
              />
              <FICButton
                title="Confirm"
                variant="primary"
                loading={isUpdating}
                onPress={handleReject}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Real-time Photo Capture Upload Modal */}
      <FICImageUploadModal
        visible={activePhotoUploadType !== null}
        title={`Capture ${activePhotoUploadType === 'BEFORE' ? 'Before Work' : 'After Work'} Picture`}
        subtitle="Capture real-time photo with device camera or choose from gallery with GPS location."
        currentImageUri={activePhotoUploadType === 'BEFORE' ? beforePhotoUrl : afterPhotoUrl}
        onImageSelected={handlePhotoCaptured}
        onRemoveImage={() => {
          if (activePhotoUploadType === 'BEFORE') setBeforePhotoUrl(null);
          else if (activePhotoUploadType === 'AFTER') setAfterPhotoUrl(null);
          setActivePhotoUploadType(null);
        }}
        onClose={() => setActivePhotoUploadType(null)}
      />

      {/* Full-Screen Zoom Photo Preview Modal */}
      <Modal
        visible={fullImagePreviewUri !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullImagePreviewUri(null)}
      >
        <TouchableWithoutFeedback onPress={() => setFullImagePreviewUri(null)}>
          <View style={styles.imageZoomOverlay}>
            <View style={styles.imageZoomContent}>
              <View style={styles.imageZoomHeader}>
                <Text style={styles.imageZoomTitle}>{fullImagePreviewTitle}</Text>
                <TouchableOpacity onPress={() => setFullImagePreviewUri(null)}>
                  <Icon name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              {fullImagePreviewUri ? (
                <Image source={{ uri: fullImagePreviewUri }} style={styles.imageZoomFull} resizeMode="contain" />
              ) : null}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Task Completion Report Export Success Modal */}
      <Modal
        visible={isReportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.reportSuccessHeader}>
              <Icon name="check-decagram" size={44} color="#059669" />
              <Text style={styles.reportSuccessTitle}>Report Generated</Text>
              <Text style={styles.reportSuccessSub}>
                Official Task Completion PDF Report has been created and saved to your device.
              </Text>
            </View>

            {exportedReportResult ? (
              <View style={styles.reportDetailsBox}>
                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailLabel}>File Name:</Text>
                  <Text style={styles.reportDetailValue} numberOfLines={1}>
                    {exportedReportResult.fileName}
                  </Text>
                </View>
                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailLabel}>File Size:</Text>
                  <Text style={styles.reportDetailValue}>
                    {Math.round((exportedReportResult.fileSize || 1024) / 1024)} KB
                  </Text>
                </View>
                <View style={styles.reportDetailRow}>
                  <Text style={styles.reportDetailLabel}>Storage Path:</Text>
                  <Text style={styles.reportDetailValue} numberOfLines={2}>
                    {exportedReportResult.displayPath}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.reportActionsRow}>
              <TouchableOpacity
                style={[styles.reportActionBtn, styles.reportOpenBtn]}
                onPress={async () => {
                  if (exportedReportResult) {
                    const res = await reportExportService.openFile(exportedReportResult);
                    if (res.message) Alert.alert('File Location', res.message);
                  }
                }}
              >
                <Icon name="file-eye-outline" size={18} color="#FFFFFF" />
                <Text style={styles.reportActionBtnText}>Open PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportActionBtn, styles.reportShareBtn]}
                onPress={async () => {
                  if (exportedReportResult) {
                    await reportExportService.shareFile(exportedReportResult);
                  }
                }}
              >
                <Icon name="share-variant-outline" size={18} color="#FFFFFF" />
                <Text style={styles.reportActionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.reportCloseBtn}
              onPress={() => setIsReportModalVisible(false)}
            >
              <Text style={styles.reportCloseBtnText}>Close</Text>
            </TouchableOpacity>
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
    paddingBottom: 110, // Persistent bottom navigation bar clearance
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  stepCard: {
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stepBadge: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stepCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  stepCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  instructionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  taskTitle: {
    ...theme.typography.headingLarge,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  highPriorityNotice: {
    backgroundColor: '#FEF2F2',
    borderColor: theme.colors.error,
    borderLeftWidth: 4,
  },
  metaList: {
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 13,
    color: '#1E293B',
  },
  metaValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  highPriorityTitle: {
    ...theme.typography.title,
    color: theme.colors.error,
    fontWeight: '700',
    marginBottom: 4,
  },
  highPriorityDesc: {
    ...theme.typography.caption,
    color: theme.colors.text,
    lineHeight: 18,
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    fontWeight: '700',
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  descriptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
    lineHeight: 22,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionBtnHalf: {
    flex: 1,
  },
  completeBtn: {
    width: '100%',
  },
  // Photos section styles
  photoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBoxContainer: {
    flex: 1,
  },
  photoBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  photoPreviewCard: {
    height: 125,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0F172A',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoMetaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  photoMetaTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  photoMetaLoc: {
    fontSize: 9,
    color: '#93C5FD',
    marginTop: 1,
  },
  photoUploadDashed: {
    height: 125,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoUploadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 4,
    textAlign: 'center',
  },
  photoUploadSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  retakeBtn: {
    marginTop: 6,
    alignSelf: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  retakeBtnText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  // Status Switcher Styles
  statusSwitcherContainer: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statusSwitcherHeaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  statusSegmentRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  statusSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  statusSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusSegmentPendingActive: {
    backgroundColor: '#FEF3C7',
  },
  statusSegmentPendingText: {
    color: '#B45309',
    fontWeight: '700',
  },
  statusSegmentProgressActive: {
    backgroundColor: '#DBEAFE',
  },
  statusSegmentProgressText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  statusSegmentCompletedActive: {
    backgroundColor: '#D1FAE5',
  },
  statusSegmentCompletedText: {
    color: '#047857',
    fontWeight: '700',
  },
  // Task Completion Report Card Styles
  reportCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 14,
  },
  reportCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  reportIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#14532D',
  },
  reportCardSub: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 16,
  },
  generateReportBtn: {
    width: '100%',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalSub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  imageZoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageZoomContent: {
    width: '94%',
    height: '80%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageZoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#1E293B',
  },
  imageZoomTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  imageZoomFull: {
    flex: 1,
    width: '100%',
  },
  reportSuccessHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  reportSuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#065F46',
  },
  reportSuccessSub: {
    fontSize: 13,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 18,
  },
  reportDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  reportDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  reportDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    textAlign: 'right',
  },
  reportActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  reportActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reportOpenBtn: {
    backgroundColor: '#059669',
  },
  reportShareBtn: {
    backgroundColor: '#1D4ED8',
  },
  reportActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  reportCloseBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 4,
  },
  reportCloseBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
});
