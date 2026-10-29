/**
 * HTTP Implementation of IDailyReportRepository
 * Authoritative connection to Manager backend (No Mock Fallbacks)
 */
import { IDailyReportRepository, SubmitDailyReportPayload, ReportPeriodFilter } from '../IDailyReportRepository';
import { DailyReport } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpDailyReportRepository implements IDailyReportRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  async getTodayReport(managerId: string, dateStr: string): Promise<DailyReport | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<any>('/reports/submitted', {
        token,
        params: { managerId, date: dateStr, limit: 10 },
      });
      const list: any[] = Array.isArray(response.data) ? response.data : (Array.isArray((response as any).reports) ? (response as any).reports : []);
      const matched = list.find(r => r.date === dateStr || String(r.createdAt || r.submittedAt).startsWith(dateStr));
      return matched || null;
    } catch {
      return null;
    }
  }

  async getReportById(id: string): Promise<DailyReport | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<DailyReport>(`/reports/submitted/${id}`, { token });
      return response.data || null;
    } catch {
      return null;
    }
  }

  async submitDailyReport(payload: SubmitDailyReportPayload): Promise<DailyReport> {
    const token = await this.getToken();
    const response = await apiClient.post<any>('/reports/submit', {
      periodLabel: 'Daily Field Summary',
      summary: payload,
      ...payload,
    }, { token });
    return response.data || response;
  }

  async getReports(
    managerId: string,
    period?: ReportPeriodFilter,
    searchQuery?: string
  ): Promise<DailyReport[]> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = { managerId };
    if (period && period !== 'ALL') params.period = period;
    if (searchQuery) params.search = searchQuery;

    const response = await apiClient.get<any>('/reports/submitted', { token, params });
    const list = Array.isArray(response.data) ? response.data : (Array.isArray((response as any).reports) ? (response as any).reports : []);
    return list;
  }
}
