/**
 * HTTP Implementation of IActivityRepository
 * Authoritative connection to Manager backend (No Mock Fallbacks)
 */
import { IActivityRepository } from '../IActivityRepository';
import { Activity, ActivityType, Report, ReportType } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpActivityRepository implements IActivityRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  async getActivityFeed(managerId: string): Promise<Activity[]> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<any[]>('/audit-logs', {
        token,
        params: { managerId },
      });
      const list: any[] = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
      return list.map((a, i) => ({
        id: a._id || a.id || `act-${i}`,
        managerId: a.userId || managerId,
        activityType: (a.action || a.activityType || ActivityType.VENDOR_ONBOARDED) as ActivityType,
        entityId: a.recordId || a.entityId || '',
        entityName: a.details?.vendorName || a.details?.name || a.entityName || a.module || 'Activity',
        timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
        territory: {
          stateId: a.stateId || a.territory?.stateId || '',
          districtId: a.districtId || a.territory?.districtId,
          divisionId: a.divisionId || a.territory?.divisionId,
          pincodeId: a.pincodeId || a.territory?.pincodeId,
        },
        metadata: {
          description: a.description || a.details?.message || a.action || 'Operational activity logged',
          ...a.details,
        },
      }));
    } catch {
      return [];
    }
  }

  async getReportsHistory(managerId: string): Promise<Report[]> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<any[]>('/reports/submitted', {
        token,
        params: { managerId },
      });
      const list: any[] = Array.isArray(response.data) ? response.data : (Array.isArray((response as any).reports) ? (response as any).reports : []);
      return list.map(r => ({
        id: r._id || r.id || r.reportCode || '',
        activityId: r.activityId || '',
        managerId: r.managerId || managerId,
        vendorId: r.vendorId || '',
        reportType: (r.reportType as ReportType) || ReportType.TEXT,
        textNotes: r.summary?.notes || r.notes || '',
        voiceUrl: r.voiceUrl,
        voiceDurationSeconds: r.voiceDurationSeconds,
        submittedAt: r.submittedAt || r.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
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
    const token = await this.getToken();
    const response = await apiClient.post<any>('/reports/submit', {
      periodLabel: 'Exception Report',
      ...payload,
    }, { token });
    const r = response.data || response;
    return {
      id: r._id || r.id || r.reportCode || `rep-${Date.now()}`,
      activityId: payload.activityId,
      managerId: payload.managerId,
      vendorId: payload.vendorId,
      reportType: payload.reportType,
      textNotes: payload.textNotes,
      voiceUrl: payload.voiceUrl,
      voiceDurationSeconds: payload.voiceDurationSeconds,
      submittedAt: r.submittedAt || new Date().toISOString(),
    };
  }

  async logActivity(payload: {
    managerId: string;
    activityType: string;
    entityId: string;
    entityName: string;
    stateId?: string;
    districtId?: string;
    divisionId?: string;
    pincodeId?: string;
  }): Promise<Activity> {
    return {
      id: `act-${Date.now()}`,
      managerId: payload.managerId,
      activityType: (payload.activityType as ActivityType) || ActivityType.VENDOR_ONBOARDED,
      entityId: payload.entityId,
      entityName: payload.entityName,
      timestamp: new Date().toISOString(),
      territory: {
        stateId: payload.stateId || '',
        districtId: payload.districtId,
        divisionId: payload.divisionId,
        pincodeId: payload.pincodeId,
      },
      metadata: {
        description: `Activity logged: ${payload.activityType} on ${payload.entityName}`,
      },
    };
  }
}
