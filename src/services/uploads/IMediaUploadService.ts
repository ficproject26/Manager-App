/**
 * Replaceable Media Upload Service Interface
 */

export interface UploadProgressCallback {
  (percentage: number): void;
}

export interface UploadAudioOptions {
  fileName?: string;
  mimeType?: string;
  onProgress?: UploadProgressCallback;
}

export interface VisitExceptionReportPayload {
  businessName: string;
  vendorName?: string;
  category?: string;
  reason: string;
  managerId: string;
  audioUri?: string | null;
  audioFileName?: string | null;
  audioMimeType?: string | null;
  audioFileSize?: number | null;
}

export interface VisitExceptionReportResult {
  success: boolean;
  reportId: string;
  audioUrl?: string | null;
  audioFileName?: string | null;
  message?: string;
}

export interface IMediaUploadService {
  uploadAudioReport(
    filePath: string,
    onProgress?: UploadProgressCallback,
    options?: { fileName?: string; mimeType?: string }
  ): Promise<string>; // Returns remote URL

  submitVisitExceptionReport(
    payload: VisitExceptionReportPayload,
    onProgress?: UploadProgressCallback
  ): Promise<VisitExceptionReportResult>;

  uploadShopPhoto(
    localUri: string,
    onProgress?: UploadProgressCallback
  ): Promise<string>; // Returns remote URL
}
