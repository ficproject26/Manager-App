import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  LanguageOption,
  TRANSLATIONS,
} from '../constants/translations';
import { services } from '../services';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  languages: LanguageOption[];
}

const STORAGE_KEY_LANGUAGE = 'app_user_language_preference';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    // Restore persisted language on startup
    const loadSavedLanguage = async () => {
      try {
        const saved = await services.storageService.getItem(STORAGE_KEY_LANGUAGE);
        if (saved && (saved === 'en' || saved === 'hi' || saved === 'ta' || saved === 'te' || saved === 'kn')) {
          setLanguageState(saved as SupportedLanguage);
        }
      } catch (e) {
        console.warn('[LanguageContext] Failed to load saved language:', e);
      }
    };
    loadSavedLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      await services.storageService.setItem(STORAGE_KEY_LANGUAGE, newLang);
    } catch (e) {
      console.warn('[LanguageContext] Failed to persist language:', e);
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const currentDict = TRANSLATIONS[language] || TRANSLATIONS.en;
      if (currentDict && currentDict[key]) {
        return currentDict[key];
      }
      // Fallback to English dictionary
      if (TRANSLATIONS.en && TRANSLATIONS.en[key]) {
        return TRANSLATIONS.en[key];
      }
      return fallback || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
