/**
 * Vendors Feature & Repository Test Suite
 */
import { services } from '../src/services';
import { VendorCategory, VendorStatus } from '../src/types';

describe('Manager Vendors Feature & Repository', () => {
  it('1. Repository returns all vendors for authorized territory', async () => {
    const vendors = await services.vendorRepository.getVendors();
    expect(vendors).toBeDefined();
    expect(vendors.length).toBeGreaterThanOrEqual(6);
    expect(vendors[0].businessName).toBeDefined();
    expect(vendors[0].vendorName).toBeDefined();
  });

  it('2. Search filtering by business name, vendor name, or phone number', async () => {
    const searchByName = await services.vendorRepository.getVendors({ searchQuery: 'Fresh' });
    expect(searchByName.length).toBe(1);
    expect(searchByName[0].businessName).toContain('Fresh Mart');

    const searchByPhone = await services.vendorRepository.getVendors({ searchQuery: '9876543210' });
    expect(searchByPhone.length).toBe(1);
    expect(searchByPhone[0].vendorName).toBe('Suresh Patel');

    const searchByVendorName = await services.vendorRepository.getVendors({ searchQuery: 'Ramesh' });
    expect(searchByVendorName.length).toBe(1);
    expect(searchByVendorName[0].businessName).toContain('Bharat Traders');
  });

  it('3. Status filtering (ONBOARDED, VISITED, LEAD, NOT_INTERESTED)', async () => {
    const onboardedVendors = await services.vendorRepository.getVendors({
      status: VendorStatus.ONBOARDED,
    });
    expect(onboardedVendors.length).toBe(2);
    expect(onboardedVendors.every(v => v.status === VendorStatus.ONBOARDED)).toBe(true);

    const leadVendors = await services.vendorRepository.getVendors({
      status: VendorStatus.LEAD,
    });
    expect(leadVendors.length).toBe(1);
    expect(leadVendors[0].status).toBe(VendorStatus.LEAD);
  });

  it('4. Active vs Inactive state filtering', async () => {
    const activeVendors = await services.vendorRepository.getVendors({
      activeState: 'ACTIVE',
    });
    expect(activeVendors.every(v => v.status === VendorStatus.ONBOARDED || v.status === VendorStatus.VISITED)).toBe(true);
    expect(activeVendors.length).toBe(4);

    const inactiveVendors = await services.vendorRepository.getVendors({
      activeState: 'INACTIVE',
    });
    expect(inactiveVendors.every(v => v.status === VendorStatus.LEAD || v.status === VendorStatus.NOT_INTERESTED)).toBe(true);
    expect(inactiveVendors.length).toBe(2);
  });

  it('5. Combined search and status filtering', async () => {
    const combined = await services.vendorRepository.getVendors({
      searchQuery: 'Sharma',
      status: VendorStatus.ONBOARDED,
    });
    expect(combined.length).toBe(1);
    expect(combined[0].vendorName).toBe('Priya Sharma');
  });

  it('6. Query returning empty results', async () => {
    const emptyResult = await services.vendorRepository.getVendors({
      searchQuery: 'NonExistentVendor999',
    });
    expect(Array.isArray(emptyResult)).toBe(true);
    expect(emptyResult.length).toBe(0);
  });

  it('7. Territory scoping filter application', async () => {
    const districtScoped = await services.vendorRepository.getVendors({
      districtId: 'dt-indore-01',
    });
    expect(districtScoped.length).toBe(6);

    const nonExistentTerritory = await services.vendorRepository.getVendors({
      districtId: 'dt-other-99',
    });
    expect(nonExistentTerritory.length).toBe(0);
  });

  it('8. Fetch vendor by ID', async () => {
    const vendor = await services.vendorRepository.getVendorById('v-101');
    expect(vendor).not.toBeNull();
    expect(vendor?.businessName).toBe('Fresh Mart Supermarket');

    const missing = await services.vendorRepository.getVendorById('v-invalid');
    expect(missing).toBeNull();
  });

  it('9. Create new vendor entry in repository', async () => {
    const newVendor = await services.vendorRepository.createVendor({
      businessName: 'New Test Store',
      vendorName: 'Test Owner',
      phone: '9000000000',
      category: VendorCategory.SERVICE,
      businessType: 'Proprietorship',
      address: '100 Test St',
      stateId: 'st-mp-01',
      districtId: 'dt-indore-01',
      divisionId: 'div-north-01',
      pincodeId: '452001',
      status: VendorStatus.LEAD,
      createdById: 'mgr-001',
    });
    expect(newVendor.id).toBeDefined();
    expect(newVendor.businessName).toBe('New Test Store');

    const verifyFetch = await services.vendorRepository.getVendorById(newVendor.id);
    expect(verifyFetch).not.toBeNull();
  });
});
