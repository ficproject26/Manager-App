/**
 * HTTP Implementation of IAuthService for Manager Mobile App
 * Authoritative connection to Manager backend (No Mock Fallbacks)
 */
import { Manager, ManagerRole } from '../../types';
import { AuthLoginResult, IAuthService } from './AuthService';
import { apiClient } from '../api/ApiClient';
import { services } from '../index';

interface LoginApiResponse {
  success: boolean;
  message?: string;
  token?: string;
  user?: any;
  data?: any;
}

export class HttpAuthService implements IAuthService {
  /**
   * Helper to normalize raw user object from backend to Manager domain model
   */
  private normalizeManager(rawUser: any): Manager {
    if (!rawUser) {
      throw new Error('User record missing in response');
    }

    const rawRole = String(rawUser.role || rawUser.managerType || '').toUpperCase().trim();
    let role: ManagerRole = ManagerRole.DIVISION_MANAGER;
    if (rawRole.includes('STATE')) {
      role = ManagerRole.STATE_MANAGER;
    } else if (rawRole.includes('DISTRICT')) {
      role = ManagerRole.DISTRICT_MANAGER;
    } else if (rawRole.includes('PINCODE')) {
      role = ManagerRole.PINCODE_MANAGER;
    } else if (rawRole.includes('DIVISION')) {
      role = ManagerRole.DIVISION_MANAGER;
    }

    const resolvedState = rawUser.state || rawUser.assignedState || rawUser.scope?.stateName || '';
    const resolvedDistrict = rawUser.district || rawUser.assignedDistrict || rawUser.scope?.districtName || '';
    const resolvedDivision = rawUser.division || rawUser.assignedDivision || rawUser.scope?.divisionName || '';
    const resolvedPincode = rawUser.pincode || rawUser.assignedPincode || rawUser.scope?.pincodeCode || '';

    return {
      id: String(rawUser.id || rawUser._id || rawUser.managerId || ''),
      name: rawUser.name || 'Manager',
      email: rawUser.email || '',
      phone: rawUser.mobile || rawUser.phone || '',
      role,
      stateId: rawUser.stateId || '',
      state: resolvedState,
      districtId: rawUser.districtId || '',
      districts: resolvedDistrict ? [resolvedDistrict] : [],
      divisionId: rawUser.divisionId || '',
      division: resolvedDivision,
      pincodeId: rawUser.pincodeId || '',
      pincode: resolvedPincode,
      profileImage: rawUser.avatarUrl || '',
      employeeId: rawUser.managerId || '',
      territoryName: resolvedDivision || resolvedDistrict || resolvedState || 'Territory',
      status: String(rawUser.status || '').toLowerCase() === 'active' ? 'ACTIVE' : 'INACTIVE',
      createdAt: rawUser.createdAt || new Date().toISOString(),
      updatedAt: rawUser.updatedAt || new Date().toISOString(),
    };
  }

