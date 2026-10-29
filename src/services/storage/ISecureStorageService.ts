/**
 * Abstract Secure Storage Interface for JWT Tokens & Encrypted User State
 */

export interface ISecureStorageService {
  setAuthToken(token: string): Promise<void>;
  getAuthToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  getRefreshToken(): Promise<string | null>;
  clearAuthTokens(): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}
