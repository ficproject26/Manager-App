/**
 * Mock Implementation of IDashboardRepository
 */
import { IDashboardRepository, DashboardSummaryData } from '../IDashboardRepository';
import { Activity } from '../../../types';
import { MockManagerRepository } from './MockManagerRepository';

const MOCK_ACTIVITIES: Activity[] = [];

export class MockDashboardRepository implements IDashboardRepository {
  private activities: Activity[] = [...MOCK_ACTIVITIES];
  private managerRepo = new MockManagerRepository();

  async getDashboardSummary(managerId: string): Promise<DashboardSummaryData> {
    await new Promise(resolve => setTimeout(resolve, 150));

    const mgr = await this.managerRepo.getManagerById(managerId);

    const managerName = mgr?.name || 'Field Manager';
    const roleFormatted = mgr?.role
      ? String(mgr.role).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      : 'State Manager';
    const territory = mgr?.territoryName || 'Tamil Nadu Scope';

    return {
      managerName,
      role: roleFormatted,
      territoryName: territory,
      vendorCount: 0,
      activeTaskCount: 0,
      openIssueCount: 0,
      todayActivityCount: this.activities.length,
      managerCount: 0,
      activeOutletsCount: 0,
      onboardedVendorCount: 0,
      managerGrowth: '0%',
      vendorGrowth: '0%',
      outletsGrowth: '0%',
      onboardedGrowth: '0%',
      stateScope: 'Tamil Nadu',
      highPriorityAlerts: [],
    };
  }

  async getRecentActivities(_managerId: string, limit: number = 10): Promise<Activity[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.activities.slice(0, limit);
  }
}
