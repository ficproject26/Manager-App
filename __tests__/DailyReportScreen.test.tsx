/**
 * Daily Report Feature & Repository Test Suite
 */
import { services } from '../src/services';

const getFormattedCurrentDate = (d = new Date()): { displayDate: string; isoDate: string } => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const day = d.getDate();
  const monthName = months[d.getMonth()];
  const year = d.getFullYear();
  const displayDate = `${day} ${monthName} ${year}`;
  
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const isoDate = `${year}-${m}-${dd}`;

  return { displayDate, isoDate };
};

describe('Daily Report Feature & Repository', () => {
  const managerId = 'mgr-test-001';
  const { isoDate, displayDate } = getFormattedCurrentDate();

  it('1. Formats date dynamically from device date', () => {
    expect(displayDate).toBeDefined();
    expect(displayDate).toContain('2026');
    expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('2. getTodayReport returns null when no report has been submitted', async () => {
    const initialReport = await services.dailyReportRepository.getTodayReport(managerId, isoDate);
    expect(initialReport).toBeNull();
  });

  it('3. Submits daily report successfully', async () => {
    const payload = {
      managerId,
      date: isoDate,
      workSummary: 'Onboarded 2 new vendors in Indore North division and conducted field verification.',
      vendorsVisited: [
        { vendorId: 'v-101', vendorName: 'Fresh Mart Supermarket', location: 'Indore' },
      ],
      issuesFollowUp: 'Followed up on POS terminal delivery issue.',
      additionalNotes: 'State manager review scheduled for Friday.',
    };

    const submitted = await services.dailyReportRepository.submitDailyReport(payload);
    expect(submitted.id).toBeDefined();
    expect(submitted.status).toBe('SUBMITTED');
    expect(submitted.workSummary).toBe(payload.workSummary);
    expect(submitted.vendorsVisited.length).toBe(1);
  });

  it('4. getTodayReport returns submitted report on subsequent fetch', async () => {
    const report = await services.dailyReportRepository.getTodayReport(managerId, isoDate);
    expect(report).not.toBeNull();
    expect(report?.managerId).toBe(managerId);
    expect(report?.date).toBe(isoDate);
  });

  it('5. Prevents duplicate report submission for the same date', async () => {
    const payload = {
      managerId,
      date: isoDate,
      workSummary: 'Duplicate submission attempt',
      vendorsVisited: [],
    };

    await expect(services.dailyReportRepository.submitDailyReport(payload)).rejects.toThrow(
      "Today's report has already been submitted."
    );
  });
});