  async login(username: string, password: string): Promise<AuthLoginResult> {
    if (!username || !password) {
      return {
        success: false,
        errorCode: 'BAD_REQUEST',
        errorMessage: 'Email or Mobile and Password are required.',
      };
    }

    try {
      const response = await apiClient.post<LoginApiResponse>(
        '/auth/login',
        {
          identifier: username.trim(),
          password,
        },
        { timeoutMs: 10000 }
      );

      const token = response.token || (response as any).data?.token;
      const rawUser = response.user || response.data?.user || response.data;

      if (!token || !rawUser) {
        return {
          success: false,
          errorCode: 'BAD_REQUEST',
          errorMessage: response.message || 'Authentication failed: Invalid response from server.',
        };
      }

      const manager = this.normalizeManager(rawUser);

      await services.storageService.setAuthToken(token);
      await services.storageService.setItem('ACTIVE_MGR_ID', manager.id);
      await services.storageService.setItem('ACTIVE_MGR_OBJECT', JSON.stringify(manager));

      return {
        success: true,
        token,
        manager,
      };
    } catch (error: any) {
      const status = error?.status;
      const message = error?.message || 'Authentication failed.';

      if (status === 401 || error?.code === 'INVALID_CREDENTIALS') {
        return {
          success: false,
          errorCode: 'INVALID_CREDENTIALS',
          errorMessage: message,
        };
      }

      if (status === 403) {
        return {
          success: false,
          errorCode: error?.code || 'BAD_REQUEST',
          errorMessage: message,
        };
      }

      if (status === 429) {
        return {
          success: false,
          errorCode: 'BAD_REQUEST',
          errorMessage: message,
        };
      }

      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: message.includes('fetch') || error?.code === 'NETWORK_ERROR'
          ? 'Unable to connect to the backend server. Please verify network connectivity.'
          : message,
      };
    }
  }

  async sendOtp(mobile: string): Promise<{ success: boolean; message?: string; otp?: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string; otp?: string }>(
        '/auth/send-otp',
        { mobile: mobile.trim() },
        { timeoutMs: 10000 }
      );
      return {
        success: true,
        message: response.message || 'OTP dispatched to registered mobile number.',
        otp: (response as any)?.otp || response.otp,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Failed to dispatch OTP. Please verify your registered mobile number.',
      };
    }
  }

  async verifyOtp(mobile: string, otp: string): Promise<AuthLoginResult> {
    try {
      const response = await apiClient.post<LoginApiResponse>(
        '/auth/verify-otp',
        { mobile: mobile.trim(), otp: otp.trim() },
        { timeoutMs: 10000 }
      );

      const token = response.token || (response as any).data?.token;
      const rawUser = response.user || response.data?.user || response.data;

      if (!token || !rawUser) {
        return {
          success: false,
          errorCode: 'BAD_REQUEST',
          errorMessage: response.message || 'OTP verification failed.',
        };
      }

      const manager = this.normalizeManager(rawUser);

      await services.storageService.setAuthToken(token);
      await services.storageService.setItem('ACTIVE_MGR_ID', manager.id);
      await services.storageService.setItem('ACTIVE_MGR_OBJECT', JSON.stringify(manager));

      return {
        success: true,
        token,
        manager,
      };
    } catch (error: any) {
      return {
        success: false,
        errorCode: error?.code || 'INVALID_CREDENTIALS',
        errorMessage: error?.message || 'Invalid or expired OTP. Please try again.',
      };
    }
  }

  async loginWithManager(manager: Manager): Promise<AuthLoginResult> {
    // For direct manager switching if authorized
    const token = await services.storageService.getAuthToken();
    if (!token) {
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: 'Session expired. Please log in again.',
      };
    }
    await services.storageService.setItem('ACTIVE_MGR_ID', manager.id);
    await services.storageService.setItem('ACTIVE_MGR_OBJECT', JSON.stringify(manager));
    return {
      success: true,
      token,
      manager,
    };
  }

  async logout(): Promise<void> {
    try {
      const token = await services.storageService.getAuthToken();
      if (token) {
        await apiClient.post('/settings/sessions/revoke', {}, { token }).catch(() => {});
      }
    } catch {
      // Ignore network errors on logout to ensure local tokens are cleared
    } finally {
      await services.storageService.clearAuthTokens();
      await services.storageService.removeItem('ACTIVE_MGR_ID');
      await services.storageService.removeItem('ACTIVE_MGR_OBJECT');
    }
  }

  async getCurrentManager(): Promise<Manager | null> {
    const token = await services.storageService.getAuthToken();
    if (!token) return null;

    try {
      const response = await apiClient.get<any>('/auth/me', { token, timeoutMs: 15000 });
      const rawUser = response.user || response.data?.user || response.data;
      if (rawUser && (rawUser.id || rawUser._id || rawUser.email)) {
        const manager = this.normalizeManager(rawUser);
        await services.storageService.setItem('ACTIVE_MGR_OBJECT', JSON.stringify(manager));
        return manager;
      }
    } catch (err: any) {
      console.warn('[HttpAuthService] /auth/me call error:', err);
      // If server explicitly returned 401/403, session has expired. Wipe invalid session!
      if (err?.status === 401 || err?.status === 403 || err?.code === 'UNAUTHORIZED') {
        await services.storageService.clearAuthTokens();
        await services.storageService.removeItem('ACTIVE_MGR_ID');
        await services.storageService.removeItem('ACTIVE_MGR_OBJECT');
        return null;
      }
    }

    // Offline cache fallback (only cached previously authenticated user, never mock)
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
