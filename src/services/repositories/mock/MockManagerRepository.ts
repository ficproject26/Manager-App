/**
 * Mock Implementation of Read-Only IManagerRepository
 */
import { IManagerRepository, ManagerStatusFilter, TerritoryHierarchyItem } from '../IManagerRepository';
import { Manager } from '../../../types';

const INITIAL_MOCK_MANAGERS: Manager[] = [];

export class MockManagerRepository implements IManagerRepository {
  private managers: Manager[] = [...INITIAL_MOCK_MANAGERS];

  async getManagersInScope(
    _requestingManagerId: string,
    query?: string,
    statusFilter: ManagerStatusFilter = 'ALL',
  ): Promise<Manager[]> {
    await new Promise(resolve => setTimeout(resolve, 150));

    let result = [...this.managers];

    if (statusFilter !== 'ALL') {
      result = result.filter(m => m.status === statusFilter);
    }

    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        m =>
          m.name.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.employeeId && m.employeeId.toLowerCase().includes(q)) ||
          (m.territoryName && m.territoryName.toLowerCase().includes(q))
      );
    }

    return result;
  }

  async getManagerById(id: string): Promise<Manager | null> {
    await new Promise(resolve => setTimeout(resolve, 80));
    return this.managers.find(m => m.id === id) || null;
  }

  async getManagerByPhone(phone: string): Promise<Manager | null> {
    await new Promise(resolve => setTimeout(resolve, 80));
    return this.managers.find(m => m.phone === phone) || null;
  }

  async getDistrictsInState(
    _stateId: string,
    _requestingManagerId?: string,
  ): Promise<TerritoryHierarchyItem[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      { id: 'dt-chn-01', name: 'Chennai District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-cbe-01', name: 'Coimbatore District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-mdu-01', name: 'Madurai District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-try-01', name: 'Tiruchirappalli District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-slm-01', name: 'Salem District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-tnv-01', name: 'Tirunelveli District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-vel-01', name: 'Vellore District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-erd-01', name: 'Erode District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-dha-01', name: 'Dharmapuri District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
      { id: 'dt-kri-01', name: 'Krishnagiri District', type: 'DISTRICT', stateId: 'st-tn-01', managerCount: 0 },
    ];
  }

  async getDivisionsInDistrict(
    districtId: string,
    _requestingManagerId?: string,
  ): Promise<TerritoryHierarchyItem[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (districtId === 'dt-chn-01') {
      return [
        { id: 'div-chn-central', name: 'Chennai Central Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-chn-01', managerCount: 0 },
        { id: 'div-chn-anna', name: 'Anna Nagar Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-chn-01', managerCount: 0 },
        { id: 'div-chn-north', name: 'North Chennai Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-chn-01', managerCount: 0 },
        { id: 'div-chn-south', name: 'South Chennai Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-chn-01', managerCount: 0 },
      ];
    }
    if (districtId === 'dt-cbe-01') {
      return [
        { id: 'div-cbe-gandhi', name: 'Gandhipuram Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-cbe-01', managerCount: 0 },
        { id: 'div-cbe-rspuram', name: 'R.S. Puram Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-cbe-01', managerCount: 0 },
      ];
    }
    if (districtId === 'dt-dha-01') {
      return [
        { id: 'div-dha-harur', name: 'Harur Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-dha-01', managerCount: 0 },
        { id: 'div-dha-palacode', name: 'Palacode Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: 'dt-dha-01', managerCount: 0 },
      ];
    }
    return [
      { id: 'div-mdu-central', name: 'Madurai Central Division', type: 'DIVISION', stateId: 'st-tn-01', districtId: districtId, managerCount: 0 },
    ];
  }

  async getPincodesInDivision(
    divisionId: string,
    _requestingManagerId?: string,
  ): Promise<TerritoryHierarchyItem[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (divisionId === 'div-chn-central' || divisionId === 'div-chn-north') {
      return [
        { id: 'pin-600001', name: '600001 - Parrys', type: 'PINCODE', stateId: 'st-tn-01', divisionId, pincodeId: '600001', managerCount: 0 },
        { id: 'pin-600002', name: '600002 - Anna Salai', type: 'PINCODE', stateId: 'st-tn-01', divisionId, pincodeId: '600002', managerCount: 0 },
        { id: 'pin-600010', name: '600010 - Kilpauk', type: 'PINCODE', stateId: 'st-tn-01', divisionId, pincodeId: '600010', managerCount: 0 },
      ];
    }
    if (divisionId === 'div-cbe-gandhi') {
      return [
        { id: 'pin-641012', name: '641012 - Gandhipuram', type: 'PINCODE', stateId: 'st-tn-01', divisionId: 'div-cbe-gandhi', pincodeId: '641012', managerCount: 0 },
      ];
    }
    return [
      { id: 'pin-default', name: 'General Pincode', type: 'PINCODE', stateId: 'st-tn-01', divisionId: divisionId, managerCount: 0 },
    ];
  }

  async getManagersInPincode(
    pincodeId: string,
    statusFilter: ManagerStatusFilter = 'ALL',
  ): Promise<Manager[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    let list = this.managers.filter(m => m.pincodeId === pincodeId);
    if (statusFilter !== 'ALL') {
      list = list.filter(m => m.status === statusFilter);
    }
    return list;
  }
}
