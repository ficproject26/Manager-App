/**
 * Mock Implementation of IIssueRepository
 */
import { IIssueRepository } from '../IIssueRepository';
import { Issue, IssueStatus, Priority } from '../../../types';

const INITIAL_MOCK_ISSUES: Issue[] = [];

export class MockIssueRepository implements IIssueRepository {
  private issues: Issue[] = [...INITIAL_MOCK_ISSUES];

  async getIssues(
    assignedManagerId?: string,
    status?: IssueStatus,
    priority?: Priority,
    searchQuery?: string
  ): Promise<Issue[]> {
    let result = [...this.issues];

    if (assignedManagerId && assignedManagerId !== 'mgr-000') {
      result = result.filter(
        i =>
          i.assignedManagerId === assignedManagerId ||
          i.assignedManagerId === 'mgr-000'
      );
    }
    if (status) {
      result = result.filter(i => i.status === status);
    }
    if (priority) {
      result = result.filter(i => i.priority === priority);
    }
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          (i.vendorName && i.vendorName.toLowerCase().includes(q)) ||
          (i.location && i.location.toLowerCase().includes(q)) ||
          i.description.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async getIssueById(id: string): Promise<Issue | null> {
    const found = this.issues.find(i => i.id === id);
    return found ? { ...found } : null;
  }

  async updateIssueStatus(issueId: string, status: IssueStatus, resolutionText?: string): Promise<Issue> {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue) {
      throw new Error('Issue not found');
    }
    issue.status = status;
    issue.updatedAt = new Date().toISOString();
    if (status === IssueStatus.RESOLVED) {
      issue.resolutionText = resolutionText || 'Issue marked as resolved by manager.';
      issue.resolvedAt = new Date().toISOString();
    }
    return { ...issue };
  }

  async resolveIssue(issueId: string, resolutionText: string): Promise<Issue> {
    return this.updateIssueStatus(issueId, IssueStatus.RESOLVED, resolutionText);
  }
}
