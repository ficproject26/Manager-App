import { IManagerRepository, ManagerStatusFilter, TerritoryHierarchyItem } from '../IManagerRepository';
import { Manager, ManagerRole } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpManagerRepository implements IManagerRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  async getManagersInScope(
    requestingManagerId: string,
    query?: string,
    statusFilter: ManagerStatusFilter = 'ALL',
  ): Promise<Manager[]> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = { requestingManagerId };
    if (query) params.search = query;
    if (statusFilter !== 'ALL') params.status = statusFilter;

    const response = await apiClient.get<Manager[]>('/managers', { token, params });
    const list = Array.isArray(response.data) ? response.data : (Array.isArray((response as any).managers) ? (response as any).managers : []);
    return list;
  }

  async getManagerById(id: string): Promise<Manager | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<Manager>(`/managers/${id}`, { token });
      return response.data || null;
    } catch {
      return null;
    }
  }

  async getDistrictsInState(stateId: string, requestingManagerId?: string): Promise<TerritoryHierarchyItem[]> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<TerritoryHierarchyItem[]>(`/territories/districts?stateId=${stateId}`, { token });
      if (response.data && response.data.length > 0) return response.data;
    } catch {
      // Fallback: derive from managers in scope
    }
    const all = await this.getManagersInScope(requestingManagerId || '');
    const managersInState = all.filter(m => m.stateId === stateId);
    const districtIds = Array.from(new Set(managersInState.map(m => m.districtId).filter(Boolean))) as string[];

    return districtIds.map(dId => {
      const dManagers = managersInState.filter(m => m.districtId === dId);
      const dmAssigned = dManagers.find(m => m.role === ManagerRole.DISTRICT_MANAGER);
      const divisions = Array.from(new Set(dManagers.map(m => m.divisionId).filter(Boolean)));
      return {
        id: dId,
        name: dmAssigned?.territoryName || `District ${dId}`,
        type: 'DISTRICT',
        stateId,
        districtId: dId,
        assignedManagerName: dmAssigned?.name,
        assignedManagerId: dmAssigned?.id,
        subItemCount: divisions.length,
        managerCount: dManagers.length,
        status: 'ACTIVE',
      };
    });
  }

  async getDivisionsInDistrict(districtId: string, requestingManagerId?: string): Promise<TerritoryHierarchyItem[]> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<TerritoryHierarchyItem[]>(`/territories/divisions?districtId=${districtId}`, { token });
      if (response.data && response.data.length > 0) return response.data;
    } catch {
      // Fallback: derive from managers in scope
    }
    const all = await this.getManagersInScope(requestingManagerId || '');
    const dManagers = all.filter(m => m.districtId === districtId);
    const divisionIds = Array.from(new Set(dManagers.map(m => m.divisionId).filter(Boolean))) as string[];

    return divisionIds.map(divId => {
      const divManagers = dManagers.filter(m => m.divisionId === divId);
      const divAssigned = divManagers.find(m => m.role === ManagerRole.DIVISION_MANAGER);
      const pincodes = Array.from(new Set(divManagers.map(m => m.pincodeId).filter(Boolean)));
      return {
        id: divId,
        name: divAssigned?.territoryName || `Division ${divId}`,
        type: 'DIVISION',
        stateId: divManagers[0]?.stateId || '',
        districtId,
        divisionId: divId,
        divisionName: divManagers[0]?.divisionName,
        assignedManagerName: divAssigned?.name,
        assignedManagerId: divAssigned?.id,
        subItemCount: pincodes.length,
        managerCount: divManagers.length,
        status: 'ACTIVE',
      };
    });
  }

  async getPincodesInDivision(divisionId: string, requestingManagerId?: string): Promise<TerritoryHierarchyItem[]> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<TerritoryHierarchyItem[]>(`/territories/pincodes?divisionId=${divisionId}`, { token });
      if (response.data && response.data.length > 0) return response.data;
    } catch {
      // Fallback: derive from managers in scope
    }
    const all = await this.getManagersInScope(requestingManagerId || '');
    const divManagers = all.filter(m => m.divisionId === divisionId);
    const pincodeIds = Array.from(new Set(divManagers.map(m => m.pincodeId).filter(Boolean))) as string[];

    return pincodeIds.map(pId => {
      const pinManagers = divManagers.filter(m => m.pincodeId === pId);
      const pinAssigned = pinManagers.find(m => m.role === ManagerRole.PINCODE_MANAGER);
      return {
        id: pId,
        name: pinAssigned?.territoryName || `Pincode ${pId}`,
        type: 'PINCODE',
        stateId: pinManagers[0]?.stateId || '',
        districtId: pinManagers[0]?.districtId,
        divisionId,
        pincodeId: pId,
        assignedManagerName: pinAssigned?.name,
        assignedManagerId: pinAssigned?.id,
        subItemCount: pinManagers.length,
        managerCount: pinManagers.length,
        status: pinManagers.some(m => m.status === 'ACTIVE') ? 'ACTIVE' : 'INACTIVE',
      };
    });
  }

  async getManagersInPincode(pincodeId: string, statusFilter: ManagerStatusFilter = 'ALL'): Promise<Manager[]> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<Manager[]>(`/territories/pincodes/${pincodeId}/managers?status=${statusFilter}`, { token });
      if (response.data) return response.data;
    } catch {
      // Fallback
    }
    const all = await this.getManagersInScope('');
    let pinManagers = all.filter(m => m.pincodeId === pincodeId);
    if (statusFilter !== 'ALL') {
      pinManagers = pinManagers.filter(m => m.status === statusFilter);
    }
    return pinManagers;
  }

  async getManagerByPhone(phone: string): Promise<Manager | null> {
    const cleanInput = phone.replace(/[^0-9]/g, '');
    const last10 = cleanInput.slice(-10);
    if (!last10) return null;

    const all = await this.getManagersInScope('');
    const found = all.find(m => {
      const cleanMPhone = (m.phone || '').replace(/[^0-9]/g, '');
      return cleanMPhone === cleanInput || cleanMPhone.slice(-10) === last10;
    });
    return found || null;
  }
}

