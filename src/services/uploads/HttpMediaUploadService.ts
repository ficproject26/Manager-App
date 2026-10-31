/**
 * HTTP Implementation of IMediaUploadService
 * Authoritative connection to backend S3 / Document uploads & Shop Visits
 */
import {
  IMediaUploadService,
  UploadProgressCallback,
  VisitExceptionReportPayload,
  VisitExceptionReportResult,
} from './IMediaUploadService';
import { apiClient } from '../api/ApiClient';
import { services } from '../index';

interface DocumentUploadResponse {
  success: boolean;
  message?: string;
  url?: string;
  file?: {
    name?: string;
    filename?: string;
    key?: string;
    url?: string;
    secure_url?: string;
    size?: number;
    type?: string;
  };
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

    // The backend's handleDocumentUpload in uploadRoutes.js accepts field 'document' or 'file'
    formData.append('document', {
      uri: filePath,
      name: filename,
      type: mimeType,
    } as any);

    const response = await apiClient.uploadMultipartWithProgress<DocumentUploadResponse>(
      '/uploads/document',
      formData,
      { token: token || undefined, onProgress }
    );

    const raw = response.data || (response as any);
    const uploadedUrl = raw?.file?.secure_url || raw?.file?.url || raw?.url || '';
    if (!uploadedUrl) {
      throw new Error(raw?.message || 'Failed to retrieve uploaded audio URL from server.');
    }
    return uploadedUrl;
  }

  async submitVisitExceptionReport(
    payload: VisitExceptionReportPayload,
    onProgress?: UploadProgressCallback
  ): Promise<VisitExceptionReportResult> {
    const token = await services.storageService.getAuthToken();
    let audioUrl: string | null = null;

    // 1. Upload audio file if present
    if (payload.audioUri) {
      try {
        audioUrl = await this.uploadAudioReport(payload.audioUri, onProgress, {
          fileName: payload.audioFileName || undefined,
          mimeType: payload.audioMimeType || undefined,
        });
      } catch (uploadErr: any) {
        console.warn('[HttpMediaUploadService] Audio upload fallback / error:', uploadErr);
        throw new Error(uploadErr?.message || 'Audio file upload failed. Please verify connection and retry.');
      }
    }

    // 2. Persist shop visit exception report via authoritative /shop-visits backend endpoint
    const visitPayload = {
      shopName: payload.businessName.trim(),
      category: payload.category || 'General',
      interestedStatus: 'NO',
      notInterestedReason: payload.reason.trim() || 'Voice exception report attached',
      voiceNote: audioUrl || undefined,
      audioVoiceNote: audioUrl || undefined,
      managerId: payload.managerId,
    };

    const visitRes = await apiClient.post<any>('/shop-visits', visitPayload, {
      token: token || undefined,
      timeoutMs: 30000,
    });

    const visitData = visitRes.data || (visitRes as any);
    const createdVisit = visitData?.data || visitData;

    return {
      success: true,
      reportId: createdVisit?._id || createdVisit?.id || `visit-${Date.now()}`,
      audioUrl: audioUrl || createdVisit?.voiceNote || null,
      audioFileName: payload.audioFileName,
      message: 'Declined interest exception report recorded successfully.',
    };
  }

  async uploadShopPhoto(
    localUri: string,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    const token = await services.storageService.getAuthToken();
    const formData = new FormData();
    const filename = localUri.split('/').pop() || `photo_${Date.now()}.jpg`;

    formData.append('document', {
      uri: localUri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    const response = await apiClient.uploadMultipartWithProgress<any>(
      '/uploads/document',
      formData,
      { token: token || undefined, onProgress }
    );

    const raw = response.data || (response as any);
    return raw?.file?.secure_url || raw?.file?.url || raw?.url || '';
  }
}
