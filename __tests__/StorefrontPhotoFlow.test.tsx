/**
 * Storefront Photo & Camera Capture Test Suite
 */

// Mock react-native modules used by CameraLocationService
jest.mock('react-native', () => ({
  NativeModules: {
    NativeImagePicker: {
      launchCamera: jest.fn(() => Promise.resolve({
        uri: 'file:///data/user/0/com.ficmanager/cache/FIC_CAMERA_test.jpg',
        fileName: 'FIC_CAMERA_test.jpg',
        didCancel: false,
      })),
      launchGallery: jest.fn(() => Promise.resolve({
        uri: 'file:///data/user/0/com.ficmanager/cache/FIC_GALLERY_test.jpg',
        fileName: 'FIC_GALLERY_test.jpg',
        didCancel: false,
      })),
    },
  },
  Platform: { OS: 'android', select: jest.fn((obj: any) => obj.android), Version: 34 },
  PermissionsAndroid: {
    PERMISSIONS: {
      CAMERA: 'android.permission.CAMERA',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: jest.fn(() => Promise.resolve(true)),
    request: jest.fn(() => Promise.resolve('granted')),
  },
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
}));

import { cameraLocationService } from '../src/services/camera/CameraLocationService';
import { services } from '../src/services';

describe('Storefront Real Camera Capture & Gallery Upload Workflow', () => {
  it('1. Camera permission request returns valid permission status', async () => {
    const status = await cameraLocationService.requestCameraPermission();
    expect(['GRANTED', 'DENIED', 'NEVER_ASK_AGAIN']).toContain(status);
  });

  it('2. Location permission request returns valid permission status', async () => {
    const status = await cameraLocationService.requestLocationPermission();
    expect(['GRANTED', 'DENIED', 'NEVER_ASK_AGAIN']).toContain(status);
  });

  it('3. Gallery permission request returns valid permission status', async () => {
    const status = await cameraLocationService.requestGalleryPermission();
    expect(['GRANTED', 'DENIED', 'NEVER_ASK_AGAIN']).toContain(status);
  });

  it('4. capturePhotoWithGps (camera) captures real image URI via native module', async () => {
    const result = await cameraLocationService.capturePhotoWithGps('camera');
    expect(result).toBeDefined();
    expect(result.uri).toBeDefined();
    expect(result.uri.length).toBeGreaterThan(0);
    expect(result.fileName).toContain('FIC_CAMERA');
  });

  it('5. capturePhotoWithGps (gallery) picks image URI via native module', async () => {
    const result = await cameraLocationService.capturePhotoWithGps('gallery');
    expect(result).toBeDefined();
    expect(result.uri).toBeDefined();
    expect(result.uri.length).toBeGreaterThan(0);
    expect(result.fileName).toContain('FIC_GALLERY');
  });

  it('6. Media upload service preserves real captured file URI on upload', async () => {
    const sampleCapturedUri = 'file:///data/user/0/com.ficmanager/cache/storefront_captured_123.jpg';
    const uploadedUri = await services.mediaUploadService.uploadShopPhoto(sampleCapturedUri);
    expect(uploadedUri).toBe(sampleCapturedUri);
  });
});
