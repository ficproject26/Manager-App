/**
 * Mock Implementation of Field Agents Repository
 * Scoped to authorized manager's territory
 */
import { AgentStatusFilter, IAgentRepository } from '../IAgentRepository';
import { FieldAgent } from '../../../types';

const INITIAL_MOCK_AGENTS: FieldAgent[] = [];

export class MockAgentRepository implements IAgentRepository {
  private agents: FieldAgent[] = [...INITIAL_MOCK_AGENTS];

  async getAgentsInScope(
    requestingManagerId: string,
    query?: string,
    statusFilter?: AgentStatusFilter
  ): Promise<FieldAgent[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        let results = [...this.agents];

        // Territory Scope Filter
        if (requestingManagerId === 'mgr-001') {
          results = results.filter(a => a.stateId === 'st-mp-01');
        } else if (requestingManagerId === 'mgr-000') {
          results = results.filter(a => a.stateId === 'st-tn-01');
        }

        // Status filter
        if (statusFilter && statusFilter !== 'ALL') {
          results = results.filter(a => a.status === statusFilter);
        }

        // Search query filter (name, phone, pincode)
        if (query && query.trim()) {
          const q = query.trim().toLowerCase();
          results = results.filter(
            a =>
              a.name.toLowerCase().includes(q) ||
              a.phone.toLowerCase().includes(q) ||
              a.assignedPincode.toLowerCase().includes(q)
          );
        }

        resolve(results);
      }, 50);
    });
  }

  async getAgentById(id: string): Promise<FieldAgent | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const found = this.agents.find(a => a.id === id) || null;
        resolve(found);
      }, 30);
    });
  }
}
