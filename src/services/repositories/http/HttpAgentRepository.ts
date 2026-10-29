/**
 * HTTP Implementation of IAgentRepository
 */
import { IAgentRepository, AgentStatusFilter } from '../IAgentRepository';
import { FieldAgent } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpAgentRepository implements IAgentRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  async getAgentsInScope(
    requestingManagerId: string,
    query?: string,
    statusFilter: AgentStatusFilter = 'ALL'
  ): Promise<FieldAgent[]> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = { requestingManagerId };
    if (query) params.search = query;
    if (statusFilter !== 'ALL') params.status = statusFilter;

    const response = await apiClient.get<FieldAgent[]>('/operations/agents', { token, params });
    const list = Array.isArray(response.data) ? response.data : (Array.isArray((response as any).agents) ? (response as any).agents : []);
    return list;
  }

  async getAgentById(id: string): Promise<FieldAgent | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<FieldAgent>(`/operations/agents/${id}`, { token });
      return response.data || null;
    } catch {
      return null;
    }
  }
}
