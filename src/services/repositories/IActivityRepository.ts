/**
 * Abstract Activity & Report Repository Contract
 */
import { Activity, Report, ReportType } from '../../types';

export interface IActivityRepository {
  getActivityFeed(managerId: string): Promise<Activity[]>;
  getReportsHistory(managerId: string): Promise<Report[]>;
  submitExceptionReport(payload: {
    activityId: string;
    managerId: string;
    vendorId: string;
    reportType: ReportType;
    textNotes?: string;
    voiceUrl?: string;
    voiceDurationSeconds?: number;
  }): Promise<Report>;
  logActivity(payload: {
    managerId: string;
    activityType: string;
    entityId: string;
    entityName: string;
    stateId?: string;
    districtId?: string;
    divisionId?: string;
    pincodeId?: string;
  }): Promise<Activity>;
}
