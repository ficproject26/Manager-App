import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface FICAlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
  cancelable?: boolean;
}

export const FICAlertModal: React.FC<FICAlertModalProps> = ({
  visible,
  title,
  message,
  buttons,
  onDismiss,
  cancelable = true,
}) => {
  if (!visible) return null;

  // Determine icon and theme color based on title & message
  const lowerTitle = (title || '').toLowerCase();
  const lowerMsg = (message || '').toLowerCase();

  let iconName = 'information-outline';
  let iconColor = '#1D4ED8';
  let iconBg = '#EFF6FF';
  let iconBorder = '#BFDBFE';
  let primaryBtnBg = '#1D4ED8';

  if (
    lowerTitle.includes('resolved') ||
    lowerTitle.includes('success') ||
    lowerTitle.includes('completed') ||
    lowerTitle.includes('saved') ||
    lowerTitle.includes('accepted') ||
    lowerTitle.includes('resumed')
  ) {
    iconName = 'check-circle-outline';
    iconColor = '#10B981';
    iconBg = '#ECFDF5';
    iconBorder = '#A7F3D0';
    primaryBtnBg = '#059669';
  } else if (
    lowerTitle.includes('error') ||
    lowerTitle.includes('failed') ||
    lowerTitle.includes('blocked') ||
    lowerTitle.includes('rejected') ||
    lowerTitle.includes('declined') ||
    lowerTitle.includes('delete')
  ) {
    iconName = 'alert-circle-outline';
    iconColor = '#EF4444';
    iconBg = '#FEF2F2';
    iconBorder = '#FECACA';
    primaryBtnBg = '#DC2626';
  } else if (
    lowerTitle.includes('warning') ||
    lowerTitle.includes('required') ||
    lowerTitle.includes('validation') ||
    lowerTitle.includes('decision') ||
    lowerTitle.includes('offline')
  ) {
    iconName = 'alert-outline';
    iconColor = '#D97706';
    iconBg = '#FFFBEB';
    iconBorder = '#FDE68A';
    primaryBtnBg = '#D97706';
  }

  const effectiveButtons: AlertButton[] =
    buttons && buttons.length > 0 ? buttons : [{ text: 'OK', style: 'default' }];

  const handleButtonPress = (btn: AlertButton) => {
    if (onDismiss) onDismiss();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress?.();
      }, 50);
    }
  };

  const handleBackdropPress = () => {
    if (cancelable && onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Icon */}
              <View style={[styles.iconCircle, { backgroundColor: iconBg, borderColor: iconBorder }]}>
                <Icon name={iconName} size={32} color={iconColor} />
              </View>

              {/* Title */}
              {title ? <Text style={styles.title}>{title}</Text> : null}

              {/* Message */}
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {/* Buttons */}
              <View style={effectiveButtons.length === 2 ? styles.buttonRow : styles.buttonCol}>
                {effectiveButtons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  let btnStyle = styles.primaryBtn;
                  let btnTextStyle = styles.primaryBtnText;
                  let dynamicBg = { backgroundColor: primaryBtnBg };

                  if (isCancel) {
                    btnStyle = styles.cancelBtn;
                    btnTextStyle = styles.cancelBtnText;
                    dynamicBg = { backgroundColor: '#F1F5F9' };
                  } else if (isDestructive) {
                    dynamicBg = { backgroundColor: '#DC2626' };
                  }

                  return (
                    <TouchableOpacity
                      key={`alert_btn_${index}`}
                      style={[
                        styles.buttonBase,
                        btnStyle,
                        dynamicBg,
                        effectiveButtons.length === 2 ? { flex: 1 } : null,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleButtonPress(btn)}
                    >
                      <Text style={[styles.btnTextBase, btnTextStyle]}>
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  buttonCol: {
    width: '100%',
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  buttonBase: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnTextBase: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryBtnText: {
    color: '#FFFFFF',
  },
  cancelBtnText: {
    color: '#475569',
  },
});
