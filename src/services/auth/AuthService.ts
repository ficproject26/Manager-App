/**
 * Authentication Service Abstraction & Mock Authentication Engine
 */
import { Manager, ManagerRole } from '../../types';
import { services } from '../index';

export interface AuthLoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  manager?: Manager;
  errorCode?: 'INVALID_CREDENTIALS' | 'NETWORK_ERROR' | 'BAD_REQUEST';
  errorMessage?: string;
}

export interface IAuthService {
  login(username: string, password: string): Promise<AuthLoginResult>;
  loginWithManager(manager: Manager): Promise<AuthLoginResult>;
  logout(): Promise<void>;
  getCurrentManager(): Promise<Manager | null>;
  sendOtp?(mobile: string): Promise<{ success: boolean; message?: string; otp?: string }>;
  verifyOtp?(mobile: string, otp: string): Promise<AuthLoginResult>;
}

export class MockAuthService implements IAuthService {
  private activeManagerId: string = 'mgr-001';

  async login(username: string, password: string): Promise<AuthLoginResult> {
    // Simulate network latency (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    // Validate inputs
    if (!username || !password) {
      return {
        success: false,
        errorCode: 'BAD_REQUEST',
        errorMessage: 'Email/Username and Password are required.',
      };
    }

    // Simulate invalid credentials test case
    if (password === 'wrongpassword' || password === 'invalid') {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Invalid username or password. Please verify your credentials.',
      };
    }

