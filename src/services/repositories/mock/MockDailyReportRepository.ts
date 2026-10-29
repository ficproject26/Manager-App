/**
 * Mock Implementation of IDailyReportRepository
 */
import { IDailyReportRepository, SubmitDailyReportPayload, ReportPeriodFilter } from '../IDailyReportRepository';
import { DailyReport } from '../../../types';
import { fieldVisitService } from '../../reports/FieldVisitService';

const getInitialMockReports = (): DailyReport[] => {
  return [];
};

export class MockDailyReportRepository implements IDailyReportRepository {
  private reports: DailyReport[] = getInitialMockReports();

  async getTodayReport(managerId: string, dateStr: string): Promise<DailyReport | null> {
    const found = this.reports.find(
      r => r.managerId === managerId && r.date === dateStr
    );
    return found ? { ...found } : null;
  }

  async getReportById(id: string): Promise<DailyReport | null> {
    if (!id || id.includes('invalid') || id.includes('nonexistent')) {
      return null;
    }
    const found = this.reports.find(r => r.id === id);
    if (found) {
      return { ...found };
    }

    // Dynamic report details generator for any live visit record
    const visitRecords = await fieldVisitService.getVisitRecords();
    const matchedVisit = visitRecords.find(v => v.id === id);

    if (!matchedVisit) {
      return null;
    }

    const shopTitle = matchedVisit.shopName || 'Field Visit Audit Log';
    const shopLocation = matchedVisit.location || '';

    return {
      id: id,
      managerId: matchedVisit.managerName || 'mgr-000',
      managerName: matchedVisit.managerName || 'Field Manager',
      date: new Date().toISOString().split('T')[0],
      workSummary: `Verified operational catalog compliance, storefront GPS geotagging, and merchant onboarding details for ${shopTitle}.`,
      shopsVisitedCount: 1,
      vendorsVisited: [
        { vendorId: matchedVisit.id, vendorName: shopTitle, location: shopLocation },
      ],
      issuesFollowUp: matchedVisit.isInterested ? 'Merchant interested in onboarding.' : (matchedVisit.reasonNotInterested || 'Not interested'),
      additionalNotes: `Field audit recorded at ${matchedVisit.gpsCoords || 'N/A'}.`,
      voiceUrl: matchedVisit.voiceNoteUri,
      voiceDurationSeconds: matchedVisit.voiceNoteDuration,
      photo1Url: matchedVisit.photoUrl,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async submitDailyReport(payload: SubmitDailyReportPayload): Promise<DailyReport> {
    const existing = await this.getTodayReport(payload.managerId, payload.date);
    if (existing) {
      throw new Error("Today's report has already been submitted.");
    }

    const now = new Date().toISOString();
    const newReport: DailyReport = {
      id: `dr-${Date.now()}`,
      managerId: payload.managerId,
      date: payload.date,
      workSummary: payload.workSummary,
      shopsVisitedCount: payload.shopsVisitedCount ?? payload.vendorsVisited.length,
      vendorsVisited: payload.vendorsVisited,
      voiceUrl: payload.voiceUrl,
      voiceDurationSeconds: payload.voiceDurationSeconds,
      photo1Url: payload.photo1Url,
      photo2Url: payload.photo2Url,
      issuesFollowUp: payload.issuesFollowUp,
      additionalNotes: payload.additionalNotes,
      status: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
    };

    this.reports.unshift(newReport);
    return { ...newReport };
  }

  async getReports(
    managerId: string,
    period?: ReportPeriodFilter,
    searchQuery?: string
  ): Promise<DailyReport[]> {
    let result = this.reports.filter(r => r.managerId === managerId || managerId === 'mgr-000');

    if (period && period !== 'ALL') {
      const now = new Date();
      result = result.filter(r => {
        const reportDate = new Date(r.date);
        const diffMs = now.getTime() - reportDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (period === 'DAILY') {
          return diffDays <= 1.5;
        }
        if (period === 'WEEKLY') {
          return diffDays <= 7;
        }
        if (period === 'MONTHLY') {
          return diffDays <= 30;
        }
        return true;
      });
    }

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        r =>
          r.date.toLowerCase().includes(q) ||
          r.workSummary.toLowerCase().includes(q) ||
          (r.issuesFollowUp && r.issuesFollowUp.toLowerCase().includes(q)) ||
          (r.additionalNotes && r.additionalNotes.toLowerCase().includes(q))
      );
    }

    return result;
  }
}
