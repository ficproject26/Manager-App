/**
 * Abstract Leaderboard Repository Interface
 */
import { LeaderboardEntry } from '../../types';

export type LeaderboardPeriod = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';

export interface LeaderboardResponse {
  territoryScopeName: string;
  period: LeaderboardPeriod;
  currentUserEntry: LeaderboardEntry | null;
  entries: LeaderboardEntry[];
}

export interface ILeaderboardRepository {
  getLeaderboard(
    managerId: string,
    period?: LeaderboardPeriod,
  ): Promise<LeaderboardResponse>;
}
