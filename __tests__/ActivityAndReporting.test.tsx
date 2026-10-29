/**
 * Activity System & Exception Reporting Test Suite
 */
import { services } from '../src/services';
import { ActivityType, ReportType } from '../src/types';

describe('Activity Ledger & Exception Reporting Workflow', () => {
  it('1. Logs automatic operational activity with territory metadata', async () => {
    const activity = await services.activityRepository.logActivity({
      managerId: 'mgr-001',
      activityType: ActivityType.VENDOR_ONBOARDED,
      entityId: 'v-999',
      entityName: 'Apex Groceries',
      stateId: 'st-mp-01',
      districtId: 'dt-indore-01',
      divisionId: 'div-north-01',
      pincodeId: '452001',
    });

    expect(activity.id).toBeDefined();
    expect(activity.activityType).toBe(ActivityType.VENDOR_ONBOARDED);
    expect(activity.entityName).toBe('Apex Groceries');
    expect(activity.territory.stateId).toBe('st-mp-01');
  });

  it('2. Retrieves activity feed in reverse chronological order', async () => {
    const feed = await services.activityRepository.getActivityFeed('mgr-001');
    expect(feed).toBeDefined();
    expect(feed.length).toBeGreaterThanOrEqual(1);
    expect(feed[0].timestamp).toBeDefined();
  });

  it('3. Audio Recorder service starts, stops, and returns recording metadata', async () => {
    await services.audioRecorderService.startRecording();
    const result = await services.audioRecorderService.stopRecording();

    expect(result).toBeDefined();
    expect(result.filePath).toBeDefined();
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.mimeType).toBe('audio/m4a');
  });

  it('4. Media Upload service accepts audio file and returns remote URL', async () => {
    const url = await services.mediaUploadService.uploadAudioReport('file:///data/audio/mock.m4a');
    expect(url).toBeDefined();
    expect(url).toContain('https://');
    expect(url).toContain('audio/reports');
  });

  it('5. Submits text exception report attached to field visit', async () => {
    const report = await services.activityRepository.submitExceptionReport({
      activityId: 'act-999',
      managerId: 'mgr-001',
      vendorId: 'v-101',
      reportType: ReportType.TEXT,
      textNotes: 'Merchant currently bound by exclusive regional distributor contract.',
    });

    expect(report.id).toBeDefined();
    expect(report.reportType).toBe(ReportType.TEXT);
    expect(report.textNotes).toContain('exclusive regional distributor');
  });

  it('6. Submits voice exception report with audio URL and duration', async () => {
    const report = await services.activityRepository.submitExceptionReport({
      activityId: 'act-1000',
      managerId: 'mgr-001',
      vendorId: 'v-101',
      reportType: ReportType.VOICE,
      voiceUrl: 'https://cdn.forge.in/voice-reports/mock.m4a',
      voiceDurationSeconds: 15,
    });

    expect(report.id).toBeDefined();
    expect(report.reportType).toBe(ReportType.VOICE);
    expect(report.voiceUrl).toBeDefined();
    expect(report.voiceDurationSeconds).toBe(15);
  });
});
