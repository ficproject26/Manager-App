/**
 * Mock Implementation of ILeaderboardRepository
 */
import { LeaderboardEntry } from '../../../types';
import {
  ILeaderboardRepository,
  LeaderboardPeriod,
  LeaderboardResponse,
} from '../ILeaderboardRepository';

const ALL_USERS_MONTHLY: LeaderboardEntry[] = [];
const ALL_USERS_WEEKLY: LeaderboardEntry[] = [];
const ALL_USERS_TODAY: LeaderboardEntry[] = [];

export class MockLeaderboardRepository implements ILeaderboardRepository {
  private monthlyData = ALL_USERS_MONTHLY;
  private weeklyData = ALL_USERS_WEEKLY;
  private todayData = ALL_USERS_TODAY;

  async getLeaderboard(
    managerId: string,
    period: LeaderboardPeriod = 'THIS_MONTH',
  ): Promise<LeaderboardResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 150));

    let entries: LeaderboardEntry[];
    switch (period) {
      case 'TODAY':
        entries = [...this.todayData];
        break;
      case 'THIS_WEEK':
        entries = [...this.weeklyData];
        break;
      case 'THIS_MONTH':
      default:
        entries = [...this.monthlyData];
        break;
    }

    const currentUserEntry = entries.find(e => e.managerId === managerId) || null;

    return {
      territoryScopeName: 'Tamil Nadu State Scope',
      period,
      currentUserEntry,
      entries,
    };
  }
}
