/**
 * Field Agent Directory Repository Interface
 */
import { FieldAgent } from '../../types';

export type AgentStatusFilter = 'ALL' | 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';

export interface IAgentRepository {
  getAgentsInScope(
    requestingManagerId: string,
    query?: string,
    statusFilter?: AgentStatusFilter
  ): Promise<FieldAgent[]>;
  getAgentById(id: string): Promise<FieldAgent | null>;
}
