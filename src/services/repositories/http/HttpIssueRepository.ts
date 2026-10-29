/**
 * HTTP Implementation of IIssueRepository
 */
import { IIssueRepository } from '../IIssueRepository';
import { Issue, IssueStatus, Priority } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpIssueRepository implements IIssueRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  async getIssues(assignedManagerId?: string, status?: IssueStatus, priority?: Priority, searchQuery?: string): Promise<Issue[]> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = {};
    if (assignedManagerId) params.assignedManagerId = assignedManagerId;
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (searchQuery) params.search = searchQuery;

    const response = await apiClient.get<Issue[]>('/issues', { token, params });
    return response.data || [];
  }

  async getIssueById(id: string): Promise<Issue | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<Issue>(`/issues/${id}`, { token });
      return response.data || null;
    } catch {
      return null;
    }
  }

  async updateIssueStatus(issueId: string, status: IssueStatus, resolutionText?: string): Promise<Issue> {
    const token = await this.getToken();
    const response = await apiClient.patch<Issue>(`/issues/${issueId}/status`, { status, resolutionText, notes: resolutionText }, { token });
    return response.data;
  }

  async resolveIssue(issueId: string, resolutionText: string): Promise<Issue> {
    const token = await this.getToken();
    const response = await apiClient.patch<Issue>(`/issues/${issueId}/status`, { status: IssueStatus.RESOLVED, resolutionText, notes: resolutionText }, { token });
    return response.data;
  }
}
