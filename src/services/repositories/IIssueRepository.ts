/**
 * Abstract Issue Repository Contract
 */
import { Issue, IssueStatus, Priority } from '../../types';

export interface IssueFilterOptions {
  status?: IssueStatus;
  priority?: Priority;
  searchQuery?: string;
}

export interface IIssueRepository {
  getIssues(assignedManagerId?: string, status?: IssueStatus, priority?: Priority, searchQuery?: string): Promise<Issue[]>;
  getIssueById(id: string): Promise<Issue | null>;
  updateIssueStatus(issueId: string, status: IssueStatus, resolutionText?: string): Promise<Issue>;
  resolveIssue(issueId: string, resolutionText: string): Promise<Issue>;
}
