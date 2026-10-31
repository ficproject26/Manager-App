import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
  TextInput,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { ASSETS } from '../../assets/logo';
import { services } from '../../services';
import { Manager } from '../../types';
import { OtpVerification, OtpVerificationRef } from '../../components/otp';
import { triggerHaptic } from '../../components/otp/haptics';
import { pushNotificationService } from '../../services/push/PushNotificationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface LoginScreenProps {
  onForgotPassword?: () => void;
  onRegister?: () => void;
  onOtpLogin?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onForgotPassword,
  onRegister,
  onOtpLogin,
}) => {
  const { login, loginWithManager, sendOtp, verifyOtp, isLoading, authError, clearAuthError } = useAuth();

  // Mode: 'EMAIL' | 'OTP_PHONE' | 'OTP_VERIFY'
  const [activeTab, setActiveTab] = useState<'EMAIL' | 'OTP'>('OTP');
  const [otpStep, setOtpStep] = useState<'PHONE' | 'VERIFY'>('PHONE');

  // Email form state
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [usernameError, setUsernameError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'phone' | null>(null);

  // OTP form state
  const [phone, setPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [matchedManager, setMatchedManager] = useState<Manager | null>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(30);

  // OTP component ref
  const otpRef = useRef<OtpVerificationRef>(null);

  // Notification banner animation
  const bannerAnimY = useRef(new Animated.Value(-120)).current;
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{ title: string; body: string; code: string } | null>(null);

  // Resend countdown timer
  useEffect(() => {
    if (otpStep !== 'VERIFY' || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep, resendTimer]);

  // Show animated top push notification banner
  const triggerNotificationBanner = (code: string, managerName: string) => {
    setBannerMessage({
      title: 'FORGE INDIA CONNECT • OTP Verification',
      body: `Hello ${managerName}, your login OTP code is ${code}. Valid for 5 minutes. Tap to auto-fill.`,
      code,
    });
    setShowBanner(true);
    triggerHaptic('notificationSuccess');

    // Register with push service
    pushNotificationService.handleIncomingPushPayload({
      title: 'FORGE INDIA CONNECT OTP',
      body: `Your OTP is ${code}. Valid for 5 minutes.`,
      type: 'AUTH',
    });

    Animated.spring(bannerAnimY, {
      toValue: 0,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();

    // Auto dismiss banner after 9 seconds
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

  // Email form validation
  const validateEmailForm = (): boolean => {
    let isValid = true;
    setUsernameError('');
    setPasswordError('');

    if (!username.trim()) {
      setUsernameError('Email or username is required.');
      isValid = false;
    } else if (username.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username.trim())) {
      setUsernameError('Please enter a valid email address.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      isValid = false;
    }

    return isValid;
  };

  const handleEmailLogin = async () => {
    if (authError) clearAuthError();
    if (!validateEmailForm()) return;
    await login(username.trim(), password);
  };

  // Dispatch OTP via real backend
  const handleRequestOtp = async (inputPhone?: string) => {
    const targetPhone = (inputPhone || phone).trim().replace(/[^0-9]/g, '');
    setPhoneError('');
    if (authError) clearAuthError();

    if (!targetPhone || targetPhone.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      triggerHaptic('notificationError');
      return;
    }

    setIsSearchingPhone(true);
    try {
      const result = await sendOtp(targetPhone);
      if (result.success) {
        if (result.otp) {
          setGeneratedOtp(result.otp);
          triggerNotificationBanner(result.otp, 'Manager');
        }
        setOtpStep('VERIFY');
        setResendTimer(30);
      } else {
        setPhoneError(result.message || 'Mobile number is not registered as manager.');
        triggerHaptic('notificationError');
      }
    } catch {
      setPhoneError('Failed to send OTP. Please check network connection.');
    } finally {
      setIsSearchingPhone(false);
    }
  };

  // Verification handler passed to the animated OtpVerification component
  const handleOtpVerify = useCallback(
    async (code: string): Promise<boolean> => {
      const targetPhone = phone.trim().replace(/[^0-9]/g, '');
      const result = await verifyOtp(targetPhone, code);
      if (result.success) {
        return true;
      } else {
        triggerHaptic('notificationError');
        return false;
      }
    },
    [phone, verifyOtp]
  );

  // Successful verification callback after animations finish
  const handleOtpVerified = useCallback(async () => {
    // Navigation automatically proceeds via AuthContext isAuthenticated state change
  }, []);

  // Quick fill OTP action from banner or helper button
  const handleAutoFillOtp = (codeToFill?: string) => {
    if (codeToFill) {
      otpRef.current?.reset();
      setTimeout(() => {
        otpRef.current?.setCode(codeToFill);
      }, 150);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    const targetPhone = phone.trim().replace(/[^0-9]/g, '');
    const result = await sendOtp(targetPhone);
    if (result.success) {
      setResendTimer(30);
      otpRef.current?.reset();
    } else {
      setPhoneError(result.message || 'Failed to resend OTP.');
    }
  };

  const skylineHeight = Math.min(170, SCREEN_WIDTH * (350 / 841));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* ── Interactive Native-Style Push Notification Banner ── */}
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
              if (otpStep === 'VERIFY') {
                handleAutoFillOtp(bannerMessage.code);
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
              <Text style={styles.notifSubject}>Your Login OTP: <Text style={styles.notifCode}>{bannerMessage.code}</Text></Text>
              <Text style={styles.notifBody} numberOfLines={2}>
                Valid for 5 mins. Tap to auto-fill code & verify.
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

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Top Header: Soft Cream Accent + Tagline ── */}
          <View style={styles.topSection}>
            <View style={styles.accentCircle} />

            <View style={styles.taglineContainer}>
              <Text style={styles.taglineLight}>Empowering</Text>
              <Text style={styles.taglineLight}>Local Businesses</Text>
              <Text style={styles.taglineBold}>A Stronger Tomorrow</Text>
              <View style={styles.taglineUnderline} />
            </View>
          </View>

          {/* ── Official Forge India Connect Logo ── */}
          <View style={styles.logoSection}>
            <Image
              source={ASSETS.logo}
              style={styles.logoImage}
              resizeMode="contain"
              accessibilityLabel="Forge India Connect Logo"
            />
          </View>

          {/* ── Heading / Welcome Text ── */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Let's Connect!</Text>
            <Text style={styles.welcomeSubtitle}>Manage. Grow. Make an Impact.</Text>
          </View>

          {/* ── Mode Selection Tabs (Email Login / Mobile OTP) ── */}
          {otpStep !== 'VERIFY' && (
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'EMAIL' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('EMAIL');
                  if (authError) clearAuthError();
                }}
                activeOpacity={0.8}
              >
                <Icon
                  name="email-outline"
                  size={17}
                  color={activeTab === 'EMAIL' ? '#0B4A8B' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'EMAIL' && styles.tabButtonTextActive,
                  ]}
                >
                  Email Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'OTP' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('OTP');
                  setOtpStep('PHONE');
                  if (authError) clearAuthError();
                }}
                activeOpacity={0.8}
              >
                <Icon
                  name="cellphone-key"
                  size={17}
                  color={activeTab === 'OTP' ? '#0B4A8B' : '#64748B'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'OTP' && styles.tabButtonTextActive,
                  ]}
                >
                  Mobile OTP
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Form Section ── */}
          <View style={styles.formSection}>
            {/* Global Auth Error Banner */}
            {authError ? (
              <View style={styles.errorAlert} accessibilityRole="alert">
                <Icon name="alert-circle-outline" size={18} color={theme.colors.error} />
                <Text style={styles.errorAlertText}>{authError}</Text>
              </View>
            ) : null}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODE 1: EMAIL & PASSWORD LOGIN                             */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'EMAIL' && (
              <>
                {/* Email / Manager ID Input */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'email' && styles.inputFocused,
                    usernameError ? styles.inputError : null,
                  ]}
                >
                  <Icon
                    name="email-outline"
                    size={20}
                    color={focusedField === 'email' ? '#0B4A8B' : '#5A6882'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Email / Manager ID"
                    placeholderTextColor="#94A3B8"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      if (usernameError) setUsernameError('');
                      if (authError) clearAuthError();
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    editable={!isLoading}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                {usernameError ? (
                  <Text style={styles.fieldError}>{usernameError}</Text>
                ) : null}

                {/* Password Input */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'password' && styles.inputFocused,
                    passwordError ? styles.inputError : null,
                  ]}
                >
                  <Icon
                    name="lock-outline"
                    size={20}
                    color={focusedField === 'password' ? '#0B4A8B' : '#5A6882'}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.inputField}
                    placeholder="Password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) setPasswordError('');
                      if (authError) clearAuthError();
                    }}
                    secureTextEntry={!isPasswordVisible}
                    returnKeyType="done"
                    onSubmitEditing={handleEmailLogin}
                    editable={!isLoading}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                    style={styles.eyeButton}
                    accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
                  >
                    <Icon
                      name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#5A6882"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                ) : null}

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.forgotPasswordBtn}
                  activeOpacity={0.7}
                  onPress={onForgotPassword}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot Password"
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleEmailLogin}
                  disabled={isLoading}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Login"
                >
                  <Text style={styles.loginButtonText}>
                    {isLoading ? 'Authenticating...' : 'Login'}
                  </Text>
                  {!isLoading && (
                    <Icon name="arrow-right" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>

                {/* Registration Card */}
                {onRegister && (
                  <TouchableOpacity
                    style={styles.registerCard}
                    activeOpacity={0.8}
                    onPress={onRegister}
                  >
                    <View style={styles.registerCardLeft}>
                      <View style={styles.registerIconBox}>
                        <Icon name="account-plus-outline" size={22} color="#1D4ED8" />
                      </View>
                      <View style={styles.registerCardText}>
                        <Text style={styles.registerCardTitle}>New Territory Manager?</Text>
                        <Text style={styles.registerCardSubtitle}>Register your account here</Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={20} color="#1D4ED8" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODE 2 - STEP 1: MOBILE NUMBER INPUT                        */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'OTP' && otpStep === 'PHONE' && (
              <View style={styles.otpPhoneSection}>
                <Text style={styles.otpPromptTitle}>Enter Registered Mobile Number</Text>
                <Text style={styles.otpPromptSubtitle}>
                  We will check local registration and send a 4-digit verification code to your device.
                </Text>

                {/* Phone Input with +91 Prefix */}
                <View
                  style={[
                    styles.inputContainer,
                    focusedField === 'phone' && styles.inputFocused,
                    phoneError ? styles.inputError : null,
                  ]}
                >
                  <View style={styles.countryCodeBadge}>
                    <Text style={styles.countryCodeFlag}>🇮🇳</Text>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.inputField}
                    placeholder="10-digit mobile number"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text.replace(/[^0-9]/g, '').slice(0, 10));
                      if (phoneError) setPhoneError('');
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    returnKeyType="done"
                    onSubmitEditing={() => handleRequestOtp()}
                    editable={!isSearchingPhone}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {phone.length === 10 && (
                    <Icon name="check-circle" size={18} color="#059669" style={{ marginRight: 6 }} />
                  )}
                </View>

                {phoneError ? (
                  <View style={styles.phoneErrorBox}>
                    <Icon name="alert-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.phoneErrorText}>{phoneError}</Text>
                  </View>
                ) : null}

                {/* Send OTP Button */}
                <TouchableOpacity
                  style={[styles.loginButton, isSearchingPhone && styles.loginButtonDisabled]}
                  onPress={() => handleRequestOtp()}
                  disabled={isSearchingPhone}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                >
                  <Icon name="send-check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.loginButtonText}>
                    {isSearchingPhone ? 'Sending OTP...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>

                {/* Back to Email Login button */}
                <TouchableOpacity
                  style={styles.backToEmailBtn}
                  onPress={() => setActiveTab('EMAIL')}
                  activeOpacity={0.7}
                >
                  <Icon name="arrow-left" size={16} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.backToEmailText}>Back to Email Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* MODE 2 - STEP 2: ANIMATED OTP VALIDATION & LOGIN            */}
            {/* ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'OTP' && otpStep === 'VERIFY' && (
              <View style={styles.otpVerifyContainer}>
                {/* Manager Greeting Card */}
                {matchedManager ? (
                  <View style={styles.managerInfoCard}>
                    <View style={styles.managerAvatarBox}>
                      <Icon name="account-tie" size={24} color="#0B4A8B" />
                    </View>
                    <View style={styles.managerInfoText}>
                      <Text style={styles.managerWelcome}>Logging in as</Text>
                      <Text style={styles.managerName}>{matchedManager.name}</Text>
                      <Text style={styles.managerRole}>
                        {matchedManager.role.replace(/_/g, ' ')} • {matchedManager.territoryName}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {/* The Animated OTP Verification Component */}
                <View style={styles.otpCardWrapper}>
                  <OtpVerification
                    ref={otpRef}
                    length={6}
                    phoneNumber={`+91 ${phone.slice(0, 2)} •••• ${phone.slice(-2)}`}
                    title="Enter Verification Code"
                    subtitle="6-digit code sent via SMS/notification"
                    verify={handleOtpVerify}
                    onVerified={handleOtpVerified}
                  />
                </View>

                {/* Instant Quick Auto-Fill OTP Button */}
                {generatedOtp ? (
                  <TouchableOpacity
                    style={styles.autoFillOtpBtn}
                    onPress={() => handleAutoFillOtp(generatedOtp)}
                    activeOpacity={0.8}
                  >
                    <Icon name="lightning-bolt" size={18} color="#0B4A8B" style={{ marginRight: 6 }} />
                    <Text style={styles.autoFillOtpBtnText}>
                      Quick Auto-Fill ({generatedOtp})
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {/* Resend & Change Phone Controls */}
                <View style={styles.otpActionsRow}>
                  <View style={styles.resendWrapper}>
                    {resendTimer > 0 ? (
                      <Text style={styles.resendTimerText}>Resend OTP in {resendTimer}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleResendOtp} activeOpacity={0.7}>
                        <Text style={styles.resendActiveBtn}>Resend OTP Notification</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.changeNumberBtn}
                    onPress={() => {
                      setOtpStep('PHONE');
                      otpRef.current?.reset();
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="phone-edit-outline" size={15} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.changeNumberText}>Change Number</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Bottom City Skyline Illustration Artwork ── */}
          <View style={styles.skylineSection}>
            <Image
              source={ASSETS.skyline}
              style={[styles.skylineImage, { height: skylineHeight }]}
              resizeMode="contain"
              accessibilityLabel="City Skyline Illustration"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  // ── Floating Push Notification Banner ──
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

  // ── Top Header Section ──
  topSection: {
    height: 75,
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 24,
    paddingTop: 10,
  },
  accentCircle: {
    position: 'absolute',
    top: -100,
    left: -70,
    width: '75%',
    maxWidth: 270,
    height: 250,
    borderRadius: 135,
    backgroundColor: '#FEF4D8',
    opacity: 0.85,
  },
  taglineContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  taglineLight: {
    fontSize: 12,
    fontWeight: '400',
    color: '#64748B',
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  taglineBold: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 16,
    letterSpacing: -0.2,
  },
  taglineUnderline: {
    width: 36,
    height: 3,
    backgroundColor: '#F5A623',
    borderRadius: 2,
    marginTop: 5,
  },

  // ── Logo Section ──
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  logoImage: {
    width: '60%',
    maxWidth: 200,
    height: undefined,
    aspectRatio: 220 / 140,
    resizeMode: 'contain',
  },

  // ── Heading / Welcome ──
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0A1329',
    letterSpacing: -0.6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748B',
    marginTop: 4,
    letterSpacing: -0.2,
  },

  // ── Mode Switcher Tab Bar ──
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 28,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0B4A8B',
    fontWeight: '700',
  },

  // ── Form Section ──
  formSection: {
    paddingHorizontal: 28,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#F1F4F8',
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  inputFocused: {
    borderColor: '#0B4A8B',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  eyeButton: {
    padding: 6,
  },
  fieldError: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
    marginTop: -8,
    marginBottom: 10,
    marginLeft: 14,
  },

  // ── Country Code Prefix ──
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

  // ── Forgot Password ──
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0B4A8B',
  },

  // ── Login Button ──
  loginButton: {
    backgroundColor: '#0B4A8B',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#0B4A8B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  otpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF3FB',
    borderRadius: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 4,
  },
  otpButtonText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0B4A8B',
  },

  // ── Register Card ──
  registerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: 4,
  },
  registerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  registerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  registerCardText: {
    flex: 1,
  },
  registerCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  registerCardSubtitle: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 1,
  },

  // ── OTP Phone Input Mode ──
  otpPhoneSection: {
    width: '100%',
  },
  otpPromptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  otpPromptSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 14,
  },
  phoneErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -6,
    marginBottom: 12,
  },
  phoneErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  demoPillsContainer: {
    marginBottom: 16,
  },
  demoPillsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  demoPillsScroll: {
    gap: 8,
  },
  demoPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 4,
  },
  demoPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#0B4A8B',
  },
  demoPillName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  demoPillNameActive: {
    color: '#0B4A8B',
  },
  demoPillPhone: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  demoPillPhoneActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  backToEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  backToEmailText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── OTP Verify Mode ──
  otpVerifyContainer: {
    alignItems: 'center',
    width: '100%',
  },
  managerInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  managerAvatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  managerInfoText: {
    flex: 1,
  },
  managerWelcome: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  managerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B4A8B',
  },
  managerRole: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  otpCardWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  autoFillOtpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF3FB',
    borderWidth: 1.5,
    borderColor: '#0B4A8B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 14,
  },
  autoFillOtpBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0B4A8B',
  },
  otpActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  resendWrapper: {},
  resendTimerText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  resendActiveBtn: {
    fontSize: 12.5,
    color: '#1D4ED8',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  changeNumberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  changeNumberText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '600',
  },

  // ── Bottom Skyline Illustration ──
  skylineSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  skylineImage: {
    width: '100%',
  },
});
