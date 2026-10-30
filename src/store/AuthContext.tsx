import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Manager } from '../types';
import { authService, AuthLoginResult } from '../services/auth/AuthService';
import { pushNotificationService } from '../services/push/PushNotificationService';
import { socketService } from '../services/realtime/SocketService';
import { services } from '../services';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  manager: Manager | null;
  token: string | null;
  authError: string | null;
  login: (username: string, password: string) => Promise<AuthLoginResult>;
  loginWithManager: (manager: Manager) => Promise<AuthLoginResult>;
  sendOtp: (mobile: string) => Promise<{ success: boolean; message?: string; otp?: string }>;
  verifyOtp: (mobile: string, otp: string) => Promise<AuthLoginResult>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [manager, setManager] = useState<Manager | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const currentManager = await authService.getCurrentManager();
        const authToken = await services.storageService.getAuthToken();
        if (currentManager) {
          setManager(currentManager);
          setToken(authToken || null);
          setIsAuthenticated(true);

          if (authToken) {
            socketService.connect(authToken, {
              managerId: currentManager.id,
              role: currentManager.role,
              stateId: currentManager.stateId,
              districtId: currentManager.districtId,
              divisionId: currentManager.divisionId,
              pincodeId: currentManager.pincodeId,
            });
          }

          // Register FCM token for current authenticated manager
          pushNotificationService.registerDeviceToken(currentManager.id, currentManager.role, {
            state: currentManager.state,
            district: currentManager.districts?.[0],
            division: currentManager.division,
            pincode: currentManager.pincode,
          }).catch(err => console.warn('FCM token registration failed on bootstrap:', err));
        }
      } catch (err) {
        console.warn('Auth bootstrap failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (username: string, password: string): Promise<AuthLoginResult> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.login(username, password);
      if (result.success && result.manager && result.token) {
        setToken(result.token);
        setManager(result.manager);
        setIsAuthenticated(true);

        socketService.connect(result.token, {
          managerId: result.manager.id,
          role: result.manager.role,
          stateId: result.manager.stateId,
          districtId: result.manager.districtId,
          divisionId: result.manager.divisionId,
          pincodeId: result.manager.pincodeId,
        });

        // Register FCM device token on login
        pushNotificationService.registerDeviceToken(result.manager.id, result.manager.role, {
          state: result.manager.state,
          district: result.manager.districts?.[0],
          division: result.manager.division,
          pincode: result.manager.pincode,
        }).catch(err => console.warn('FCM token registration failed on login:', err));
      } else if (result.errorMessage) {
        setAuthError(result.errorMessage);
      }
      return result;
    } catch (err) {
      const fallbackError = 'An unexpected authentication error occurred.';
      setAuthError(fallbackError);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: fallbackError,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithManager = async (targetManager: Manager): Promise<AuthLoginResult> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await authService.loginWithManager(targetManager);
      if (result.success && result.manager && result.token) {
        setToken(result.token);
        setManager(result.manager);
        setIsAuthenticated(true);

        socketService.connect(result.token, {
          managerId: result.manager.id,
          role: result.manager.role,
          stateId: result.manager.stateId,
          districtId: result.manager.districtId,
          divisionId: result.manager.divisionId,
          pincodeId: result.manager.pincodeId,
        });

        pushNotificationService.registerDeviceToken(result.manager.id, result.manager.role, {
          state: result.manager.state,
          district: result.manager.districts?.[0],
          division: result.manager.division,
          pincode: result.manager.pincode,
        }).catch(err => console.warn('FCM token registration failed on manager login:', err));
      } else if (result.errorMessage) {
        setAuthError(result.errorMessage);
      }
      return result;
    } catch (err) {
      const fallbackError = 'An unexpected login error occurred.';
      setAuthError(fallbackError);
      return {
        success: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: fallbackError,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (mobile: string): Promise<{ success: boolean; message?: string; otp?: string }> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (authService.sendOtp) {
        return await authService.sendOtp(mobile);
      }
      return { success: false, message: 'OTP service unavailable.' };
    } catch (err: any) {
      const msg = err?.message || 'Failed to send OTP.';
      setAuthError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (mobile: string, otp: string): Promise<AuthLoginResult> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (!authService.verifyOtp) {
        throw new Error('OTP verification service not configured.');
      }
      const result = await authService.verifyOtp(mobile, otp);
      if (result.success && result.manager && result.token) {
        setToken(result.token);
        setManager(result.manager);
        setIsAuthenticated(true);

        socketService.connect(result.token, {
          managerId: result.manager.id,
          role: result.manager.role,
          stateId: result.manager.stateId,
          districtId: result.manager.districtId,
          divisionId: result.manager.divisionId,
          pincodeId: result.manager.pincodeId,
        });

        pushNotificationService.registerDeviceToken(result.manager.id, result.manager.role, {
          state: result.manager.state,
          district: result.manager.districts?.[0],
          division: result.manager.division,
          pincode: result.manager.pincode,
        }).catch(err => console.warn('FCM token registration failed on OTP login:', err));
      } else if (result.errorMessage) {
        setAuthError(result.errorMessage);
      }
      return result;
    } catch (err: any) {
      const msg = err?.message || 'OTP verification failed.';
      setAuthError(msg);
      return {
        success: false,
        errorCode: 'INVALID_CREDENTIALS',
        errorMessage: msg,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      socketService.disconnect();
      if (manager) {
        await pushNotificationService.deactivateDeviceToken(manager.id).catch(err => {
          console.warn('FCM token deactivation error on logout:', err);
        });
      }
      await authService.logout();
      setToken(null);
      setManager(null);
      setIsAuthenticated(false);
      setAuthError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        manager,
        token,
        authError,
        login,
        loginWithManager,
        sendOtp,
        verifyOtp,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
