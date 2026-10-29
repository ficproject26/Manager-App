/**
 * Settings Feature Module Definitions
 */
export * from './SettingsScreen';

export interface SettingsState {
  pushNotificationsEnabled: boolean;
  biometricAuthEnabled: boolean;
  themeMode: 'light' | 'dark' | 'system';
}
