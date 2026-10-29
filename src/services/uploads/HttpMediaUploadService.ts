/**
 * HTTP Implementation of IMediaUploadService
 */
import {
  IMediaUploadService,
  UploadProgressCallback,
  VisitExceptionReportPayload,
  VisitExceptionReportResult,
} from './IMediaUploadService';
import { apiClient } from '../api/ApiClient';
import { services } from '../index';

interface UploadResponse {
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export class HttpMediaUploadService implements IMediaUploadService {
  async uploadAudioReport(
    filePath: string,
    onProgress?: UploadProgressCallback,
    options?: { fileName?: string; mimeType?: string }
  ): Promise<string> {
    const token = await services.storageService.getAuthToken();
    const formData = new FormData();
    const filename = options?.fileName || filePath.split('/').pop() || `voice_${Date.now()}.m4a`;
    const mimeType = options?.mimeType || (filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/m4a');

    formData.append('audio', {
      uri: filePath,
      name: filename,
      type: mimeType,
    } as any);

    const response = await apiClient.uploadMultipartWithProgress<UploadResponse>(
      '/uploads/audio',
      formData,
      { token: token || undefined, onProgress }
    );

    return response.data.url;
  }

  async submitVisitExceptionReport(
    payload: VisitExceptionReportPayload,
    onProgress?: UploadProgressCallback
  ): Promise<VisitExceptionReportResult> {
    const token = await services.storageService.getAuthToken();
    const formData = new FormData();

    formData.append('businessName', payload.businessName);
    formData.append('vendorName', payload.vendorName || 'Prospective Merchant');
    formData.append('category', payload.category || 'General');
    formData.append('reason', payload.reason);
    formData.append('managerId', payload.managerId);

    if (payload.audioUri) {
      const filename = payload.audioFileName || payload.audioUri.split('/').pop() || 'voice_note.m4a';
      const mimeType = payload.audioMimeType || (filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/m4a');

      formData.append('audio', {
        uri: payload.audioUri,
        name: filename,
        type: mimeType,
      } as any);
    }

    const response = await apiClient.uploadMultipartWithProgress<VisitExceptionReportResult>(
      '/visits/exception-report',
      formData,
      { token: token || undefined, onProgress }
    );

    return {
      success: true,
      reportId: response.data?.reportId || `exc-${Date.now()}`,
      audioUrl: response.data?.audioUrl || null,
      audioFileName: response.data?.audioFileName || payload.audioFileName,
      message: response.data?.message || 'Voice note uploaded successfully',
    };
  }

  async uploadShopPhoto(
    localUri: string,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    const token = await services.storageService.getAuthToken();
    const formData = new FormData();
    const filename = localUri.split('/').pop() || `photo_${Date.now()}.jpg`;

    formData.append('file', {
      uri: localUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    const response = await apiClient.uploadMultipartWithProgress<any>(
      '/uploads/photo',
      formData,
      { token: token || undefined, onProgress }
    );

    return response.data?.url || response.data?.file?.url || (response as any).file?.url || '';
  }
}
