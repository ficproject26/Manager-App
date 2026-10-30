/**
 * Field Visit Service
 * Manages field visit records, vendor visit logging, and synchronizes newly
 * added vendors directly with Field Visit Reports and the Manager's Daily Report.
 * Authoritative connection to backend submitted reports (No Mock Fallbacks)
 */
import { VisitRecord, Vendor, Manager, VendorStatus } from '../../types';
import { IVendorRepository } from '../repositories/IVendorRepository';
import { apiClient } from '../api/ApiClient';

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
   * Synchronizes with backend submitted reports and live vendor visits.
   */
  async getVisitRecords(): Promise<VisitRecord[]> {
    // 1. Fetch live submitted reports from production backend
    try {
      console.log('[FieldVisitService] fetching /reports/submitted...');
      const res = await apiClient.get<any>('/reports/submitted', { timeoutMs: 15000 });
      const backendReports = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
      console.log('[FieldVisitService] backendReports parsed count:', backendReports.length);
        if (Array.isArray(backendReports)) {
          for (const rep of backendReports) {
            const mgrName = rep.managerName || 'Regional Manager';
            const mgrRole = rep.managerRole || 'State Manager';
            const repLoc = [rep.district, rep.division, rep.state].filter(Boolean).join(', ') || 'Tamil Nadu';
            const repPin = rep.pincode || rep.pincodeCode || '';
            const repTime = rep.submittedAt ? new Date(rep.submittedAt).toLocaleDateString() : 'Recent';

            // Flatten visits contained in the submitted reports
            if (Array.isArray(rep.shopVisits) && rep.shopVisits.length > 0) {
              for (const v of rep.shopVisits) {
                const visitId = String(v._id || v.id || `visit_${rep._id || rep.id}_${v.shopName}`);
                if (!this.records.some(r => r.id === visitId)) {
                  const rawPhoto = v.shopPhoto || v.storefrontPhoto || v.photo || v.photoUrl;
                  const validPhoto = (rawPhoto && !rawPhoto.includes('[binary_truncated]')) ? rawPhoto : undefined;

                  this.records.push({
                    id: visitId,
                    shopName: v.shopName || 'Storefront Establishment',
                    vendorCode: rep.reportCode || `REP-${visitId.slice(-5)}`,
                    category: v.category || v.businessCategory || 'Commercial',
                    managerName: v.managerName || mgrName,
                    managerRole: v.managerRole || mgrRole,
                    location: [v.division, v.district, v.state].filter(Boolean).join(', ') || repLoc,
                    pincode: v.pincode || v.pincodeCode || repPin,
                    timestamp: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : repTime,
                    isInterested: v.interestStatus === 'YES' || v.interestedStatus === 'YES',
                    photoUrl: validPhoto,
                    reasonNotInterested: v.notInterestedReason,
                    gpsCoords: v.latitude && v.longitude ? `${v.latitude}° N, ${v.longitude}° E` : '',
                    voiceNoteUri: v.audioVoiceNote || v.voiceNote || undefined,
                  });
                }
              }
            } else {
              // Standalone submitted report record
              const repId = String(rep._id || rep.id || `rep_${Date.now()}`);
              if (!this.records.some(r => r.id === repId)) {
                this.records.push({
                  id: repId,
                  shopName: rep.reportTitle || rep.periodLabel || `Field Report (${rep.reportCode || 'Official'})`,
                  vendorCode: rep.reportCode || 'REP-OFFICIAL',
                  category: 'Operational Report',
                  managerName: mgrName,
                  managerRole: mgrRole,
                  location: repLoc,
                  pincode: repPin,
                  timestamp: repTime,
                  isInterested: true,
                });
              }
            }
          }
        }
    } catch (err) {
      console.warn('[FieldVisitService] /reports/submitted error:', err);
    }

    // 2. Also synchronize custom vendors created in vendor repository
    if (this.vendorRepo) {
      try {
        const allVendors = await this.vendorRepo.getVendors();
        for (const vendor of allVendors) {
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
              photoUrl: vendor.shopPhotoUrl || vendor.logoUrl || (vendor as any).photoUrl || undefined,
              gpsCoords: vendor.latitude && vendor.longitude ? `${vendor.latitude}° N, ${vendor.longitude}° E` : '',
            });

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
      photoUrl: photoUrl || vendor.shopPhotoUrl || vendor.logoUrl || (vendor as any).photoUrl || undefined,
      reasonNotInterested: reason,
      gpsCoords: gpsCoords || (vendor.latitude && vendor.longitude ? `${vendor.latitude}° N, ${vendor.longitude}° E` : ''),
      voiceNoteDuration,
    };

    this.records = [newRecord, ...this.records];

    if (!this.pendingDailyReportVendors.some(v => v.id === vendor.id)) {
      this.pendingDailyReportVendors.push(vendor);
    }

    return newRecord;
  }

  /**
   * Adds a vendor to pending daily report.
   */
  addPendingDailyReportVendor(vendor: Vendor): void {
    if (!this.pendingDailyReportVendors.some(v => v.id === vendor.id)) {
      this.pendingDailyReportVendors.push(vendor);
    }
  }

  /**
   * Returns list of vendors added today pending daily report submission.
   */
  getPendingDailyReportVendors(): Vendor[] {
    return [...this.pendingDailyReportVendors];
  }

  /**
   * Clears pending daily report vendors after submission.
   */
  clearPendingDailyReportVendors(): void {
    this.pendingDailyReportVendors = [];
  }
}

export const fieldVisitService = new FieldVisitService();
