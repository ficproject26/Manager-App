/**
 * Audio Recorder Service Interface for Exception Reports & Field Visits
 */

export interface AudioRecordingResult {
  filePath: string;
  durationSeconds: number;
  mimeType: string;
  source?: 'RECORDED' | 'UPLOADED';
  fileName?: string;
  fileSize?: number;
}

export type PermissionStatus = 'GRANTED' | 'DENIED' | 'NEVER_ASK_AGAIN';

export interface IAudioRecorderService {
  requestMicrophonePermission(): Promise<PermissionStatus>;
  startRecording(): Promise<void>;
  stopRecording(): Promise<AudioRecordingResult>;
  cancelRecording(): Promise<void>;
  releaseMicrophone(): Promise<void>;
  isRecording(): boolean;
  getRecordingStatus?(): Promise<{ isRecording: boolean; elapsedSeconds: number; amplitude: number }>;
  pickAudioFile(): Promise<AudioRecordingResult | null>;
  startPlayback(filePath: string): Promise<{ duration: number }>;
  pausePlayback(): Promise<void>;
  resumePlayback(): Promise<void>;
  stopPlayback(): Promise<void>;
  getPlaybackStatus?(): Promise<{ isPlaying: boolean; currentPosition: number; duration: number }>;
}
