import React, { useState, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { LoginScreen } from '../../features/auth/LoginScreen';
import { ForgotPasswordScreen } from '../../features/auth/ForgotPasswordScreen';
import { RegisterScreen } from '../../features/auth/RegisterScreen';
import { OtpVerificationExampleScreen } from '../../features/auth/OtpVerificationExampleScreen';
import { useAuth } from '../../hooks/useAuth';

export const AuthNavigator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<
    'LOGIN' | 'FORGOT_PASSWORD' | 'REGISTER' | 'OTP_LOGIN'
  >('LOGIN');
  const { login } = useAuth();

  useEffect(() => {
    const onBackPress = () => {
      if (
        currentScreen === 'FORGOT_PASSWORD' ||
        currentScreen === 'REGISTER' ||
        currentScreen === 'OTP_LOGIN'
      ) {
        setCurrentScreen('LOGIN');
        return true;
      }
      // On Login screen, allow default Android back behavior (app background/exit)
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => subscription.remove();
  }, [currentScreen]);

  if (currentScreen === 'OTP_LOGIN') {
    return (
      <OtpVerificationExampleScreen
        onBack={() => setCurrentScreen('LOGIN')}
        onLoginSuccess={async () => {
          // Auto-login to demo account upon successful verification
          try {
            await login('ramesh@forge.in', 'Password123');
          } catch (e) {
            console.log('OTP login fallback error:', e);
          }
        }}
      />
    );
  }

  if (currentScreen === 'FORGOT_PASSWORD') {
    return <ForgotPasswordScreen onBack={() => setCurrentScreen('LOGIN')} />;
  }

  if (currentScreen === 'REGISTER') {
    return (
      <RegisterScreen
        onBackToLogin={() => setCurrentScreen('LOGIN')}
        onRegisterSuccess={() => setCurrentScreen('LOGIN')}
      />
    );
  }

  return (
    <LoginScreen
      onForgotPassword={() => setCurrentScreen('FORGOT_PASSWORD')}
      onRegister={() => setCurrentScreen('REGISTER')}
      onOtpLogin={() => setCurrentScreen('OTP_LOGIN')}
    />
  );
};


