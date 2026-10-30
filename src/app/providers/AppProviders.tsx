import React, { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../../store/AuthContext';
import { AlertProvider } from '../../context/AlertContext';
import { LanguageProvider } from '../../context/LanguageContext';

export const AppProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AlertProvider>
          <AuthProvider>{children}</AuthProvider>
        </AlertProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};
