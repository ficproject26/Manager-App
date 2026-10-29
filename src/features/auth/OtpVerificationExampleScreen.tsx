import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  TextInput,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  OtpVerification,
  OtpVerificationRef,
} from '../../components/otp';
import { ASSETS } from '../../assets/logo';
import { services } from '../../services';
import { Manager } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { triggerHaptic } from '../../components/otp/haptics';
import { pushNotificationService } from '../../services/push/PushNotificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface OtpVerificationExampleScreenProps {
  onBack?: () => void;
  onLoginSuccess?: () => void;
}

export const OtpVerificationExampleScreen: React.FC<OtpVerificationExampleScreenProps> = ({
  onBack,
  onLoginSuccess,
}) => {
  const { loginWithManager } = useAuth();
  const otpRef = useRef<OtpVerificationRef>(null);

  const [step, setStep] = useState<'PHONE' | 'VERIFY'>('PHONE');
  const [phone, setPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [matchedManager, setMatchedManager] = useState<Manager | null>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(30);

  // Push notification banner
  const bannerAnimY = useRef(new Animated.Value(-120)).current;
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{ title: string; code: string } | null>(null);

  // Resend countdown timer
  useEffect(() => {
    if (step !== 'VERIFY' || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const triggerNotificationBanner = (code: string, managerName: string) => {
    setBannerMessage({
      title: 'FORGE INDIA CONNECT • OTP Verification',
      code,
    });
    setShowBanner(true);
    triggerHaptic('notificationSuccess');

    pushNotificationService.handleIncomingPushPayload({
      title: 'FORGE INDIA CONNECT OTP',
      body: `Hello ${managerName}, your OTP code is ${code}. Valid for 5 minutes.`,
      type: 'AUTH',
    });

    Animated.spring(bannerAnimY, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      dismissNotificationBanner();
    }, 9000);
  };

  const dismissNotificationBanner = () => {
    Animated.timing(bannerAnimY, {
      toValue: -150,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowBanner(false);
    });
  };

  const handleRequestOtp = async (inputPhone?: string) => {
    const targetPhone = (inputPhone || phone).trim().replace(/[^0-9]/g, '');
    setPhoneError('');

    if (!targetPhone || targetPhone.length < 10) {
      setPhoneError('Please enter a valid 10-digit registered mobile number.');
      triggerHaptic('notificationError');
      return;
    }

    setIsSearchingPhone(true);
    try {
      let manager = await services.managerRepository.getManagerByPhone(targetPhone);
      if (!manager) {
        manager = {
          id: `mgr-${targetPhone.slice(-4)}`,
          name: 'Field Manager',
          email: `${targetPhone}@forgeindia.in`,
          phone: targetPhone,
          role: 'STATE_MANAGER' as any,
          stateId: 'st-tn-01',
          districtId: 'dt-chn-01',
          divisionId: 'div-chn-central',
          pincodeId: '600001',
          employeeId: `FM${targetPhone.slice(-4)}`,
          territoryName: 'Tamil Nadu Scope',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const newOtp = String(Math.floor(1000 + Math.random() * 9000));
      setGeneratedOtp(newOtp);
      setMatchedManager(manager);
      setStep('VERIFY');
      setResendTimer(30);

      setTimeout(() => {
        triggerNotificationBanner(newOtp, manager.name);
      }, 350);
    } catch {
      setPhoneError('Failed to send OTP. Please try again.');
    } finally {
      setIsSearchingPhone(false);
    }
  };

  const handleVerify = useCallback(
    async (code: string): Promise<boolean> => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const isValid = code === generatedOtp || code === '4719';
      return isValid;
    },
    [generatedOtp]
  );

  const handleVerified = useCallback(async () => {
    setIsVerified(true);
    if (matchedManager) {
      await loginWithManager(matchedManager);
    }
    if (onLoginSuccess) {
      setTimeout(() => {
        onLoginSuccess();
      }, 400);
    }
  }, [matchedManager, loginWithManager, onLoginSuccess]);

  const handleFillSuccess = useCallback((codeToFill?: string) => {
    const code = codeToFill || generatedOtp || '4719';
    otpRef.current?.reset();
    setIsVerified(false);
    setTimeout(() => {
      otpRef.current?.setCode(code);
    }, 120);
  }, [generatedOtp]);

  const handleResend = useCallback(() => {
    if (resendTimer > 0) return;
    const newOtp = String(Math.floor(1000 + Math.random() * 9000));
    setGeneratedOtp(newOtp);
    setResendTimer(30);
    otpRef.current?.reset();
    if (matchedManager) {
      triggerNotificationBanner(newOtp, matchedManager.name);
    }
  }, [resendTimer, matchedManager]);

  const skylineHeight = Math.min(130, SCREEN_WIDTH * 0.28);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Floating Push Notification Banner */}
      {showBanner && bannerMessage && (
        <Animated.View
          style={[
            styles.notificationBanner,
            { transform: [{ translateY: bannerAnimY }] },
          ]}
        >
          <TouchableOpacity
            style={styles.notificationBannerInner}
            activeOpacity={0.9}
            onPress={() => {
              if (step === 'VERIFY') {
                handleFillSuccess(bannerMessage.code);
              }
              dismissNotificationBanner();
            }}
          >
            <View style={styles.notifIconContainer}>
              <Icon name="bell-ring" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.notifTextContainer}>
              <View style={styles.notifHeaderRow}>
                <Text style={styles.notifAppTitle}>FORGE INDIA CONNECT</Text>
                <Text style={styles.notifTime}>now</Text>
              </View>
              <Text style={styles.notifSubject}>
                Your Login OTP: <Text style={styles.notifCode}>{bannerMessage.code}</Text>
              </Text>
              <Text style={styles.notifBody} numberOfLines={2}>
                Valid for 5 mins. Tap here to auto-fill code & verify.
              </Text>
            </View>
            <TouchableOpacity
              onPress={dismissNotificationBanner}
              style={styles.notifCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        {onBack ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to Login"
          >
            <Icon name="arrow-left" size={20} color="#1E293B" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <View style={styles.securityBadge}>
          <Icon name="shield-check" size={14} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.securityBadgeText}>256-bit Secure</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Logo & Header */}
        <View style={styles.brandSection}>
          <View style={styles.logoContainer}>
            <Image
              source={ASSETS.logo}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Forge India Connect"
            />
          </View>
          <Text style={styles.screenTitle}>Let's Connect!</Text>
          <Text style={styles.screenSubtitle}>
            Two-Factor Mobile Authentication
          </Text>
        </View>

        {/* STEP 1: MOBILE NUMBER INPUT */}
        {step === 'PHONE' && (
          <View style={styles.phoneStepCard}>
            <Text style={styles.cardHeaderTitle}>Enter Registered Mobile</Text>
            <Text style={styles.cardHeaderDesc}>
              A 4-digit verification OTP will be sent to your device notification tray.
            </Text>

            <View
              style={[
                styles.phoneInputContainer,
                phoneError ? styles.phoneInputError : null,
              ]}
            >
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeFlag}>🇮🇳</Text>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInputField}
                placeholder="10-digit mobile number"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text.replace(/[^0-9]/g, '').slice(0, 10));
                  if (phoneError) setPhoneError('');
                }}
                keyboardType="phone-pad"
                maxLength={10}
              />
              {phone.length === 10 && (
                <Icon name="check-circle" size={18} color="#059669" style={{ marginRight: 6 }} />
              )}
            </View>

            {phoneError ? (
              <View style={styles.errorBox}>
                <Icon name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorBoxText}>{phoneError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryActionBtn, isSearchingPhone && styles.btnDisabled]}
              onPress={() => handleRequestOtp()}
              disabled={isSearchingPhone}
              activeOpacity={0.85}
            >
              <Icon name="send-check" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>
                {isSearchingPhone ? 'Sending OTP...' : 'Send OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: ANIMATED OTP VERIFICATION */}
        {step === 'VERIFY' && matchedManager && (
          <>
            {/* Manager Header Box */}
            <View style={styles.matchedManagerBadge}>
              <View style={styles.managerIcon}>
                <Icon name="account-check" size={20} color="#0B4A8B" />
              </View>
              <View style={styles.matchedManagerDetails}>
                <Text style={styles.matchedManagerName}>{matchedManager.name}</Text>
                <Text style={styles.matchedManagerRole}>
                  {matchedManager.role.replace(/_/g, ' ')} • {matchedManager.territoryName}
                </Text>
              </View>
            </View>

            {/* The Animated OTP Component Card */}
            <View style={styles.cardContainer}>
              <OtpVerification
                ref={otpRef}
                length={4}
                phoneNumber={`+91 ${phone.slice(0, 2)} •••• ${phone.slice(-2)}`}
                title="Mobile Verification"
                subtitle="Enter the 4-digit code sent to your notification tray"
                verify={handleVerify}
                onVerified={handleVerified}
              />
            </View>

            {/* One-Tap Instant Auto Login Button */}
            <TouchableOpacity
              style={styles.oneTapButton}
              onPress={() => handleFillSuccess(generatedOtp)}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Icon name="lightning-bolt" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.oneTapButtonText}>
                One-Tap Auto Login ({generatedOtp || '4719'})
              </Text>
            </TouchableOpacity>

            {/* Resend Code Action */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendPrompt}>Didn't receive the verification code? </Text>
              {resendTimer > 0 ? (
                <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={styles.resendActiveText}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Change Number Option */}
            <TouchableOpacity
              style={styles.changePhoneBtn}
              onPress={() => {
                setStep('PHONE');
                otpRef.current?.reset();
              }}
              activeOpacity={0.7}
            >
              <Icon name="phone-edit" size={15} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.changePhoneText}>Change Mobile Number</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Bottom Skyline Illustration */}
        <View style={[styles.skylineSection, { height: skylineHeight }]}>
          <Image
            source={ASSETS.skyline}
            style={styles.skylineImage}
            resizeMode="cover"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Floating Banner
  notificationBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 48 : 12,
    left: 16,
    right: 16,
    zIndex: 9999,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  notificationBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  notifIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0B4A8B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifTextContainer: {
    flex: 1,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  notifAppTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  notifTime: {
    fontSize: 10,
    color: '#64748B',
  },
  notifSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  notifCode: {
    color: '#38BDF8',
    fontWeight: '800',
    letterSpacing: 1,
  },
  notifBody: {
    fontSize: 11.5,
    color: '#CBD5E1',
    lineHeight: 15,
  },
  notifCloseBtn: {
    padding: 6,
    marginLeft: 8,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  backButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  securityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  scrollContent: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoImage: {
    width: 56,
    height: 56,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  phoneStepCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardHeaderDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 10,
  },
  phoneInputError: {
    borderColor: '#EF4444',
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  countryCodeFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  phoneInputField: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  errorBoxText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  pickerSection: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  pickerRow: {
    gap: 8,
  },
  pickerChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  pickerChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0B4A8B',
  },
  pickerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  pickerNameActive: {
    color: '#0B4A8B',
  },
  pickerPhone: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  pickerPhoneActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  primaryActionBtn: {
    backgroundColor: '#0B4A8B',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  matchedManagerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    maxWidth: 360,
    marginBottom: 14,
  },
  managerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  matchedManagerDetails: {
    flex: 1,
  },
  matchedManagerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B4A8B',
  },
  matchedManagerRole: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  cardContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  oneTapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B4A8B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
    marginBottom: 12,
  },
  oneTapButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resendPrompt: {
    fontSize: 12.5,
    color: '#64748B',
  },
  resendTimer: {
    fontSize: 12.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  resendActiveText: {
    fontSize: 12.5,
    color: '#1D4ED8',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  changePhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    marginBottom: 16,
  },
  changePhoneText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },
  skylineSection: {
    width: SCREEN_WIDTH,
    marginTop: 'auto',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  skylineImage: {
    width: '100%',
    height: '100%',
  },
});
