/**
 * Abstract Daily Report Repository Contract
 */
import { DailyReport } from '../../types';

export type ReportPeriodFilter = 'ALL' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface SubmitDailyReportPayload {
  managerId: string;
  date: string;
  workSummary: string;
  shopsVisitedCount?: number;
  vendorsVisited: { vendorId: string; vendorName: string; location?: string }[];
  voiceUrl?: string;
  voiceDurationSeconds?: number;
  photo1Url?: string;
  photo2Url?: string;
  issuesFollowUp?: string;
  additionalNotes?: string;
}

export interface IDailyReportRepository {
  getTodayReport(managerId: string, dateStr: string): Promise<DailyReport | null>;
  getReportById(id: string): Promise<DailyReport | null>;
  submitDailyReport(payload: SubmitDailyReportPayload): Promise<DailyReport>;
  getReports(
    managerId: string,
    period?: ReportPeriodFilter,
    searchQuery?: string
  ): Promise<DailyReport[]>;
}
