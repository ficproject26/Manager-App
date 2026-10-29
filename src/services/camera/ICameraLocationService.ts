/**
 * Camera & GPS Location Service Interface
 */

export interface LocationCoords {
  latitude: number;
  longitude: number;
  formattedGps: string;
}

export type PermissionResultStatus = 'GRANTED' | 'DENIED' | 'NEVER_ASK_AGAIN';

export interface CameraCaptureResult {
  uri: string;
  fileName: string;
  location?: LocationCoords;
}

export interface ICameraLocationService {
  requestCameraPermission(): Promise<PermissionResultStatus>;
  requestLocationPermission(): Promise<PermissionResultStatus>;
  getCurrentLocation(): Promise<LocationCoords>;
  capturePhotoWithGps(mode?: 'camera' | 'gallery'): Promise<CameraCaptureResult>;
}
