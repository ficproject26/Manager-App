import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  BackHandler,
  ToastAndroid,
  Platform,
} from 'react-native';
import { DrawerContent } from '../drawer/DrawerContent';
import { DashboardScreen } from '../../features/dashboard/DashboardScreen';
import {
  VendorsScreen,
  AddVendorScreen,
  VendorDetailScreen,
  VendorVisitScreen,
} from '../../features/vendors';
import {
  DirectoryHomeScreen,
  AgentsDirectoryScreen,
} from '../../features/directory';
import { LeaderboardScreen } from '../../features/leaderboard/LeaderboardScreen';
import {
  FieldManagersScreen,
  ManagerDetailScreen,
} from '../../features/managers';
import { IssuesScreen, IssueDetailScreen } from '../../features/issues';
import { TasksScreen, TaskDetailScreen } from '../../features/tasks';
import {
  ReportsScreen,
  ReportDetailScreen,
  DailyReportScreen,
  SubordinateReportsScreen,
  ExceptionReportFormScreen,
} from '../../features/reports';
import { MoreMenuScreen } from '../../features/more';
import { NotificationsScreen } from '../../features/notifications';
import { ProfileScreen } from '../../features/profile';
import { SettingsScreen } from '../../features/settings';
import { FICBottomTabBar } from '../../components/ui/FICBottomTabBar';
import { theme } from '../../theme';

