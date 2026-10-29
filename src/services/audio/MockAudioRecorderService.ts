/**
 * Real Microphone Audio Recorder Service Implementation
 * Integrates with Android NativeAudioModule (MediaRecorder & MediaPlayer)
 */
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import {
  AudioRecordingResult,
  IAudioRecorderService,
  PermissionStatus,
} from './IAudioRecorderService';

const { NativeAudio } = NativeModules;

export class MockAudioRecorderService implements IAudioRecorderService {
  private recordingState: boolean = false;
  private startTime: number = 0;
  private lastRecordedPath: string = '';

  async requestMicrophonePermission(): Promise<PermissionStatus> {
    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (hasPermission) {
          return 'GRANTED';
        }

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission Required',
            message:
              'FIC Manager requires access to your microphone to record audio voice notes for field visit reports.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'Allow',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return 'GRANTED';
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return 'NEVER_ASK_AGAIN';
        } else {
          return 'DENIED';
        }
      } catch (e) {
        console.warn('Microphone permission check error:', e);
      }
    }

    return 'GRANTED';
  }

  async startRecording(): Promise<void> {
    if (this.recordingState) {
      return;
    }

    const permission = await this.requestMicrophonePermission();
    if (permission !== 'GRANTED') {
      throw new Error(`Microphone permission ${permission}`);
    }

    this.recordingState = true;
    this.startTime = Date.now();

    if (NativeAudio && typeof NativeAudio.startRecording === 'function') {
      try {
        const path = await NativeAudio.startRecording();
        this.lastRecordedPath = path;
        return;
      } catch (e) {
        console.warn('NativeAudio.startRecording failed:', e);
        this.recordingState = false;
        throw e;
      }
    }
  }

  async getRecordingStatus(): Promise<{ isRecording: boolean; elapsedSeconds: number; amplitude: number }> {
    if (NativeAudio && typeof NativeAudio.getRecordingStatus === 'function') {
      try {
        return await NativeAudio.getRecordingStatus();
      } catch (e) {}
    }
    const elapsed = this.recordingState ? Math.max(0, Math.round((Date.now() - this.startTime) / 1000)) : 0;
    return { isRecording: this.recordingState, elapsedSeconds: elapsed, amplitude: 0 };
  }

  async stopRecording(): Promise<AudioRecordingResult> {
    const elapsed = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));
    this.recordingState = false;

    if (NativeAudio && typeof NativeAudio.stopRecording === 'function') {
      try {
        const res = await NativeAudio.stopRecording();
        const finalPath = res.filePath || this.lastRecordedPath;
        const duration = res.durationSeconds || elapsed;

        return {
          filePath: finalPath,
          durationSeconds: duration,
          mimeType: res.mimeType || 'audio/m4a',
          source: 'RECORDED',
          fileName: res.fileName || finalPath.split('/').pop() || 'voice_note.m4a',
          fileSize: res.fileSize || 0,
        };
      } catch (e) {
        console.warn('NativeAudio.stopRecording failed:', e);
        throw e;
      }
    }

    throw new Error('Native audio recorder is not available on this platform.');
  }

  async cancelRecording(): Promise<void> {
    this.recordingState = false;
    if (NativeAudio && typeof NativeAudio.stopRecording === 'function') {
      try {
        await NativeAudio.stopRecording();
      } catch (e) {}
    }
  }

  async releaseMicrophone(): Promise<void> {
    this.recordingState = false;
  }

  isRecording(): boolean {
    return this.recordingState;
  }

  async pickAudioFile(): Promise<AudioRecordingResult | null> {
    if (NativeAudio && typeof NativeAudio.pickAudioFile === 'function') {
      try {
        const res = await NativeAudio.pickAudioFile();
        if (!res) {
          return null; // User cancelled
        }
        return {
          filePath: res.filePath,
          fileName: res.fileName,
          fileSize: res.fileSize,
          mimeType: res.mimeType || 'audio/m4a',
          durationSeconds: res.durationSeconds || 0,
          source: 'UPLOADED',
        };
      } catch (e) {
        console.warn('NativeAudio.pickAudioFile error:', e);
        throw e;
      }
    }
    return null;
  }

  async startPlayback(filePath: string): Promise<{ duration: number }> {
    if (NativeAudio && typeof NativeAudio.startPlayback === 'function') {
      try {
        const res = await NativeAudio.startPlayback(filePath);
        return { duration: res?.duration || 0 };
      } catch (e) {
        console.warn('NativeAudio.startPlayback error:', e);
        throw e;
      }
    }
    throw new Error('Native audio player is not available on this platform.');
  }

  async pausePlayback(): Promise<void> {
    if (NativeAudio && typeof NativeAudio.pausePlayback === 'function') {
      try {
        await NativeAudio.pausePlayback();
      } catch (e) {}
    }
  }

  async resumePlayback(): Promise<void> {
    if (NativeAudio && typeof NativeAudio.resumePlayback === 'function') {
      try {
        await NativeAudio.resumePlayback();
      } catch (e) {}
    }
  }

  async stopPlayback(): Promise<void> {
    if (NativeAudio && typeof NativeAudio.stopPlayback === 'function') {
      try {
        await NativeAudio.stopPlayback();
      } catch (e) {}
    }
  }

  async getPlaybackStatus(): Promise<{ isPlaying: boolean; currentPosition: number; duration: number }> {
    if (NativeAudio && typeof NativeAudio.getPlaybackStatus === 'function') {
      try {
        return await NativeAudio.getPlaybackStatus();
      } catch (e) {}
    }
    return { isPlaying: false, currentPosition: 0, duration: 0 };
  }
}
