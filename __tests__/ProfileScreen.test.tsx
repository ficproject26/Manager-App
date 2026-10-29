/**
 * Profile Feature & Authentication Integration Test Suite
 */
import { authService } from '../src/services/auth/AuthService';

describe('Profile Feature & Authentication Integration', () => {
  beforeEach(async () => {
    await authService.login('manager@forgeindia.in', 'Password123');
  });

  it('1. Retrieves current authenticated manager profile details', async () => {
    const manager = await authService.getCurrentManager();
    expect(manager).not.toBeNull();
    expect(manager?.name).toBe('Rajesh Kumar');
    expect(manager?.email).toBe('rajesh.k@forgeindia.in');
    expect(manager?.role).toBeDefined();
  });

  it('2. Manager profile contains workplace & scope properties', async () => {
    const manager = await authService.getCurrentManager();
    expect(manager).not.toBeNull();
    expect(manager?.name).toBe('Rajesh Kumar');
    expect(manager?.role).toBe('DIVISION_MANAGER');
  });

  it('3. Logout clears session state and manager identity', async () => {
    await authService.logout();
    const managerAfterLogout = await authService.getCurrentManager();
    expect(managerAfterLogout).toBeNull();
  });
});
