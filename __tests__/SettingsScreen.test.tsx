import { authService } from '../src/services/auth/AuthService';

describe('SettingsScreen & Authentication Logout Integration', () => {
  it('1. App version is accessible in package settings', () => {
    const pkg = require('../package.json');
    expect(pkg.version).toBe('1.0.0');
  });

  it('2. Logout from settings clears auth tokens properly', async () => {
    await authService.login('manager@forgeindia.in', 'Password123');
    let currentManager = await authService.getCurrentManager();
    expect(currentManager).not.toBeNull();

    await authService.logout();
    currentManager = await authService.getCurrentManager();
    expect(currentManager).toBeNull();
  });
});
