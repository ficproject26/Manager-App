/**
 * HTTP Implementation of ILeaderboardRepository
 * Authoritative connection to Manager backend (No Mock Fallbacks)
 */
import { ILeaderboardRepository, LeaderboardPeriod, LeaderboardResponse } from '../ILeaderboardRepository';
import { LeaderboardEntry } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpLeaderboardRepository implements ILeaderboardRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  async getLeaderboard(managerId: string, period: LeaderboardPeriod = 'THIS_MONTH'): Promise<LeaderboardResponse> {
    const token = await this.getToken();
    const backendPeriod = period === 'TODAY' ? 'day' : (period === 'THIS_WEEK' ? 'week' : 'month');

    const response = await apiClient.get<any>('/reports/leaderboard', {
      token,
      params: { period: backendPeriod },
    });

    const rawList: any[] = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);

    const entries: LeaderboardEntry[] = rawList.map((item, index) => ({
      managerId: item.managerId || item.id || item._id || `mgr-${index}`,
      managerName: item.name || item.managerName || 'Manager',
      role: item.role || item.tier || 'MANAGER',
      rank: item.rank || (index + 1),
      score: item.score || item.points || item.vendorsOnboarded || item.tieUps || 0,
      vendorsOnboarded: item.vendorsOnboarded || item.tieUps || item.vendors || 0,
      tasksCompleted: item.tasksCompleted || item.completedTasks || 0,
      issuesResolved: item.issuesResolved || 0,
      territoryName: item.territory || item.state || item.district || item.division || 'Territory',
      stateName: item.state || item.stateName,
      districtName: item.district || item.districtName,
      divisionName: item.division || item.divisionName,
    }));

    const currentMgr = entries.find(e => e.managerId === managerId) || (entries.length > 0 ? entries[0] : null);

    return {
      territoryScopeName: currentMgr?.territoryName || 'Regional Scope',
      period,
      currentUserEntry: currentMgr,
      entries,
    };
  }
}