export const MainDrawerNavigator: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>('Dashboard');
  const [routeParams, setRouteParams] = useState<Record<string, any>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  const currentRouteRef = useRef(currentRoute);
  const isDrawerOpenRef = useRef(isDrawerOpen);
  const lastBackPressTimeRef = useRef<number>(0);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    currentRouteRef.current = currentRoute;
  }, [currentRoute]);

  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen;
  }, [isDrawerOpen]);

  useEffect(() => {
    return () => {
      if (exitToastTimerRef.current) {
        clearTimeout(exitToastTimerRef.current);
      }
    };
  }, []);

  const handleNavigate = (routeName: string, params?: Record<string, any>) => {
    setCurrentRoute(routeName);
    setRouteParams(params || {});
    setIsDrawerOpen(false);
  };

  useEffect(() => {
    const onBackPress = () => {
      // 1. If side drawer modal is open, close it
      if (isDrawerOpenRef.current) {
        setIsDrawerOpen(false);
        return true;
      }

      const route = currentRouteRef.current;

      // 2. Sub-screens and detail back navigation
      if (route === 'IssueDetail') {
        setCurrentRoute('Issues');
        return true;
      }
      if (route === 'Issues' || route === 'Leaderboard' || route === 'Notifications' || route === 'Profile' || route === 'Settings') {
        setCurrentRoute('MoreMenu');
        return true;
      }
      if (route === 'MoreMenu') {
        setCurrentRoute('Dashboard');
        return true;
      }
      if (route === 'ReportDetail' || route === 'DailyReport' || route === 'SubordinateReports') {
        setCurrentRoute('Reports');
        return true;
      }
      if (route === 'ExceptionReportForm') {
        setCurrentRoute('Vendors');
        return true;
      }
      if (route === 'VendorVisit') {
        setCurrentRoute('VendorDetail');
        return true;
      }
      if (route === 'VendorDetail' || route === 'AddVendor') {
        setCurrentRoute('Vendors');
        return true;
      }
      if (route === 'Vendors' || route === 'FieldManagers' || route === 'ManagersDirectory' || route === 'FieldAgents' || route === 'DirectoryHome') {
        setCurrentRoute('Dashboard');
        return true;
      }
      if (route === 'ManagerDetail') {
        setCurrentRoute('FieldManagers');
        return true;
      }
      if (route === 'TaskDetail') {
        setCurrentRoute('Tasks');
        return true;
      }
      if (route === 'Tasks' || route === 'Reports') {
        setCurrentRoute('Dashboard');
        return true;
      }

      // 3. If on any non-Home screen, navigate back to Dashboard (Home)
      if (route !== 'Dashboard') {
        setCurrentRoute('Dashboard');
        return true;
      }

      // 4. On Dashboard (Home): Double-tap back within 2 seconds to exit the app
      const now = Date.now();
      if (lastBackPressTimeRef.current > 0 && now - lastBackPressTimeRef.current < 2000) {
        if (exitToastTimerRef.current) {
          clearTimeout(exitToastTimerRef.current);
        }
        setShowExitToast(false);
        BackHandler.exitApp();
        return true;
      }

      lastBackPressTimeRef.current = now;

      // Show small message on first tap
      if (Platform.OS === 'android' && ToastAndroid && typeof ToastAndroid.show === 'function') {
        ToastAndroid.show('Tap back again to exit', ToastAndroid.SHORT);
      } else {
        setShowExitToast(true);
        if (exitToastTimerRef.current) {
          clearTimeout(exitToastTimerRef.current);
        }
        exitToastTimerRef.current = setTimeout(() => {
          setShowExitToast(false);
        }, 2000);
      }

      return true;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, []);

  const renderCurrentScreen = () => {
    switch (currentRoute) {
      case 'Dashboard':
        return (
          <DashboardScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Tasks':
        return (
          <TasksScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'TaskDetail':
        return (
          <TaskDetailScreen
            taskId={routeParams?.taskId}
            onBack={() => handleNavigate('Tasks')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Directory':
      case 'DirectoryHome':
        return (
          <DirectoryHomeScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Vendors':
        return (
          <VendorsScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'AddVendor':
        return (
          <AddVendorScreen
            initialBusinessName={routeParams?.initialBusinessName}
            initialCategory={routeParams?.initialCategory}
            initialPhotoUri={routeParams?.initialPhotoUri}
            onBack={() => handleNavigate('Vendors')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'VendorDetail':
        return (
          <VendorDetailScreen
            vendorId={routeParams?.vendorId}
            onBack={() => handleNavigate('Vendors')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'VendorVisit':
        return (
          <VendorVisitScreen
            vendorId={routeParams?.vendorId}
            onBack={() => handleNavigate('VendorDetail', { vendorId: routeParams?.vendorId })}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'ManagersDirectory':
      case 'FieldManagers':
        return (
          <FieldManagersScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'ManagerDetail':
        return (
          <ManagerDetailScreen
            managerId={routeParams?.managerId}
            onBack={() => handleNavigate('FieldManagers')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'FieldAgents':
        return (
          <AgentsDirectoryScreen
            onBack={() => handleNavigate('Dashboard')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Reports':
        return (
          <ReportsScreen
            initialTab={routeParams?.initialTab}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'DailyReport':
        return (
          <DailyReportScreen
            initialVendorId={routeParams?.vendorId}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'SubordinateReports':
        return (
          <SubordinateReportsScreen
            onBack={() => handleNavigate('Reports')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'ReportDetail':
        return (
          <ReportDetailScreen
            reportId={routeParams?.reportId}
            onBack={() => handleNavigate('Reports')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        );
      case 'More':
      case 'MoreMenu':
        return (
          <MoreMenuScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Leaderboard':
        return (
          <LeaderboardScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Issues':
        return (
          <IssuesScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'IssueDetail':
        return (
          <IssueDetailScreen
            issueId={routeParams?.issueId}
            onBack={() => handleNavigate('Issues')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
          />
        );
      case 'Notifications':
        return (
          <NotificationsScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Profile':
        return (
          <ProfileScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'Settings':
        return (
          <SettingsScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      case 'ExceptionReportForm':
        return (
          <ExceptionReportFormScreen
            activityId={routeParams?.activityId}
            vendorId={routeParams?.vendorId}
            onBack={() => handleNavigate('Vendors')}
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
      default:
        return (
          <DashboardScreen
            onOpenDrawer={() => setIsDrawerOpen(true)}
            onNavigateRoute={handleNavigate}
          />
        );
    }
  };

  const HIDE_BOTTOM_BAR_ROUTES = [
    'VendorDetail',
    'VendorVisit',
    'AddVendor',
    'TaskDetail',
    'IssueDetail',
    'ReportDetail',
    'ExceptionReportForm',
    'ManagerDetail',
    'SubordinateReports',
    'FieldAgents',
  ];

  const shouldShowBottomBar = !HIDE_BOTTOM_BAR_ROUTES.includes(currentRoute);

  return (
    <View style={styles.container}>
      <View style={styles.screenWrapper}>
        {renderCurrentScreen()}
      </View>

      {shouldShowBottomBar && (
        <FICBottomTabBar
          currentRoute={currentRoute}
          onNavigate={handleNavigate}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />
      )}

      {showExitToast && (
        <View
          style={[styles.exitToastContainer, !shouldShowBottomBar && styles.exitToastNoBar]}
          pointerEvents="none"
          testID="exit-toast"
        >
          <Text style={styles.exitToastText}>Tap back again to exit</Text>
        </View>
      )}

      <Modal
        visible={isDrawerOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsDrawerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.drawerWrapper}>
            <DrawerContent
              currentRoute={currentRoute}
              onNavigate={handleNavigate}
            />
          </View>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsDrawerOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenWrapper: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.overlay,
  },
  backdrop: {
    flex: 1,
  },
  drawerWrapper: {
    width: theme.spacing.drawerWidth,
    height: '100%',
    backgroundColor: theme.colors.surface,
    ...theme.elevation.modal,
  },
  exitToastContainer: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    zIndex: 9999,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  exitToastNoBar: {
    bottom: 28,
  },
  exitToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

