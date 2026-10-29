/**
 * Leaderboard Feature & Repository Test Suite
 */
import { services } from '../src/services';

describe('Leaderboard Feature & Repository', () => {
  it('1. Leaderboard repository returns leaderboard data for authenticated manager', async () => {
    const res = await services.leaderboardRepository.getLeaderboard('mgr-001', 'THIS_MONTH');
    expect(res).toBeDefined();
    expect(res.period).toBe('THIS_MONTH');
    expect(res.territoryScopeName).toContain('Indore District');
    expect(res.entries.length).toBeGreaterThan(0);
  });

  it('2. Returns correct current user entry for authenticated manager', async () => {
    const res = await services.leaderboardRepository.getLeaderboard('mgr-001', 'THIS_MONTH');
    expect(res.currentUserEntry).toBeDefined();
    expect(res.currentUserEntry?.managerId).toBe('mgr-001');
    expect(res.currentUserEntry?.managerName).toBe('Rajesh Kumar');
    expect(res.currentUserEntry?.rank).toBeDefined();
  });

  it('3. Leaderboard supports filtering by period (TODAY, THIS_WEEK, THIS_MONTH)', async () => {
    const todayRes = await services.leaderboardRepository.getLeaderboard('mgr-001', 'TODAY');
    const weekRes = await services.leaderboardRepository.getLeaderboard('mgr-001', 'THIS_WEEK');
    const monthRes = await services.leaderboardRepository.getLeaderboard('mgr-001', 'THIS_MONTH');

    expect(todayRes.period).toBe('TODAY');
    expect(weekRes.period).toBe('THIS_WEEK');
    expect(monthRes.period).toBe('THIS_MONTH');

    expect(todayRes.entries.length).toBe(monthRes.entries.length);
  });

  it('4. Leaderboard data provides top three and full ranking items', async () => {
    const res = await services.leaderboardRepository.getLeaderboard('mgr-001', 'THIS_MONTH');
    const topThree = res.entries.slice(0, 3);

    expect(topThree.length).toBe(3);
    expect(topThree[0].rank).toBe(1);
    expect(topThree[1].rank).toBe(2);
    expect(topThree[2].rank).toBe(3);
  });

  it('5. Handles unknown manager gracefully', async () => {
    const res = await services.leaderboardRepository.getLeaderboard('mgr-unknown', 'THIS_MONTH');
    expect(res.currentUserEntry).toBeNull();
    expect(res.entries.length).toBeGreaterThan(0);
  });
});
