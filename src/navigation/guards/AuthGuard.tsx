import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AuthNavigator } from '../stacks/AuthNavigator';
import { MainDrawerNavigator } from '../stacks/MainDrawerNavigator';
import { SplashScreen } from '../../features/splash';

export const AuthGuard: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    // Show splash screen on cold start for a minimum of 2 seconds
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setInitialCheckDone(true);
    }
  }, [isLoading]);

  // Keep splash screen visible while app is opening or until initial auth bootstrap completes
  if (isSplashVisible || !initialCheckDone) {
    return <SplashScreen loadingMessage="Forge India Connect" />;
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  return <MainDrawerNavigator />;
};


