/**
 * Mock Secure Storage Service for Local Development
 */
import { ISecureStorageService } from './ISecureStorageService';

export class MockSecureStorageService implements ISecureStorageService {
  private store: Map<string, string> = new Map();

  async setAuthToken(token: string): Promise<void> {
    this.store.set('AUTH_TOKEN', token);
  }

  async getAuthToken(): Promise<string | null> {
    return this.store.get('AUTH_TOKEN') || null;
  }

  async setRefreshToken(token: string): Promise<void> {
    this.store.set('REFRESH_TOKEN', token);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.store.get('REFRESH_TOKEN') || null;
  }

  async clearAuthTokens(): Promise<void> {
    this.store.delete('AUTH_TOKEN');
    this.store.delete('REFRESH_TOKEN');
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}
