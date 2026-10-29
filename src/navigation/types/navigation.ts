/**
 * Typed Navigation Parameters for React Navigation
 */

export type AuthStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
};

export type MainDrawerParamList = {
  Dashboard: undefined;
  ManagersDirectory: undefined;
  Reports: undefined;
  Vendors: undefined;
  Tasks: undefined;
  Leaderboard: undefined;
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
  ExceptionReportForm: { activityId: string; vendorId: string };
};
