/**
 * Core Domain & Application Types for FIC Manager Mobile App
 */

export enum ManagerRole {
  STATE_MANAGER = 'STATE_MANAGER',
  DISTRICT_MANAGER = 'DISTRICT_MANAGER',
  DIVISION_MANAGER = 'DIVISION_MANAGER',
  PINCODE_MANAGER = 'PINCODE_MANAGER',
}

export enum DivisionName {
  NORTH = 'NORTH',
  SOUTH = 'SOUTH',
  EAST = 'EAST',
  WEST = 'WEST',
  CENTRAL = 'CENTRAL',
}

export interface TerritoryScope {
  stateId: string;
  districtId?: string;
  divisionId?: string;
  divisionName?: DivisionName;
  pincodeId?: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: ManagerRole;
  stateId: string;
  state?: string;
  districtId?: string;
  districts?: string[];
  divisionId?: string;
  division?: string;
  divisionName?: DivisionName;
  pincodeId?: string;
  pincode?: string;
  profileImage?: string;
  employeeId?: string;
  territoryName?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export enum VendorCategory {
  SERVICE = 'Service',
  PRODUCT = 'Product',
  FOOD = 'Food',
  DAILY_NEEDS = 'Daily Needs',
  TRAVEL = 'Travel',
  STAY = 'Stay',
  JOBS = 'Jobs',
}

export enum VendorStatus {
  LEAD = 'LEAD',
  VISITED = 'VISITED',
  ONBOARDED = 'ONBOARDED',
  NOT_INTERESTED = 'NOT_INTERESTED',
}

export interface Vendor {
  id: string;
  name?: string;
  businessName: string;
  vendorName: string;
  phone: string;
  email?: string;
  category: VendorCategory;
  businessType: string;
  address: string;
  latitude?: number;
  longitude?: number;
  stateId: string;
  districtId: string;
  divisionId: string;
  pincodeId: string;
  shopPhotoUrl?: string;
  logoUrl?: string;
  licenseUrl?: string;
  kycUrl?: string;
  panUrl?: string;
  aadhaarUrl?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  documentUrls?: string[];
  status: VendorStatus;
  subcategory?: string;
  locationDistrict?: string;
  outletCount?: number;
  issueCount?: number;
  visitCount?: number;
  gstNumber?: string;
  yearOfEstablishment?: string;
  assignedManager?: string;
  imageKey?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  RESOLVED = 'RESOLVED',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assignedManagerId: string;
  status: TaskStatus;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  pincodeId?: string;
  divisionId?: string;
  districtId?: string;
  stateId?: string;
  rejectionReason?: string;
  dueSla?: string;
  assignedBy?: string;
  territory?: string;
  notes?: string;
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  beforePhotoUrl?: string;
  beforePhotoTimestamp?: string;
  beforePhotoLocation?: string;
  afterPhotoUrl?: string;
  afterPhotoTimestamp?: string;
  afterPhotoLocation?: string;
}

export type VendorWorkflowStage =
  | 'PENDING_VERIFICATION'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ESCALATED'
  | 'QR_ISSUED'
  | 'ACTIVE_TRADING';

export interface FieldAgent {
  id: string;
  name: string;
  phone: string;
  assignedPincode: string;
  stateId: string;
  districtId: string;
  divisionId: string;
  status: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  assignedManager: string;
  assignedManagerId: string;
  profileImage?: string;
  createdAt: string;
}

export enum IssueStatus {
  OPEN = 'OPEN',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  assignedManagerId: string;
  contactName?: string;
  contactPhone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  pincodeId?: string;
  divisionId?: string;
  districtId?: string;
  stateId?: string;
  vendorId?: string;
  vendorName?: string;
  location?: string;
  status: IssueStatus;
  resolutionText?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export enum ActivityType {
  VENDOR_ONBOARDED = 'VENDOR_ONBOARDED',
  VENDOR_VISIT_INTERESTED = 'VENDOR_VISIT_INTERESTED',
  VENDOR_VISIT_NOT_INTERESTED = 'VENDOR_VISIT_NOT_INTERESTED',
  TASK_ACCEPTED = 'TASK_ACCEPTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  HIGH_TASK_RESOLVED = 'HIGH_TASK_RESOLVED',
  ISSUE_RESOLVED = 'ISSUE_RESOLVED',
}

export interface Activity {
  id: string;
  managerId: string;
  activityType: ActivityType;
  entityId: string;
  entityName: string;
  timestamp: string;
  territory: TerritoryScope;
  metadata?: Record<string, unknown>;
}

export enum ReportType {
  TEXT = 'TEXT',
  VOICE = 'VOICE',
}

export interface Report {
  id: string;
  activityId: string;
  managerId: string;
  vendorId: string;
  reportType: ReportType;
  textNotes?: string;
  voiceUrl?: string;
  voiceDurationSeconds?: number;
  submittedAt: string;
}

export interface DailyReportVendorVisited {
  vendorId: string;
  vendorName: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  gpsCoords?: string;
}

export interface DailyReport {
  id: string;
  managerId: string;
  managerName?: string;
  role?: string;
  date: string;
  workSummary: string;
  shopsVisitedCount?: number;
  vendorsVisited: DailyReportVendorVisited[];
  voiceUrl?: string;
  voiceDurationSeconds?: number;
  photo1Url?: string;
  photo2Url?: string;
  issuesFollowUp?: string;
  additionalNotes?: string;
  status: 'SUBMITTED' | 'DRAFT';
  stateId?: string;
  districtId?: string;
  divisionId?: string;
  pincodeId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum NotificationCategory {
  DAILY_REPORT = 'DAILY_REPORT',
  ISSUE_UPDATE = 'ISSUE_UPDATE',
  VENDOR_UPDATE = 'VENDOR_UPDATE',
  SYSTEM = 'SYSTEM',
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  category?: NotificationCategory | string;
  priority: Priority;
  targetManagerId: string;
  isRead: boolean;
  deepLinkScreen?: string;
  deepLinkParams?: Record<string, string>;
  createdAt: string;
}

export interface LeaderboardEntry {
  managerId: string;
  managerName: string;
  role: ManagerRole | string;
  rank: number;
  score: number;
  vendorsOnboarded: number;
  tasksCompleted: number;
  issuesResolved: number;
  territoryName?: string;
  activitiesCount?: number;
  stateId?: string;
  stateName?: string;
  districtId?: string;
  districtName?: string;
  divisionId?: string;
  divisionName?: string;
  pincode?: string;
}

export interface VisitRecord {
  id: string;
  shopName: string;
  vendorCode: string;
  category: string;
  managerName: string;
  managerRole: string;
  location: string;
  pincode: string;
  timestamp: string;
  isInterested: boolean;
  photoUrl?: string;
  gpsCoords?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  phone?: string;
  contactPhone?: string;
  reasonNotInterested?: string;
  voiceNoteUri?: string;
  voiceNoteDuration?: number;
}

