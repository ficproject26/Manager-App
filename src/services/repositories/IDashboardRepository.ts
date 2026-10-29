/**
 * Abstract Dashboard Repository Interface
 */
import { Activity, Priority } from '../../types';

export interface DashboardSummaryData {
  managerName: string;
  role: string;
  territoryName: string;
  vendorCount: number;
  activeTaskCount: number;
  openIssueCount: number;
  todayActivityCount: number;
  managerCount?: number;
  activeOutletsCount?: number;
  onboardedVendorCount?: number;
  managerGrowth?: string;
  vendorGrowth?: string;
  outletsGrowth?: string;
  onboardedGrowth?: string;
  stateScope?: string;
  highPriorityAlerts: Array<{
    id: string;
    type: 'TASK' | 'ISSUE';
    title: string;
    priority: Priority;
  }>;
}

export interface IDashboardRepository {
  getDashboardSummary(managerId: string): Promise<DashboardSummaryData>;
  getRecentActivities(managerId: string, limit?: number): Promise<Activity[]>;
}