    // Simulate network error test case
    if (username.includes('networkerror')) {
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Network connection failed. Please check your internet connectivity.',
      };
    }

    const lowerUsername = username.toLowerCase().trim();

    // Determine mock manager profile based on input role hint or email
    let mockManager: Manager;

    if (lowerUsername.includes('ramesh') || lowerUsername.includes('state')) {
      mockManager = {
        id: 'mgr-000',
        name: 'Ramesh',
        email: username.includes('@') ? username : 'ramesh.state@forgeindia.in',
        phone: '9876543200',
        role: ManagerRole.STATE_MANAGER,
        stateId: 'st-tn-01',
        districtId: 'dt-chn-01',
        employeeId: 'FM1000',
        territoryName: 'Tamil Nadu',
        status: 'ACTIVE',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };
    } else if (lowerUsername.includes('priya')) {
      mockManager = {
        id: 'mgr-002',
        name: 'Priya Sharma',
        email: username.includes('@') ? username : 'priya.division@forgeindia.in',
        phone: '9876543211',
        role: ManagerRole.DIVISION_MANAGER,
        stateId: 'st-mp-01',
        districtId: 'dt-indore-01',
        employeeId: 'FM1002',
        territoryName: 'Madhya Pradesh State',
        status: 'ACTIVE',
        createdAt: '2025-01-10T00:00:00Z',
        updatedAt: '2025-01-10T00:00:00Z',
      };
    } else if (lowerUsername.includes('ananth') || lowerUsername.includes('div-tn') || lowerUsername.includes('division')) {
      mockManager = {
        id: 'mgr-tn-div1',
        name: 'K. Ananth',
        email: username.includes('@') ? username : 'ananth.k@forgeindia.in',
        phone: '9876543217',
        role: ManagerRole.DIVISION_MANAGER,
        stateId: 'st-tn-01',
        districtId: 'dt-chn-01',
        divisionId: 'div-chn-north',
        employeeId: 'FM1005',
        territoryName: 'Chennai North Division',
        status: 'ACTIVE',
        createdAt: '2025-01-06T00:00:00Z',
        updatedAt: '2025-01-06T00:00:00Z',
      };
    } else if (lowerUsername.includes('district') || lowerUsername.includes('suresh')) {
      mockManager = {
        id: 'mgr-tn-dt1',
        name: 'Suresh Menon',
        email: username.includes('@') ? username : 'suresh.district@forgeindia.in',
        phone: '9876543213',
        role: ManagerRole.DISTRICT_MANAGER,
        stateId: 'st-tn-01',
        districtId: 'dt-chn-01',
        employeeId: 'FM1004',
        territoryName: 'Chennai District',
        status: 'ACTIVE',
        createdAt: '2025-01-05T00:00:00Z',
        updatedAt: '2025-01-05T00:00:00Z',
      };
    } else if (lowerUsername.includes('selvi') || lowerUsername.includes('pincode')) {
      mockManager = {
        id: 'mgr-tn-pin1',
        name: 'M. Selvi',
        email: username.includes('@') ? username : 'selvi.m@forgeindia.in',
        phone: '9876543219',
        role: ManagerRole.PINCODE_MANAGER,
        stateId: 'st-tn-01',
        districtId: 'dt-chn-01',
        divisionId: 'div-chn-north',
        pincodeId: '600001',
        employeeId: 'FM1006',
        territoryName: 'Parrys Pincode (600001)',
        status: 'ACTIVE',
        createdAt: '2025-01-08T00:00:00Z',
        updatedAt: '2025-01-08T00:00:00Z',
      };
    } else {
      // Default: Division Manager Rajesh Kumar (mgr-001)
      mockManager = {
        id: 'mgr-001',
        name: 'Rajesh Kumar',
        email: username.includes('@') ? username : 'rajesh.division@forgeindia.in',
        phone: '9876543210',
        role: ManagerRole.DIVISION_MANAGER,
        stateId: 'st-mp-01',
        districtId: 'dt-indore-01',
        divisionId: 'div-north-01',
        employeeId: 'FM1001',
        territoryName: 'Indore District',
        status: 'ACTIVE',
        createdAt: '2025-01-10T00:00:00Z',
        updatedAt: '2025-01-10T00:00:00Z',
      };
    }

    const mockToken = `fic_jwt_${Date.now()}_mock`;
    const mockRefreshToken = `fic_ref_${Date.now()}_mock`;

    await services.storageService.setAuthToken(mockToken);
    await services.storageService.setRefreshToken(mockRefreshToken);
    await services.storageService.setItem('ACTIVE_MGR_ID', mockManager.id);
    await services.storageService.setItem('ACTIVE_MGR_OBJECT', JSON.stringify(mockManager));
    this.activeManagerId = mockManager.id;

    return {
      success: true,
      token: mockToken,
      refreshToken: mockRefreshToken,
      manager: mockManager,
    };
  }

  async loginWithManager(manager: Manager): Promise<AuthLoginResult> {
    await new Promise(resolve => setTimeout(resolve, 250));
    const mockToken = `fic_jwt_${Date.now()}_${manager.id}`;
    const mockRefreshToken = `fic_ref_${Date.now()}_${manager.id}`;

    await services.storageService.setAuthToken(mockToken);
    await services.storageService.setRefreshToken(mockRefreshToken);
    await services.storageService.setItem('ACTIVE_MGR_ID', manager.id);
    await services.storageService.setItem('ACTIVE_MGR_OBJECT', JSON.stringify(manager));
    this.activeManagerId = manager.id;

    return {
      success: true,
      token: mockToken,
      refreshToken: mockRefreshToken,
      manager,
    };
  }

  async logout(): Promise<void> {
    await services.storageService.clearAuthTokens();
    await services.storageService.removeItem('ACTIVE_MGR_ID');
    await services.storageService.removeItem('ACTIVE_MGR_OBJECT');
    this.activeManagerId = 'mgr-001';
  }

  async getCurrentManager(): Promise<Manager | null> {
    const token = await services.storageService.getAuthToken();
    if (!token) return null;
    const storedMgrId = await services.storageService.getItem('ACTIVE_MGR_ID');
    const targetId = storedMgrId || this.activeManagerId;
    const fromRepo = await services.managerRepository.getManagerById(targetId);
    if (fromRepo) return fromRepo;

    const storedObj = await services.storageService.getItem('ACTIVE_MGR_OBJECT');
    if (storedObj) {
      try {
        return JSON.parse(storedObj) as Manager;
      } catch {
        return null;
      }
    }
    return null;
  }
}

import { ENV } from '../../constants/env';
import { HttpAuthService } from './HttpAuthService';

export const authService: IAuthService = ENV.useMockData ? new MockAuthService() : new HttpAuthService();
