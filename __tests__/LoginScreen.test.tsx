/**
 * Login Screen & Authentication Workflow Test Suite
 */
import { authService } from '../src/services/auth/AuthService';

describe('Login Screen & Authentication Workflow', () => {
  it('1. Mock authentication succeeds with valid credentials', async () => {
    const result = await authService.login('manager@forgeindia.in', 'Password123');
    expect(result.success).toBe(true);
    expect(result.token).toBeDefined();
    expect(result.manager?.name).toBe('Rajesh Kumar');
  });

  it('2. Mock authentication fails with invalid credentials', async () => {
    const result = await authService.login('manager@forgeindia.in', 'wrongpassword');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    expect(result.errorMessage).toContain('Invalid username or password');
  });

  it('3. Mock authentication fails when required fields are empty', async () => {
    const result = await authService.login('', '');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('BAD_REQUEST');
  });

  it('4. Mock authentication handles network error scenario', async () => {
    const result = await authService.login('networkerror@forgeindia.in', 'Password123');
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('NETWORK_ERROR');
    expect(result.errorMessage).toContain('Network connection failed');
  });

  it('5. Logout clears stored auth tokens', async () => {
    await authService.login('manager@forgeindia.in', 'Password123');
    await authService.logout();
    const currentManager = await authService.getCurrentManager();
    expect(currentManager).toBeNull();
  });
});
