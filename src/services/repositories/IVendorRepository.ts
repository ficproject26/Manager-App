/**
 * Abstract Vendor Repository Contract
 */
import { Vendor, VendorStatus } from '../../types';

export interface VendorFilterOptions {
  searchQuery?: string;
  status?: VendorStatus;
  activeState?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  category?: string;
  districtId?: string;
  divisionId?: string;
  pincodeId?: string;
}

export interface IVendorRepository {
  getVendors(filters?: VendorFilterOptions): Promise<Vendor[]>;
  getVendorById(id: string): Promise<Vendor | null>;
  createVendor(vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor>;
  recordVendorVisit(vendorId: string, interested: boolean, notes?: string): Promise<{ activityId: string; reportRequired: boolean }>;
}
