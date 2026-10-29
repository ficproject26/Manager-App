import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Linking,
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { services } from '../../services';

const { NativeAudio } = NativeModules;

export interface FICAudioPlayerRecorderProps {
  title?: string;
  subtitle?: string;
  recordedAudioUri: string | null;
  audioDurationSeconds: number;
  audioSource?: 'RECORDED' | 'UPLOADED';
  fileName?: string;
  fileSize?: number;
  onStartRecording?: () => void;
  onStopRecording?: (
    uri: string,
    duration: number,
    source: 'RECORDED' | 'UPLOADED',
    fileName?: string,
    fileSize?: number,
    mimeType?: string
  ) => void;
  onDeleteRecording?: () => void;
}

export const FICAudioPlayerRecorder: React.FC<FICAudioPlayerRecorderProps> = ({
  title = '🎙️ Voice Note / Audio Explanation',
  subtitle = 'Record audio explaining why merchant declined interest. You can talk into mic and listen back.',
  recordedAudioUri: initialAudioUri,
  audioDurationSeconds: initialDuration,
  audioSource: initialSource = 'RECORDED',
  fileName: initialFileName,
  fileSize: initialFileSize,
  onStartRecording,
  onStopRecording,
  onDeleteRecording,
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [audioUri, setAudioUri] = useState<string | null>(initialAudioUri || null);
  const [audioSource, setAudioSource] = useState<'RECORDED' | 'UPLOADED'>(initialSource);
  const [currentFileName, setCurrentFileName] = useState<string | null>(initialFileName || null);
  const [currentFileSize, setCurrentFileSize] = useState<number | null>(initialFileSize || null);
  const [duration, setDuration] = useState<number>(initialDuration || 0);
  const [playbackSeconds, setPlaybackSeconds] = useState<number>(0);
  const [liveAmplitude, setLiveAmplitude] = useState<number>(0);

  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Recording status timer
  const [recTimer, setRecTimer] = useState<number>(0);
  const recIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialAudioUri) {
      setAudioUri(initialAudioUri);
    }
    if (initialDuration) {
      setDuration(initialDuration);
    }
    if (initialFileName) {
      setCurrentFileName(initialFileName);
    }
    if (initialFileSize) {
      setCurrentFileSize(initialFileSize);
    }
  }, [initialAudioUri, initialDuration, initialFileName, initialFileSize]);

  // Listen for native playback events
  useEffect(() => {
    // On Android, NativeAudioModule emits directly to DeviceEventEmitter via RCTDeviceEventEmitter.
    // This avoids NativeEventEmitter warnings when addListener/removeListeners are not present.
    const emitter =
      Platform.OS === 'android'
        ? DeviceEventEmitter
        : NativeAudio && typeof (NativeAudio as any).addListener === 'function'
        ? new NativeEventEmitter(NativeAudio)
        : null;

    if (!emitter) return;

    const endSub = emitter.addListener('onPlaybackEnded', () => {
      setIsPlaying(false);
      setIsPaused(false);
      setPlaybackSeconds(0);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    });
    const errSub = emitter.addListener('onPlaybackError', () => {
      setIsPlaying(false);
      setIsPaused(false);
      setPlaybackSeconds(0);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      Alert.alert('Playback Error', 'Error playing audio file through speaker.');
    });
    return () => {
      endSub.remove();
      errSub.remove();
    };
  }, []);

  // Clean unmount effect to release recorder and player resources
  useEffect(() => {
    return () => {
      if (recIntervalRef.current) clearInterval(recIntervalRef.current);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      services.audioRecorderService.stopPlayback().catch(() => {});
      services.audioRecorderService.cancelRecording().catch(() => {});
    };
  }, []);

  // ─── START REAL MICROPHONE RECORDING ──────────────────────────────
  const handleStartRealRecording = async () => {
    if (isRecording) return;

    // If currently playing, stop playback first
    if (isPlaying) {
      await handleStopPlayback();
    }

    try {
      const permStatus = await services.audioRecorderService.requestMicrophonePermission();

      if (permStatus === 'DENIED') {
        Alert.alert(
          'Microphone Permission Required',
          'Microphone access is required to record real-time audio voice notes for field visit reports.'
        );
        return;
      }

      if (permStatus === 'NEVER_ASK_AGAIN') {
        Alert.alert(
          'Permission Permanently Denied',
          'Microphone permission is permanently denied in your device settings. Please open App Settings to grant microphone permission.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ]
        );
        return;
      }

      await services.audioRecorderService.startRecording();
      setIsRecording(true);
      setRecTimer(0);
      setLiveAmplitude(0);
      setAudioUri(null);
      setAudioSource('RECORDED');

      if (onStartRecording) onStartRecording();

      // Live status poll: reads actual elapsed time and amplitude from hardware
      if (recIntervalRef.current) clearInterval(recIntervalRef.current);
      recIntervalRef.current = setInterval(async () => {
        try {
          const status = await services.audioRecorderService.getRecordingStatus?.();
          if (status) {
            setRecTimer(status.elapsedSeconds);
            setLiveAmplitude(status.amplitude);
          } else {
            setRecTimer(prev => prev + 1);
          }
        } catch {
          setRecTimer(prev => prev + 1);
        }
      }, 500);

      // Start pulsing recording icon
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoopRef.current.start();
    } catch (err: any) {
      console.warn('Microphone recording error:', err);
      setIsRecording(false);
      if (recIntervalRef.current) clearInterval(recIntervalRef.current);
      Alert.alert(
        'Recording Error',
        err?.message || 'Unable to access device microphone. Please check permissions and try again.'
      );
    }
  };

  // ─── STOP REAL MICROPHONE RECORDING ───────────────────────────────
  const handleStopRealRecording = async () => {
    if (!isRecording) return;

    setIsRecording(false);
    if (recIntervalRef.current) clearInterval(recIntervalRef.current);
    if (pulseLoopRef.current) pulseLoopRef.current.stop();
    pulseAnim.setValue(1);

    try {
      const res = await services.audioRecorderService.stopRecording();
      const finalDuration = Math.max(1, res.durationSeconds || recTimer);
      setDuration(finalDuration);
      setAudioUri(res.filePath);
      setAudioSource('RECORDED');
      setCurrentFileName(res.fileName || 'recorded_voice.m4a');
      setCurrentFileSize(res.fileSize || 0);

      if (onStopRecording) {
        onStopRecording(
          res.filePath,
          finalDuration,
          'RECORDED',
          res.fileName || 'recorded_voice.m4a',
          res.fileSize,
          res.mimeType || 'audio/m4a'
        );
      }
    } catch (err: any) {
      console.warn('Error stopping recording:', err);
      Alert.alert('Recording Error', err?.message || 'Error finalizing audio recording.');
    }
  };

  // ─── REAL UPLOAD PICKER (ANDROID SYSTEM PICKER) ───────────────────
  const handleUploadAudioFile = async () => {
    if (isPlaying) {
      await handleStopPlayback();
    }

    try {
      const result = await services.audioRecorderService.pickAudioFile();
      if (!result) {
        // User cancelled picker
        return;
      }

      setAudioUri(result.filePath);
      setAudioSource('UPLOADED');
      setCurrentFileName(result.fileName || 'uploaded_audio.m4a');
      setCurrentFileSize(result.fileSize || 0);
      setDuration(result.durationSeconds || 0);

      if (onStopRecording) {
        onStopRecording(
          result.filePath,
          result.durationSeconds || 0,
          'UPLOADED',
          result.fileName,
          result.fileSize,
          result.mimeType
        );
      }
    } catch (err: any) {
      console.warn('Audio picker error:', err);
      Alert.alert('Audio Picker Error', err?.message || 'Unable to read the selected audio file.');
    }
  };

  // ─── REAL AUDIBLE PLAYBACK (LOUDSPEAKER ROUTE) ────────────────────
  const handlePlay = async () => {
    const targetUri = audioUri || initialAudioUri;
    if (!targetUri) {
      Alert.alert('No Audio', 'No audio recording found to play.');
      return;
    }

    try {
      if (isPaused) {
        await services.audioRecorderService.resumePlayback();
        setIsPlaying(true);
        setIsPaused(false);
      } else {
        const res = await services.audioRecorderService.startPlayback(targetUri);
        setIsPlaying(true);
        setIsPaused(false);
        setPlaybackSeconds(0);
        if (res.duration > 0 && (!duration || duration === 0)) {
          setDuration(res.duration);
        }
      }

      // Track playback progress
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = setInterval(async () => {
        try {
          const status = await services.audioRecorderService.getPlaybackStatus?.();
          if (status) {
            setPlaybackSeconds(status.currentPosition);
            if (!status.isPlaying && status.currentPosition === 0) {
              if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
              setIsPlaying(false);
              setIsPaused(false);
            }
          } else {
            setPlaybackSeconds(prev => {
              const next = prev + 1;
              if (next >= (duration || 10)) {
                if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
                setIsPlaying(false);
                setIsPaused(false);
                return 0;
              }
              return next;
            });
          }
        } catch {
          // Poll fallback
        }
      }, 500);
    } catch (err: any) {
      console.warn('Native playback error:', err);
      setIsPlaying(false);
      setIsPaused(false);
      Alert.alert('Playback Error', 'Unable to play the audio file on this device.');
    }
  };

  const handlePause = async () => {
    try {
      await services.audioRecorderService.pausePlayback();
      setIsPlaying(false);
      setIsPaused(true);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    } catch (err) {
      console.warn('Pause error:', err);
    }
  };

  const handleStopPlayback = async () => {
    try {
      await services.audioRecorderService.stopPlayback();
      setIsPlaying(false);
      setIsPaused(false);
      setPlaybackSeconds(0);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    } catch (err) {
      console.warn('Stop playback error:', err);
    }
  };

  const handleDeleteAudio = async () => {
    if (isPlaying || isPaused) {
      await handleStopPlayback();
    }
    setAudioUri(null);
    setCurrentFileName(null);
    setCurrentFileSize(null);
    setDuration(0);
    setPlaybackSeconds(0);
    if (onDeleteRecording) {
      onDeleteRecording();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalSecs = duration || 1;
  const progressPercent = totalSecs > 0 ? Math.min(100, (playbackSeconds / totalSecs) * 100) : 0;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <View
          style={[
            styles.micBadge,
            audioSource === 'UPLOADED' && styles.micBadgeUploaded,
          ]}
        >
          <Icon
            name={audioSource === 'UPLOADED' ? 'file-music' : audioUri ? 'check-circle' : 'microphone'}
            size={14}
            color={audioSource === 'UPLOADED' ? '#2563EB' : '#16A34A'}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.micBadgeText,
              audioSource === 'UPLOADED' && styles.micBadgeTextUploaded,
            ]}
          >
            {isRecording
              ? 'Mic Active'
              : audioUri
              ? audioSource === 'UPLOADED'
                ? 'Uploaded File'
                : 'Recorded Voice'
              : 'Mic Ready'}
          </Text>
        </View>
      </View>

      {/* STATE 1: RECORDING LIVE (TALK) */}
      {isRecording ? (
        <View style={styles.recordingStateBox}>
          <Animated.View
            style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}
          >
            <Icon name="microphone" size={32} color="#FFFFFF" />
          </Animated.View>

          <View style={styles.recordingMeta}>
            <Text style={styles.liveRecLabel}>🔴 RECORDING REAL MIC AUDIO...</Text>
            <Text style={styles.liveRecTimer}>{formatTime(recTimer)}</Text>
            <Text style={styles.recAdviceText}>
              Speak clearly into your device microphone
            </Text>
          </View>

          {/* Real-time active sound level wave bars */}
          <View style={styles.liveWaveformRow}>
            {[10, 20, 16, 28, 22, 34, 16, 28, 20, 32, 14, 26, 18, 24].map((baseH, i) => {
              // Modulate height based on actual live amplitude if available
              const ampBoost = liveAmplitude > 0 ? Math.min(24, Math.round((liveAmplitude / 32767) * 28)) : 0;
              const h = Math.min(36, Math.max(8, baseH + ampBoost + ((recTimer * 5 + i * 4) % 12)));
              return (
                <View
                  key={`live-wave-${i}`}
                  style={[
                    styles.liveWaveBar,
                    {
                      height: h,
                      backgroundColor: '#DC2626',
                    },
                  ]}
                />
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopRealRecording}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Stop Recording"
          >
            <Icon name="stop" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.stopButtonText}>Stop Recording</Text>
          </TouchableOpacity>
        </View>
      ) : audioUri || initialAudioUri ? (
        /* STATE 2: RECORDED OR UPLOADED AUDIO ATTACHED */
        <View style={styles.playerCard}>
          <View style={styles.playerMainRow}>
            {/* Play / Pause Toggle Button */}
            <TouchableOpacity
              style={[styles.playBtn, isPlaying && styles.playBtnActive]}
              onPress={isPlaying ? handlePause : handlePlay}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause Audio' : 'Play Audio'}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={26}
                color="#FFFFFF"
                style={!isPlaying ? { marginLeft: 3 } : undefined}
              />
            </TouchableOpacity>

            <View style={styles.playerTrackCol}>
              <View style={styles.playerMetaRow}>
                <Text style={styles.audioTitleText} numberOfLines={1}>
                  {currentFileName ||
                    (audioSource === 'UPLOADED' ? 'uploaded_audio.m4a' : 'recorded_voice.m4a')}
                </Text>
                <Text style={styles.timeCounterText}>
                  {formatTime(playbackSeconds)} / {formatTime(duration)}
                </Text>
              </View>

              {/* File details sub-label */}
              <View style={styles.fileDetailsRow}>
                <Text style={styles.fileDetailBadge}>
                  {audioSource === 'UPLOADED' ? 'Device Storage' : 'Microphone Recording'}
                </Text>
                {currentFileSize ? (
                  <Text style={styles.fileDetailSize}>
                    • {formatFileSize(currentFileSize)}
                  </Text>
                ) : null}
              </View>

              {/* Progress Bar Track */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>

              {/* Waveform indicator */}
              <View style={styles.waveformContainer}>
                {[12, 22, 16, 28, 12, 24, 18, 10, 26, 14, 20, 16, 24, 14].map((h, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: isPlaying ? Math.min(28, h + ((playbackSeconds * 4 + i * 3) % 10)) : h,
                        backgroundColor: isPlaying ? '#2563EB' : '#CBD5E1',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Player Controls & Re-record Actions */}
          <View style={styles.playerFooterRow}>
            {/* Playback Controls: Stop & Loudspeaker Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {(isPlaying || isPaused) && (
                <TouchableOpacity
                  style={styles.stopPlaybackBtn}
                  onPress={handleStopPlayback}
                  activeOpacity={0.7}
                >
                  <Icon name="stop" size={14} color="#64748B" style={{ marginRight: 2 }} />
                  <Text style={styles.stopPlaybackText}>Stop</Text>
                </TouchableOpacity>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 4 }}>
                <Icon name="volume-high" size={15} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.speakerStatusText}>Speaker Output</Text>
              </View>
            </View>

            {/* Action buttons: Re-record & Delete */}
            <View style={styles.reRecordActions}>
              <TouchableOpacity
                style={styles.reRecordBtn}
                onPress={handleStartRealRecording}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={14} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.reRecordBtnText}>Re-record</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteAudioBtn}
                onPress={handleDeleteAudio}
                activeOpacity={0.7}
                accessibilityLabel="Delete audio recording"
              >
                <Icon name="trash-can-outline" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* STATE 3: READY TO RECORD OR UPLOAD */
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryRecordButton}
            onPress={handleStartRealRecording}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Record Audio Voice Note"
          >
            <Icon name="microphone" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryRecordButtonText}>Record Audio Voice Note</Text>
          </TouchableOpacity>

          <Text style={styles.orDividerText}>or upload audio file</Text>

          <TouchableOpacity
            style={styles.secondaryUploadButton}
            onPress={handleUploadAudioFile}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Upload Audio File"
          >
            <Icon name="upload" size={18} color="#1E293B" style={{ marginRight: 8 }} />
            <Text style={styles.secondaryUploadButtonText}>
              Upload Audio (.mp3, .m4a)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
  },
  micBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  micBadgeUploaded: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  micBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  micBadgeTextUploaded: {
    color: '#1D4ED8',
  },

  // State 1: Recording
  recordingStateBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 16,
    alignItems: 'center',
  },
  pulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingMeta: {
    alignItems: 'center',
    marginBottom: 10,
  },
  liveRecLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  liveRecTimer: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    marginBottom: 2,
  },
  recAdviceText: {
    fontSize: 12,
    color: '#64748B',
  },
  liveWaveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    gap: 4,
    marginBottom: 14,
  },
  liveWaveBar: {
    width: 4,
    borderRadius: 2,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // State 2: Player
  playerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  playerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  playBtnActive: {
    backgroundColor: '#059669',
  },
  playerTrackCol: {
    flex: 1,
  },
  playerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  audioTitleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  timeCounterText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  fileDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fileDetailBadge: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
  },
  fileDetailSize: {
    fontSize: 11,
    color: '#64748B',
    marginLeft: 4,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    gap: 3,
  },
  waveBar: {
    flex: 1,
    borderRadius: 1.5,
  },
  playerFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  speakerStatusText: {
    fontSize: 11.5,
    color: '#059669',
    fontWeight: '500',
  },
  stopPlaybackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  stopPlaybackText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  reRecordActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reRecordBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteAudioBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  // State 3: Ready to Record
  actionsContainer: {
    alignItems: 'center',
  },
  primaryRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    width: '100%',
    height: 48,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  primaryRecordButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  orDividerText: {
    fontSize: 11,
    color: '#94A3B8',
    marginVertical: 8,
  },
  secondaryUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    width: '100%',
    height: 44,
  },
  secondaryUploadButtonText: {
    color: '#1E293B',
    fontSize: 13.5,
    fontWeight: '600',
  },
});
