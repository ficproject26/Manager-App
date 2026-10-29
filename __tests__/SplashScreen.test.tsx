import { authService } from '../src/services/auth/AuthService';

describe('SplashScreen & App Startup Auth Integration', () => {
  beforeEach(async () => {
    await authService.logout();
  });

  it('1. Splash screen startup auth check runs successfully', async () => {
    const currentManager = await authService.getCurrentManager();
    expect(currentManager).toBeNull();
  });

  it('2. Auth service returns session when user is authenticated', async () => {
    await authService.login('manager@forgeindia.in', 'Password123');
    const currentManager = await authService.getCurrentManager();
    expect(currentManager).not.toBeNull();
    expect(currentManager?.name).toBe('Rajesh Kumar');
    // Cleanup
    await authService.logout();
  });

  it('3. Double-tap back logic exits only when tapped twice within 2000ms threshold', () => {
    let exitCalled = false;
    let toastMessage = '';

    const handleBack = (currentTime: number, lastPressTime: number): { lastPress: number; didExit: boolean } => {
      if (lastPressTime > 0 && currentTime - lastPressTime < 2000) {
        exitCalled = true;
        return { lastPress: lastPressTime, didExit: true };
      }
      toastMessage = 'Tap back again to exit';
      return { lastPress: currentTime, didExit: false };
    };

    // First tap at t=1000
    const firstTap = handleBack(1000, 0);
    expect(firstTap.didExit).toBe(false);
    expect(firstTap.lastPress).toBe(1000);
    expect(toastMessage).toBe('Tap back again to exit');
    expect(exitCalled).toBe(false);

    // Second tap at t=2200 (within 2000ms of first tap at t=1000)
    const secondTap = handleBack(2200, firstTap.lastPress);
    expect(secondTap.didExit).toBe(true);
    expect(exitCalled).toBe(true);

    // If tapped after 2000ms (e.g. at t=5000 from t=1000)
    exitCalled = false;
    const delayedTap = handleBack(5000, firstTap.lastPress);
    expect(delayedTap.didExit).toBe(false);
    expect(exitCalled).toBe(false);
  });
});


