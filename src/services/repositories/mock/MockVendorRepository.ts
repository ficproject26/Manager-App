/**
 * Mock Implementation of IVendorRepository for Initial Development
 */
import { IVendorRepository, VendorFilterOptions } from '../IVendorRepository';
import { Vendor, VendorStatus } from '../../../types';

const INITIAL_MOCK_VENDORS: Vendor[] = [];

export class MockVendorRepository implements IVendorRepository {
  private vendors: Vendor[] = [...INITIAL_MOCK_VENDORS];

  async getVendors(filters?: VendorFilterOptions): Promise<Vendor[]> {
    let result = [...this.vendors];

    if (filters?.searchQuery) {
      const q = filters.searchQuery.trim().toLowerCase();
      result = result.filter(
        v =>
          (v.businessName && v.businessName.toLowerCase().includes(q)) ||
          (v.vendorName && v.vendorName.toLowerCase().includes(q)) ||
          (v.phone && v.phone.includes(q)) ||
          (v.category && String(v.category).toLowerCase().includes(q)) ||
          (v.subcategory && v.subcategory.toLowerCase().includes(q)) ||
          (v.locationDistrict && v.locationDistrict.toLowerCase().includes(q)) ||
          (v.address && v.address.toLowerCase().includes(q))
      );
    }

    if (filters?.status) {
      result = result.filter(v => v.status === filters.status);
    }

    if (filters?.activeState && filters.activeState !== 'ALL') {
      if (filters.activeState === 'ACTIVE') {
        result = result.filter(
          v => v.status === VendorStatus.ONBOARDED || v.status === VendorStatus.VISITED
        );
      } else if (filters.activeState === 'INACTIVE') {
        result = result.filter(
          v => v.status === VendorStatus.LEAD || v.status === VendorStatus.NOT_INTERESTED
        );
      }
    }

    if (filters?.category) {
      result = result.filter(v => v.category === filters.category);
    }

    if (filters?.districtId) {
      result = result.filter(v => v.districtId === filters.districtId);
    }

    if (filters?.divisionId) {
      result = result.filter(v => v.divisionId === filters.divisionId);
    }

    if (filters?.pincodeId) {
      result = result.filter(v => v.pincodeId === filters.pincodeId);
    }

    return result;
  }

  async getVendorById(id: string): Promise<Vendor | null> {
    const found = this.vendors.find(v => v.id === id);
    return found || null;
  }

  async createVendor(vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const newVendor: Vendor = {
      ...vendorData,
      id: `v-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.vendors.push(newVendor);
    return newVendor;
  }

  async recordVendorVisit(
    vendorId: string,
    interested: boolean,
    _notes?: string
  ): Promise<{ activityId: string; reportRequired: boolean }> {
    const vendorIndex = this.vendors.findIndex(v => v.id === vendorId);
    if (vendorIndex !== -1) {
      this.vendors[vendorIndex].status = interested
        ? VendorStatus.VISITED
        : VendorStatus.NOT_INTERESTED;
    }
    return {
      activityId: `act-${Date.now()}`,
      reportRequired: !interested,
    };
  }
}
