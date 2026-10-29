/**
 * Environment Configuration Settings
 */

export interface AppEnvironment {
  envName: 'development' | 'staging' | 'production';
  apiBaseUrl: string;
  googleMapsApiKey: string;
  mongoDbAtlasUri: string;
  enableAnalytics: boolean;
  enablePushNotifications: boolean;
  apiTimeoutMs: number;
  useMockData: boolean;
}

// Development configuration placeholder (Base URL from environment / default)
export const ENV: AppEnvironment = {
  envName: 'development',
  apiBaseUrl: 'http://3.110.88.42:8005/api',
  googleMapsApiKey: 'AIzaSyA_DemoGoogleMapsApiKeyForForgeIndia2026',
  mongoDbAtlasUri: '',
  enableAnalytics: false,
  enablePushNotifications: false,
  apiTimeoutMs: 15000,
  useMockData: false,
};

