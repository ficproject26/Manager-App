import { DivisionName, Manager } from '../../types';

export type ManagerStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export interface TerritoryHierarchyItem {
  id: string;
  name: string;
  type: 'DISTRICT' | 'DIVISION' | 'PINCODE';
  stateId: string;
  districtId?: string;
  divisionId?: string;
  pincodeId?: string;
  divisionName?: DivisionName;
  assignedManagerName?: string;
  assignedManagerId?: string;
  subItemCount?: number;
  managerCount?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface IManagerRepository {
  getManagersInScope(
    requestingManagerId: string,
    query?: string,
    statusFilter?: ManagerStatusFilter,
  ): Promise<Manager[]>;
  getManagerById(id: string): Promise<Manager | null>;
  getDistrictsInState(stateId: string, requestingManagerId?: string): Promise<TerritoryHierarchyItem[]>;
  getDivisionsInDistrict(districtId: string, requestingManagerId?: string): Promise<TerritoryHierarchyItem[]>;
  getPincodesInDivision(divisionId: string, requestingManagerId?: string): Promise<TerritoryHierarchyItem[]>;
  getManagersInPincode(pincodeId: string, statusFilter?: ManagerStatusFilter): Promise<Manager[]>;
  getManagerByPhone(phone: string): Promise<Manager | null>;
}

