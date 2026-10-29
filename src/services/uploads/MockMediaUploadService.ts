/**
 * Mock Media Upload Service Implementation
 */
import {
  IMediaUploadService,
  UploadProgressCallback,
  VisitExceptionReportPayload,
  VisitExceptionReportResult,
} from './IMediaUploadService';

export class MockMediaUploadService implements IMediaUploadService {
  async uploadAudioReport(
    filePath: string,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    if (onProgress) {
      onProgress(100);
    }
    return filePath;
  }

  async submitVisitExceptionReport(
    payload: VisitExceptionReportPayload,
    onProgress?: UploadProgressCallback
  ): Promise<VisitExceptionReportResult> {
    if (onProgress) {
      onProgress(100);
    }
    return {
      success: true,
      reportId: `exc-${Date.now()}`,
      audioUrl: payload.audioUri || null,
      message: 'Visit exception report submitted',
    };
  }

  async uploadShopPhoto(
    localUri: string,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    if (onProgress) {
      onProgress(100);
    }
    return localUri;
  }
}
