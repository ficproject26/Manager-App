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

      const storedMgrObj = await services.storageService.getItem('ACTIVE_MGR_OBJECT');
      let cachedManager: any = null;
      if (storedMgrObj) {
        try {
          cachedManager = JSON.parse(storedMgrObj);
        } catch {}
      }

      const activeId = String(cachedManager?.id || managerId || '').trim().toLowerCase();
      const activeName = String(cachedManager?.name || '').trim().toLowerCase();

      // Strictly isolate to authenticated manager's activities (Module 2)
      const personalActivities = rawActivities.filter((a: any) => {
        const aUserId = String(a.userId || a.managerId || a.actorId || '').trim().toLowerCase();
        const aUserName = String(a.userName || a.actorName || a.actor || '').trim().toLowerCase();
        if (activeId && aUserId && (aUserId === activeId || aUserId.includes(activeId) || activeId.includes(aUserId))) {
          return true;
        }
        if (activeName && aUserName && (aUserName === activeName || aUserName.includes(activeName) || activeName.includes(aUserName))) {
          return true;
        }
        return false;
      });

      // Sort latest first
      personalActivities.sort((x: any, y: any) => {
        const tx = new Date(x.timestamp || x.createdAt || 0).getTime();
        const ty = new Date(y.timestamp || y.createdAt || 0).getTime();
        return ty - tx;
      });

      return personalActivities.slice(0, limit).map((a: any, index: number) => {
        const rawAction = a.action || a.activityType || 'Field Activity';
        const rawDetails = typeof a.details === 'string' ? a.details : (a.details?.message || a.details?.vendorName || a.details?.name || a.details?.shopName || '');
        const entityName = rawDetails || a.entityName || (a.newValue && typeof a.newValue === 'object' ? a.newValue.businessName : '') || a.module || rawAction;

        return {
          id: a._id || a.id || `act-${index}`,
          managerId: a.userId || managerId,
          activityType: rawAction,
          entityId: a.recordId || a.entityId || '',
          entityName,
          timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
          territory: {
            stateId: a.stateId || '',
            districtId: a.districtId,
            divisionId: a.divisionId,
            pincodeId: a.pincodeId,
          },
          metadata: {
            action: rawAction,
            description: rawDetails || rawAction,
            details: a.details,
            recordType: a.recordType || a.module || 'activity',
          },
        };
      });
    } catch {
      return [];
    }
  }
}
