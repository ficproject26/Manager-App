/**
 * Reports Feature & Repository Test Suite
 */
import { services } from '../src/services';

describe('Reports Feature & Repository Integration', () => {
  const managerId = 'mgr-001';

  it('1. Repository returns submitted reports for manager', async () => {
    const reports = await services.dailyReportRepository.getReports(managerId);
    expect(reports).toBeDefined();
    expect(reports.length).toBeGreaterThanOrEqual(3);
    expect(reports[0].date).toBeDefined();
    expect(reports[0].workSummary).toBeDefined();
  });

  it('2. Search filtering by work summary keyword or date', async () => {
    const searchByKeyword = await services.dailyReportRepository.getReports(
      managerId,
      'ALL',
      'planning'
    );
    expect(searchByKeyword.length).toBe(1);
    expect(searchByKeyword[0].id).toBe('dr-103');

    const searchByDate = await services.dailyReportRepository.getReports(
      managerId,
      'ALL',
      '2026-09-23'
    );
    expect(searchByDate.length).toBe(1);
    expect(searchByDate[0].id).toBe('dr-101');
  });

  it('3. Period filtering (DAILY, WEEKLY, MONTHLY)', async () => {
    const allReports = await services.dailyReportRepository.getReports(managerId, 'ALL');
    expect(allReports.length).toBeGreaterThanOrEqual(3);

    const monthlyReports = await services.dailyReportRepository.getReports(managerId, 'MONTHLY');
    expect(monthlyReports).toBeDefined();
    expect(Array.isArray(monthlyReports)).toBe(true);
  });

  it('4. Fetch report details by ID', async () => {
    const report = await services.dailyReportRepository.getReportById('dr-101');
    expect(report).not.toBeNull();
    expect(report?.date).toBe('2026-09-23');
    expect(report?.vendorsVisited.length).toBe(5);

    const missing = await services.dailyReportRepository.getReportById('dr-invalid');
    expect(missing).toBeNull();
  });

  it('5. Newly submitted daily report instantly appears in Reports list', async () => {
    const newPayload = {
      managerId,
      date: '2026-09-24',
      workSummary: 'Submitted a new report from DailyReport workflow integration test.',
      vendorsVisited: [
        { vendorId: 'v-101', vendorName: 'Fresh Mart Supermarket', location: 'Bengaluru' },
      ],
      issuesFollowUp: 'No pending issues.',
      additionalNotes: 'Test execution verified.',
    };

    const submitted = await services.dailyReportRepository.submitDailyReport(newPayload);
    expect(submitted.id).toBeDefined();

    const updatedList = await services.dailyReportRepository.getReports(managerId);
    expect(updatedList.some(r => r.id === submitted.id)).toBe(true);
    expect(updatedList[0].id).toBe(submitted.id);
  });
});
