/**
 * Mock Implementation of IActivityRepository for Auto-Activities & Exception Reports
 */
import { IActivityRepository } from '../IActivityRepository';
import { Activity, Report, ReportType } from '../../../types';

const INITIAL_MOCK_ACTIVITIES: Activity[] = [];
const INITIAL_MOCK_REPORTS: Report[] = [];

export class MockActivityRepository implements IActivityRepository {
  private activities: Activity[] = [...INITIAL_MOCK_ACTIVITIES];
  private reports: Report[] = [...INITIAL_MOCK_REPORTS];

  async getActivityFeed(managerId: string): Promise<Activity[]> {
    return this.activities
      .filter(a => a.managerId === managerId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getReportsHistory(managerId: string): Promise<Report[]> {
    return this.reports
      .filter(r => r.managerId === managerId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  async submitExceptionReport(payload: {
    activityId: string;
    managerId: string;
    vendorId: string;
    reportType: ReportType;
    textNotes?: string;
    voiceUrl?: string;
    voiceDurationSeconds?: number;
  }): Promise<Report> {
    const report: Report = {
      id: `rep-${Date.now()}`,
      activityId: payload.activityId,
      managerId: payload.managerId,
      vendorId: payload.vendorId,
      reportType: payload.reportType,
      textNotes: payload.textNotes,
      voiceUrl: payload.voiceUrl,
      voiceDurationSeconds: payload.voiceDurationSeconds,
      submittedAt: new Date().toISOString(),
    };
    this.reports.push(report);
    return report;
  }

  async logActivity(payload: {
    managerId: string;
    activityType: any;
    entityId: string;
    entityName: string;
    stateId?: string;
    districtId?: string;
    divisionId?: string;
    pincodeId?: string;
  }): Promise<Activity> {
    const activity: Activity = {
      id: `act-${Date.now()}`,
      managerId: payload.managerId,
      activityType: payload.activityType,
      entityId: payload.entityId,
      entityName: payload.entityName,
      timestamp: new Date().toISOString(),
      territory: {
        stateId: payload.stateId || 'st-tn-01',
        districtId: payload.districtId || 'dt-chn-01',
        divisionId: payload.divisionId || 'div-chn-central',
        pincodeId: payload.pincodeId || '600001',
      },
    };
    this.activities.unshift(activity);
    return activity;
  }
}
