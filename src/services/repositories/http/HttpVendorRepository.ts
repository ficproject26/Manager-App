/**
 * HTTP Implementation of IVendorRepository
 * Authoritative connection to Manager backend (No Mock Fallbacks)
 */
import { IVendorRepository, VendorFilterOptions } from '../IVendorRepository';
import { Vendor, VendorCategory, VendorStatus } from '../../../types';
import { apiClient } from '../../api/ApiClient';
import { services } from '../../index';

export class HttpVendorRepository implements IVendorRepository {
  private async getToken(): Promise<string | null> {
    return services.storageService.getAuthToken();
  }

  private normalizeVendor(raw: any): Vendor {
    if (!raw) throw new Error('Vendor record is missing');

    const id = String(raw.id || raw._id || '');
    const businessName = raw.businessName || raw.name || raw.shopName || raw.vendorName || 'Business Partner';
    const vendorName = raw.vendorName || raw.name || raw.contactName || businessName;
    const phone = raw.phone || raw.mobile || '';
    const address = raw.address || raw.street || raw.location || raw.residentialAddress || '';

    let status: VendorStatus = VendorStatus.LEAD;
    const rawStatus = String(raw.status || raw.operationalStatus || raw.approvalStatus || '').toUpperCase();
    if (rawStatus.includes('ONBOARD') || rawStatus === 'ACTIVE' || rawStatus === 'APPROVED') {
      status = VendorStatus.ONBOARDED;
    } else if (rawStatus.includes('NOT_INTERESTED') || rawStatus.includes('NOT INTERESTED')) {
      status = VendorStatus.NOT_INTERESTED;
    } else if (rawStatus.includes('VISIT')) {
      status = VendorStatus.VISITED;
    }

    let category = VendorCategory.PRODUCT;
    const catStr = String(raw.category || '').toUpperCase();
    if (catStr.includes('FOOD')) category = VendorCategory.FOOD;
    else if (catStr.includes('SERVICE')) category = VendorCategory.SERVICE;
    else if (catStr.includes('TRAVEL')) category = VendorCategory.TRAVEL;
    else if (catStr.includes('STAY')) category = VendorCategory.STAY;
    else if (catStr.includes('JOB')) category = VendorCategory.JOBS;
    else if (catStr.includes('DAILY')) category = VendorCategory.DAILY_NEEDS;

    return {
      ...raw,
      id,
      name: raw.name || businessName,
      businessName,
      vendorName,
      phone,
      category,
      businessType: raw.businessType || 'Retail',
      address,
      stateId: raw.stateId || '',
      districtId: raw.districtId || '',
      divisionId: raw.divisionId || '',
      pincodeId: raw.pincodeId || '',
      status,
      outletCount: raw.outletCount ?? raw.outlets?.length ?? 1,
      issueCount: raw.issueCount ?? 0,
      visitCount: raw.visitCount ?? 0,
      createdById: raw.createdBy || raw.createdById || '',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    };
  }

  async getVendors(filters?: VendorFilterOptions): Promise<Vendor[]> {
    const token = await this.getToken();
    const params: Record<string, string | number | boolean> = {};

    if (filters?.searchQuery) params.search = filters.searchQuery;
    if (filters?.status) params.status = filters.status;
    if (filters?.activeState && filters.activeState !== 'ALL') params.activeState = filters.activeState;
    if (filters?.category) params.category = filters.category;
    if (filters?.districtId) params.districtId = filters.districtId;
    if (filters?.divisionId) params.divisionId = filters.divisionId;
    if (filters?.pincodeId) params.pincodeId = filters.pincodeId;

    const response = await apiClient.get<any>('/vendors', { token, params, timeoutMs: 30000 });
    const list = Array.isArray(response.data)
      ? response.data
      : (Array.isArray((response as any).vendors) ? (response as any).vendors : []);
    return list.map((v: any) => this.normalizeVendor(v));
  }

  async getVendorById(id: string): Promise<Vendor | null> {
    const token = await this.getToken();
    try {
      const response = await apiClient.get<any>(`/vendors/${id}`, { token, timeoutMs: 30000 });
      const raw = response.data || response;
      return raw ? this.normalizeVendor(raw) : null;
    } catch {
      return null;
    }
  }

  async createVendor(vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vendor> {
    const token = await this.getToken();
    const response = await apiClient.post<any>('/vendors', vendorData, { token, timeoutMs: 30000 });
    const raw = response.data || response;
    return this.normalizeVendor(raw);
  }

  async recordVendorVisit(
    vendorId: string,
    interested: boolean,
    notes?: string
  ): Promise<{ activityId: string; reportRequired: boolean }> {
    const token = await this.getToken();
    const vendor = await this.getVendorById(vendorId);
    const response = await apiClient.post<any>(
      '/shop-visits',
      {
        vendorId,
        shopName: vendor?.businessName || vendor?.name || 'Shop',
        category: vendor?.category || 'General',
        interestedStatus: interested ? 'YES' : 'NO',
        notInterestedReason: interested ? undefined : (notes || 'Not interested'),
        notes,
      },
      { token, timeoutMs: 30000 }
    );
    const visitData = response.data || response;
    return {
      activityId: visitData?._id || visitData?.id || `visit-${Date.now()}`,
      reportRequired: !interested,
    };
  }
}
