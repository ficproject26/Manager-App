/**
 * HTTP Implementation of IDashboardRepository
 * Authoritative connection to Manager backend (No Mock Fallbacks)
 */
import { IDashboardRepository, DashboardSummaryData } from '../IDashboardRepository';
import { Activity, Priority } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpDashboardRepository implements IDashboardRepository {
  private inFlightDashboardPromise: Promise<any> | null = null;

  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  private async fetchDashboardData(): Promise<any> {
    if (this.inFlightDashboardPromise) {
      return this.inFlightDashboardPromise;
    }

    const token = await this.getToken();
    this.inFlightDashboardPromise = apiClient
      .get<any>('/reports/dashboard', {
        token,
        timeoutMs: 30000,
      })
      .then((res) => {
        // Reset in-flight promise after 3 seconds so subsequent manual refreshes hit the server
        setTimeout(() => {
          this.inFlightDashboardPromise = null;
        }, 3000);
        return res;
      })
      .catch((err) => {
        this.inFlightDashboardPromise = null;
        throw err;
      });

    return this.inFlightDashboardPromise;
  }

  async getDashboardSummary(managerId: string): Promise<DashboardSummaryData> {
    const storedMgrObj = await services.storageService.getItem('ACTIVE_MGR_OBJECT');
    let cachedManager: any = null;
    if (storedMgrObj) {
      try {
        cachedManager = JSON.parse(storedMgrObj);
      } catch {}
    }

    const response = await this.fetchDashboardData();

    const resData = response.data || response;
    const kpis = resData?.kpiMetrics || resData?.kpis || resData?.stats || {};
    const statusCounts = resData?.statusCounts || {};
    const todayActivities = resData?.todayActivities || resData?.recentActivities || [];

    return {
      managerName: cachedManager?.name || 'Manager',
      role: resData?.role || cachedManager?.role || 'MANAGER',
      territoryName: cachedManager?.territoryName || cachedManager?.division || cachedManager?.state || 'Territory Scope',
      vendorCount: kpis.totalVendors ?? statusCounts.total ?? 0,
      activeTaskCount: kpis.activeTasks ?? 0,
      openIssueCount: kpis.openIssues ?? 0,
      todayActivityCount: todayActivities.length,
      managerCount: kpis.totalManagers ?? kpis.activeManagers ?? 0,
      activeOutletsCount: kpis.activeVendors ?? statusCounts.active ?? 0,
      onboardedVendorCount: kpis.totalTieups ?? statusCounts.active ?? 0,
      managerGrowth: '+0%',
      vendorGrowth: '+0%',
      outletsGrowth: '+0%',
      onboardedGrowth: '+0%',
      stateScope: cachedManager?.state || '',
      highPriorityAlerts: [],
    };
  }

  async getRecentActivities(managerId: string, limit: number = 10): Promise<Activity[]> {
    try {
      const response = await this.fetchDashboardData();

      const resData = response.data || response;
      const rawActivities = resData?.recentActivities || resData?.todayActivities || [];

      return rawActivities.slice(0, limit).map((a: any, index: number) => ({
        id: a._id || a.id || `act-${index}`,
        managerId: a.userId || managerId,
        activityType: (a.action || a.activityType || 'VENDOR_ONBOARDED') as any,
        entityId: a.recordId || a.entityId || '',
        entityName: a.details?.vendorName || a.details?.name || a.entityName || a.module || 'System Event',
        timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
        territory: {
          stateId: a.stateId || '',
          districtId: a.districtId,
          divisionId: a.divisionId,
          pincodeId: a.pincodeId,
        },
        metadata: {
          description: a.description || a.details?.message || a.action || 'Activity recorded',
        },
      }));
    } catch {
      return [];
    }
  }
}
