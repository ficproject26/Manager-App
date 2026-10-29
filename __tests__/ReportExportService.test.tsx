/**
 * ReportExportService Unit & Integration Test Suite
 */
import { reportExportService } from '../src/services/reports/ReportExportService';
import { VisitRecord, ManagerRole } from '../src/types';

const MOCK_VISIT_RECORDS: VisitRecord[] = [
  {
    id: 'visit_001',
    shopName: 'Sri Lakshmi Departmental Store',
    vendorCode: 'vendorLAKSHMI',
    category: 'Products',
    managerName: 'Ramesh Kumar',
    managerRole: 'State Manager',
    location: 'Salem',
    pincode: '636102',
    timestamp: '28 Sep 2026, 09:30 AM',
    isInterested: true,
    gpsCoords: '11.6643° N, 78.1460° E',
  },
  {
    id: 'visit_002',
    shopName: 'Annapoorna Hotel & Restaurant',
    vendorCode: 'vendorANNAPOORNA',
    category: 'Food',
    managerName: 'Dinesh K',
    managerRole: 'Division Manager',
    location: 'Coimbatore',
    pincode: '641001',
    timestamp: '24 Sep 2026, 02:45 PM',
    isInterested: false,
    reasonNotInterested: 'Existing competitor contract',
    voiceNoteDuration: 15,
    gpsCoords: '11.0168° N, 76.9558° E',
  },
];

describe('ReportExportService Integration Test Suite', () => {
  it('1. filterRecordsByScopeAndDate filters records by period TODAY, THIS_MONTH, and CUSTOM', () => {
    const todayFiltered = reportExportService.filterRecordsByScopeAndDate(MOCK_VISIT_RECORDS, {
      period: 'TODAY',
      format: 'CSV',
    });
    expect(todayFiltered.length).toBeGreaterThanOrEqual(1);

    const monthFiltered = reportExportService.filterRecordsByScopeAndDate(MOCK_VISIT_RECORDS, {
      period: 'THIS_MONTH',
      format: 'PDF',
    });
    expect(monthFiltered.length).toBe(2);

    const customFiltered = reportExportService.filterRecordsByScopeAndDate(MOCK_VISIT_RECORDS, {
      period: 'CUSTOM',
      format: 'EXCEL',
      startDateStr: '2026-09-01',
      endDateStr: '2026-09-30',
    });
    expect(customFiltered.length).toBe(2);
  });

  it('2. Territory security filtering respects Manager scope', () => {
    const manager = {
      id: 'mgr-001',
      name: 'Dinesh K',
      email: 'dinesh@forge.in',
      phone: '9876543210',
      role: ManagerRole.DIVISION_MANAGER,
      stateId: 'st-tn-01',
      divisionId: 'div-salem-01',
      createdAt: '',
      updatedAt: '',
    };

    const divisionScoped = reportExportService.filterRecordsByScopeAndDate(MOCK_VISIT_RECORDS, {
      period: 'THIS_MONTH',
      format: 'CSV',
      manager,
    });
    expect(divisionScoped.length).toBe(1);
    expect(divisionScoped[0].managerRole).toContain('Division');
  });

  it('3. generateReportFile generates real CSV file and metadata', async () => {
    const result = await reportExportService.generateReportFile(MOCK_VISIT_RECORDS, {
      period: 'THIS_MONTH',
      format: 'CSV',
    });

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.fileName).toMatch(/\.csv$/);
    expect(result.mimeType).toContain('text/csv');
  });

  it('4. generateReportFile generates real Excel file (.xlsx)', async () => {
    const result = await reportExportService.generateReportFile(MOCK_VISIT_RECORDS, {
      period: 'THIS_MONTH',
      format: 'EXCEL',
    });

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.fileName).toMatch(/\.xlsx$/);
  });

  it('5. generateReportFile generates real PDF file (.pdf)', async () => {
    const result = await reportExportService.generateReportFile(MOCK_VISIT_RECORDS, {
      period: 'THIS_MONTH',
      format: 'PDF',
    });

    expect(result.success).toBe(true);
    expect(result.recordCount).toBe(2);
    expect(result.fileName).toMatch(/\.pdf$/);
  });

  it('6. Throws error when no records match selected filter period', async () => {
    await expect(
      reportExportService.generateReportFile([], {
        period: 'TODAY',
        format: 'CSV',
      })
    ).rejects.toThrow('No records found for the selected period');
  });
});
