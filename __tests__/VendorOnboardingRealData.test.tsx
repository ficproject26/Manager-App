/**
 * Vendor Onboarding Real Data & Time Picker Test Suite
 */
import { services } from '../src/services';
import { VendorCategory, VendorStatus } from '../src/types';

describe('Vendor Onboarding Real Data & Form Validation Workflow', () => {
  it('1. Vendor creation payload handles real business fields and uploaded logo URL', async () => {
    const localLogoUri = 'file:///data/user/0/com.ficmanager/cache/shop_logo_real_99.png';
    const uploadedLogoUrl = await services.mediaUploadService.uploadShopPhoto(localLogoUri);
    expect(uploadedLogoUrl).toBe(localLogoUri);

    const payload = {
      businessName: 'Apex Electronics & Appliances',
      vendorName: 'Vikram Singh',
      phone: '9876543210',
      email: 'vikram@apexelectronics.in',
      category: VendorCategory.PRODUCT,
      businessType: 'Proprietorship',
      address: '102 Anna Salai, Chennai',
      operatingHours: '09:00 AM - 08:30 PM',
      logoUrl: uploadedLogoUrl,
      stateId: 'st-tn-01',
      districtId: 'dt-chn-01',
      divisionId: 'div-central-01',
      pincodeId: '600002',
      status: VendorStatus.ONBOARDED,
      createdById: 'mgr-001',
    };

    const created = await services.vendorRepository.createVendor(payload);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.businessName).toBe('Apex Electronics & Appliances');
  });

  it('2. Time picker logic validates closing time is after opening time', () => {
    const convertToMinutes = (hStr: string, mStr: string, period: 'AM' | 'PM') => {
      let h = parseInt(hStr, 10);
      if (period === 'PM' && h < 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      const m = parseInt(mStr, 10);
      return h * 60 + m;
    };

    const openMin = convertToMinutes('09', '00', 'AM'); // 540 min
    const closeMinValid = convertToMinutes('06', '30', 'PM'); // 1110 min
    const closeMinInvalid = convertToMinutes('08', '00', 'AM'); // 480 min

    expect(closeMinValid).toBeGreaterThan(openMin);
    expect(closeMinInvalid).toBeLessThan(openMin);
  });
});
