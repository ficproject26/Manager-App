/**
 * Typed Navigation Parameters for Drawer and Stack Navigators
 */

export type MainDrawerParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  DirectoryHome: undefined;
  Vendors: undefined;
  FieldManagers: undefined;
  ManagersDirectory: undefined;
  FieldAgents: undefined;
  Reports: undefined;
  DailyReport: undefined;
  SubordinateReports: undefined;
  MoreMenu: undefined;
  Leaderboard: undefined;
  Issues: undefined;
  Notifications: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainDrawer: undefined;
  VendorDetail: { vendorId: string };
  AddVendor: undefined;
  VendorVisit: { vendorId: string };
  TaskDetail: { taskId: string };
  IssueDetail: { issueId: string };
  ReportDetail: { reportId: string };
  SubordinateReports: undefined;
  FieldAgents: undefined;
  ExceptionReportForm: { activityId: string; vendorId: string };
};
