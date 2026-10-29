/**
 * Dashboard Feature & Repository Test Suite
 */
import { services } from '../src/services';

describe('Manager Dashboard Feature & Repository', () => {
  it('1. Dashboard repository returns summary metrics for manager', async () => {
    const summary = await services.dashboardRepository.getDashboardSummary('mgr-001');
    expect(summary).toBeDefined();
    expect(summary.managerName).toBe('Rajesh Kumar');
    expect(summary.role).toBe('District Manager');
    expect(summary.territoryName).toContain('Indore District');
    expect(summary.vendorCount).toBeGreaterThan(0);
    expect(summary.activeTaskCount).toBeGreaterThan(0);
    expect(summary.openIssueCount).toBeGreaterThan(0);
  });

  it('2. Dashboard repository returns high priority operational alerts', async () => {
    const summary = await services.dashboardRepository.getDashboardSummary('mgr-001');
    expect(summary.highPriorityAlerts.length).toBeGreaterThan(0);
    expect(summary.highPriorityAlerts[0].priority).toBe('HIGH');
  });

  it('3. Dashboard repository returns recent field activities', async () => {
    const activities = await services.dashboardRepository.getRecentActivities('mgr-001', 5);
    expect(activities).toBeDefined();
    expect(activities.length).toBeGreaterThan(0);
    expect(activities[0].activityType).toBeDefined();
    expect(activities[0].entityName).toBeDefined();
  });

  it('4. Empty activity list handling', async () => {
    const activities = await services.dashboardRepository.getRecentActivities('mgr-unknown', 5);
    expect(Array.isArray(activities)).toBe(true);
  });
});
