/**
 * Field Visit Service
 * Manages field visit records, vendor visit logging, and synchronizes newly
 * added vendors directly with Field Visit Reports and the Manager's Daily Report.
 */
import { VisitRecord, Vendor, Manager, VendorStatus } from '../../types';
import { IVendorRepository } from '../repositories/IVendorRepository';

const INITIAL_VISIT_RECORDS: VisitRecord[] = [];

export interface RecordVendorVisitParams {
  vendor: Vendor;
  manager?: Manager | null;
  isInterested?: boolean;
  reason?: string;
  photoUrl?: string;
  gpsCoords?: string;
  voiceNoteDuration?: number;
}

export class FieldVisitService {
  private records: VisitRecord[] = [...INITIAL_VISIT_RECORDS];
  private pendingDailyReportVendors: Vendor[] = [];
  private vendorRepo: IVendorRepository | null = null;

  setVendorRepository(repo: IVendorRepository) {
    this.vendorRepo = repo;
  }

  /**
   * Returns all field visit records, newest first.
   * Also synchronizes any custom vendors created in the vendor repository.
   */
  async getVisitRecords(): Promise<VisitRecord[]> {
    if (this.vendorRepo) {
      try {
        const allVendors = await this.vendorRepo.getVendors();
        for (const vendor of allVendors) {
          // If this vendor was created by user and not yet in visit records:
          const alreadyRecorded = this.records.some(
            r =>
              (r.shopName && r.shopName.toLowerCase() === vendor.businessName.toLowerCase()) ||
              r.id.includes(vendor.id)
          );
          if (!alreadyRecorded && vendor.id.startsWith('v-')) {
            const cleanBusinessName = vendor.businessName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
            const managerName = vendor.assignedManager ? vendor.assignedManager.split('(')[0].trim() : 'Field Manager';
            const managerRole = vendor.assignedManager && vendor.assignedManager.includes('(')
              ? vendor.assignedManager.split('(')[1].replace(')', '').trim()
              : 'Division Manager';

            this.records.unshift({
              id: `visit_${Date.now()}_${vendor.id}`,
              shopName: vendor.businessName,
              vendorCode: `vendor${cleanBusinessName || 'MERCHANT'}`,
              category: vendor.category || 'Products',
              managerName,
              managerRole,
              location: vendor.locationDistrict || vendor.address || '',
              pincode: vendor.pincodeId || '',
              timestamp: 'Today, Just now',
              isInterested: vendor.status !== VendorStatus.NOT_INTERESTED,
              photoUrl: vendor.shopPhotoUrl || vendor.logoUrl || (vendor as any).photoUrl || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
              gpsCoords: vendor.latitude && vendor.longitude ? `${vendor.latitude}° N, ${vendor.longitude}° E` : '',
            });

            // Also make available for daily report
            if (!this.pendingDailyReportVendors.some(v => v.id === vendor.id)) {
              this.pendingDailyReportVendors.push(vendor);
            }
          }
        }
      } catch {
        // Continue with current records
      }
    }
    return [...this.records];
  }

  /**
   * Adds an arbitrary visit record.
   */
  async addVisitRecord(record: VisitRecord): Promise<VisitRecord> {
    this.records = [record, ...this.records];
    return record;
  }

  /**
   * Automatically invoked whenever a vendor is added or visited.
   * Creates a VisitRecord for the Reports screen and queues the vendor for the Daily Report.
   */
  async recordVendorAdded(params: RecordVendorVisitParams): Promise<VisitRecord> {
    const { vendor, manager, isInterested = true, reason, photoUrl, gpsCoords, voiceNoteDuration } = params;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateFormatted = `Today, ${timeString}`;

    // Clean vendor code: vendor + first 8 characters of business name
    const cleanBusinessName = vendor.businessName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
    const vendorCode = `vendor${cleanBusinessName || 'MERCHANT'}`;

    const newRecord: VisitRecord = {
      id: `visit_${Date.now()}_${vendor.id || Math.random().toString(36).substring(2, 6)}`,
      shopName: vendor.businessName,
      vendorCode,
      category: vendor.category || 'Products',
      managerName: manager?.name || 'Field Manager',
      managerRole: manager?.role
        ? manager.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Division Manager',
      location: vendor.locationDistrict || vendor.address || '',
      pincode: vendor.pincodeId || '',
      timestamp: dateFormatted,
      isInterested: isInterested && vendor.status !== VendorStatus.NOT_INTERESTED,
      photoUrl: photoUrl || vendor.shopPhotoUrl || vendor.logoUrl || (vendor as any).photoUrl || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
      reasonNotInterested: reason,
      gpsCoords: gpsCoords || (vendor.latitude && vendor.longitude ? `${vendor.latitude}° N, ${vendor.longitude}° E` : ''),
      voiceNoteDuration,
    };

    // Prepend to top of visit records
    this.records = [newRecord, ...this.records];

    // Also queue this vendor for the manager's Daily Report
    if (!this.pendingDailyReportVendors.some(v => v.id === vendor.id)) {
      this.pendingDailyReportVendors.push(vendor);
    }

    return newRecord;
  }

  /**
   * Returns list of vendors added today pending daily report submission.
   */
  getPendingDailyReportVendors(): Vendor[] {
    return [...this.pendingDailyReportVendors];
  }

  /**
   * Adds a vendor directly into the daily report queue.
   */
  addPendingDailyReportVendor(vendor: Vendor): void {
    if (!this.pendingDailyReportVendors.some(v => v.id === vendor.id)) {
      this.pendingDailyReportVendors.push(vendor);
    }
  }

  /**
   * Removes a vendor from the daily report pending queue once handled.
   */
  removePendingDailyReportVendor(vendorId: string): void {
    this.pendingDailyReportVendors = this.pendingDailyReportVendors.filter(v => v.id !== vendorId);
  }
}

export const fieldVisitService = new FieldVisitService();
