/**
 * Issues Feature & Repository Test Suite
 */
import { services } from '../src/services';
import { IssueStatus, Priority } from '../src/types';

describe('Manager Issues Feature & Repository', () => {
  it('1. Repository returns all assigned issues', async () => {
    const issues = await services.issueRepository.getIssues('mgr-001');
    expect(issues).toBeDefined();
    expect(issues.length).toBeGreaterThanOrEqual(5);
    expect(issues[0].title).toBeDefined();
  });

  it('2. Search filtering by title, vendor name, location, or description', async () => {
    const searchByTitle = await services.issueRepository.getIssues('mgr-001', undefined, undefined, 'Payment Issue');
    expect(searchByTitle.length).toBe(1);
    expect(searchByTitle[0].title).toBe('Payment Issue');

    const searchByVendor = await services.issueRepository.getIssues('mgr-001', undefined, undefined, 'Fresh Mart');
    expect(searchByVendor.length).toBe(1);
    expect(searchByVendor[0].vendorName).toContain('Fresh Mart');

    const searchByLocation = await services.issueRepository.getIssues('mgr-001', undefined, undefined, 'Mysuru');
    expect(searchByLocation.length).toBe(1);
    expect(searchByLocation[0].location).toBe('Mysuru');
  });

  it('3. Status filtering (OPEN, IN_PROGRESS, RESOLVED)', async () => {
    const openIssues = await services.issueRepository.getIssues('mgr-001', IssueStatus.OPEN);
    expect(openIssues.length).toBe(2);
    expect(openIssues.every(i => i.status === IssueStatus.OPEN)).toBe(true);

    const inProgressIssues = await services.issueRepository.getIssues('mgr-001', IssueStatus.IN_PROGRESS);
    expect(inProgressIssues.length).toBe(2);
    expect(inProgressIssues.every(i => i.status === IssueStatus.IN_PROGRESS)).toBe(true);

    const resolvedIssues = await services.issueRepository.getIssues('mgr-001', IssueStatus.RESOLVED);
    expect(resolvedIssues.length).toBe(1);
    expect(resolvedIssues[0].status).toBe(IssueStatus.RESOLVED);
  });

  it('4. Combined search and status filtering', async () => {
    const combined = await services.issueRepository.getIssues(
      'mgr-001',
      IssueStatus.OPEN,
      undefined,
      'Delivery'
    );
    expect(combined.length).toBe(1);
    expect(combined[0].title).toBe('Delivery Issue');
  });

  it('5. Query returning empty results', async () => {
    const emptyResult = await services.issueRepository.getIssues(
      'mgr-001',
      undefined,
      undefined,
      'NonExistentQueryXYZ'
    );
    expect(Array.isArray(emptyResult)).toBe(true);
    expect(emptyResult.length).toBe(0);
  });

  it('6. Fetch issue by ID', async () => {
    const issue = await services.issueRepository.getIssueById('iss-401');
    expect(issue).not.toBeNull();
    expect(issue?.title).toBe('Payment Issue');

    const missing = await services.issueRepository.getIssueById('iss-invalid');
    expect(missing).toBeNull();
  });

  it('7. Status transition update to IN_PROGRESS and RESOLVED', async () => {
    const updatedInProgress = await services.issueRepository.updateIssueStatus('iss-401', IssueStatus.IN_PROGRESS);
    expect(updatedInProgress.status).toBe(IssueStatus.IN_PROGRESS);

    const updatedResolved = await services.issueRepository.updateIssueStatus(
      'iss-401',
      IssueStatus.RESOLVED,
      'Payment issue verified with finance desk.'
    );
    expect(updatedResolved.status).toBe(IssueStatus.RESOLVED);
    expect(updatedResolved.resolutionText).toBe('Payment issue verified with finance desk.');
    expect(updatedResolved.resolvedAt).toBeDefined();
  });
});
