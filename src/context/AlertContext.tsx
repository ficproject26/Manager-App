import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Alert as RNAlert } from 'react-native';
import { FICAlertModal, AlertButton } from '../components/ui/FICAlertModal';

export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

export interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

interface AlertContextValue {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: AlertOptions
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

let globalShowAlert:
  | ((
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => void)
  | null = null;

// Global method to show custom alert from anywhere
export const showCustomAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions
) => {
  if (globalShowAlert) {
    globalShowAlert(title, message, buttons, options);
  } else {
    // Fallback if provider not yet mounted
    RNAlert.alert(title, message, buttons as any, options as any);
  }
};

// Global interceptor for Alert.alert
const originalRNAlert = RNAlert.alert;
RNAlert.alert = (
  title: string,
  message?: string,
  buttons?: any[],
  options?: any
) => {
  if (globalShowAlert) {
    globalShowAlert(title, message, buttons, options);
  } else {
    originalRNAlert(title, message, buttons, options);
  }
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    cancelable: true,
  });

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      options?: AlertOptions
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
        cancelable: options?.cancelable ?? true,
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    globalShowAlert = showAlert;
    return () => {
      globalShowAlert = null;
    };
  }, [showAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <FICAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        cancelable={alertState.cancelable}
        onDismiss={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    return {
      showAlert: showCustomAlert,
      hideAlert: () => {},
    };
  }
  return context;
};
