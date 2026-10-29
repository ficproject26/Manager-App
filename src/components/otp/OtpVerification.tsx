import React, {
  useState,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { OTP_CONFIG } from './otpConfig';
import { OtpVerificationProps, OtpVerificationRef, OtpPhase } from './types';
import { OtpBox } from './OtpBox';
import { OrbitRing } from './OrbitRing';
import { SuccessBurst } from './SuccessBurst';
import { Checkmark } from './Checkmark';
import { triggerHaptic } from './haptics';

export const OtpVerification = React.memo(
  forwardRef<OtpVerificationRef, OtpVerificationProps>(
    (
      {
        length = 4,
        onComplete,
        verify,
        onVerified,
        phoneNumber = '+91 98765 •••• 10',
        title = 'Verify your mobile',
        subtitle,
      },
      ref
    ) => {
      const { width: windowWidth } = useWindowDimensions();
      const cardWidth = Math.min(windowWidth - 32, 360);

      const [phase, setPhase] = useState<OtpPhase>('typing');
      const [code, setCode] = useState('');

      const inputRef = useRef<TextInput>(null);

      // Core Animated Values
      const gatherProgress = useRef(new Animated.Value(0)).current;
      const orbitSpinProgress = useRef(new Animated.Value(0)).current;
      const colorProgress = useRef(new Animated.Value(0)).current;
      const collapseProgress = useRef(new Animated.Value(0)).current;
      const centerSquareScale = useRef(new Animated.Value(0)).current;
      const burstProgress = useRef(new Animated.Value(0)).current;
      const checkProgress = useRef(new Animated.Value(0)).current;
      const textSuccessProgress = useRef(new Animated.Value(0)).current;
      const shakeX = useRef(new Animated.Value(0)).current;

      // Auto-focus on mount
      useEffect(() => {
        const timer = setTimeout(() => {
          inputRef.current?.focus();
        }, 200);
        return () => clearTimeout(timer);
      }, []);

      // Reset animation state
      const reset = useCallback(() => {
        gatherProgress.setValue(0);
        orbitSpinProgress.setValue(0);
        colorProgress.setValue(0);
        collapseProgress.setValue(0);
        centerSquareScale.setValue(0);
        burstProgress.setValue(0);
        checkProgress.setValue(0);
        textSuccessProgress.setValue(0);
        shakeX.setValue(0);
        setCode('');
        setPhase('typing');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }, [
        gatherProgress,
        orbitSpinProgress,
        colorProgress,
        collapseProgress,
        centerSquareScale,
        burstProgress,
        checkProgress,
        textSuccessProgress,
        shakeX,
      ]);

      // Error shake
      const triggerError = useCallback(() => {
        triggerHaptic('notificationError');
        setPhase('error');

        Animated.sequence([
          Animated.timing(shakeX, { toValue: -12, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 12, duration: 65, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 8, duration: 60, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -4, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start(() => {
          setCode('');
          setPhase('typing');
          inputRef.current?.focus();
        });
      }, [shakeX]);

      // Success animation sequence
      const startSuccessAnimation = useCallback(() => {
        setPhase('gather');

        // Step 1: Gather to circle
        Animated.timing(gatherProgress, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setPhase('orbit');
          // Step 2: Spin and change color
          Animated.parallel([
            Animated.timing(orbitSpinProgress, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(colorProgress, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setPhase('collapse');
            // Step 3: Collapse to center
            Animated.timing(collapseProgress, {
              toValue: 1,
              duration: 350,
              useNativeDriver: true,
            }).start(() => {
              setPhase('success');
              triggerHaptic('notificationSuccess');

              // Step 4: Success burst, checkmark & header text
              Animated.parallel([
                Animated.spring(centerSquareScale, {
                  toValue: 1,
                  friction: 6,
                  tension: 160,
                  useNativeDriver: true,
                }),
                Animated.timing(checkProgress, {
                  toValue: 1,
                  duration: 350,
                  useNativeDriver: true,
                }),
                Animated.timing(burstProgress, {
                  toValue: 1,
                  duration: 650,
                  useNativeDriver: true,
                }),
                Animated.timing(textSuccessProgress, {
                  toValue: 1,
                  duration: 350,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                onVerified?.();
              });
            });
          });
        });
      }, [
        gatherProgress,
        orbitSpinProgress,
        colorProgress,
        collapseProgress,
        centerSquareScale,
        checkProgress,
        burstProgress,
        textSuccessProgress,
        onVerified,
      ]);

      // Full code submission
      const handleFullCode = useCallback(
        async (finalCode: string) => {
          Keyboard.dismiss();
          onComplete?.(finalCode);

          if (verify) {
            setPhase('verifying');
            try {
              const isValid = await verify(finalCode);
              if (isValid) {
                startSuccessAnimation();
              } else {
                triggerError();
              }
            } catch {
              triggerError();
            }
          } else {
            startSuccessAnimation();
          }
        },
        [onComplete, verify, startSuccessAnimation, triggerError]
      );

      // Handle input text changes
      const handleTextChange = useCallback(
        (text: string) => {
          if (phase !== 'typing') return;

          const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
          setCode(cleaned);

          if (cleaned.length > code.length) {
            triggerHaptic('impactLight');
          }

          if (cleaned.length === length) {
            handleFullCode(cleaned);
          }
        },
        [phase, length, code.length, handleFullCode]
      );

      // Imperative Handle
      useImperativeHandle(
        ref,
        () => ({
          reset,
          replay: () => {
            const currentCode = code.length === length ? code : '4719';
            reset();
            setTimeout(() => {
              setCode(currentCode);
              handleFullCode(currentCode);
            }, 120);
          },
          focus: () => {
            inputRef.current?.focus();
          },
          setCode: (newCode: string) => {
            const cleaned = newCode.replace(/[^0-9]/g, '').slice(0, length);
            setCode(cleaned);
            if (cleaned.length === length) {
              handleFullCode(cleaned);
            }
          },
        }),
        [reset, code, length, handleFullCode]
      );

      // Digits array
      const digits = Array.from({ length }, (_, i) => code[i] || '');
      const activeIndex = Math.min(code.length, length - 1);

      // Spin rotation
      const spinRotate = orbitSpinProgress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '450deg'],
      });

      // Headers opacity
      const defaultHeaderOpacity = textSuccessProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      });
      const successHeaderOpacity = textSuccessProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      });
      const successHeaderTranslateY = textSuccessProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [6, 0],
      });

      return (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
            <View style={[styles.card, { width: cardWidth }]}>
              {/* Drag Handle Pill */}
              <View style={styles.dragPill} />

              {/* Title & Subtitle Header Container */}
              <View style={styles.headerContainer}>
                {/* Default Header */}
                <Animated.View
                  style={[
                    styles.headerContent,
                    { opacity: defaultHeaderOpacity },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>
                    {subtitle ? (
                      subtitle
                    ) : (
                      <>
                        Enter the {length}-digit code sent to{' '}
                        <Text style={styles.phoneHighlight}>{phoneNumber}</Text>
                      </>
                    )}
                  </Text>
                </Animated.View>

                {/* Success Header */}
                <Animated.View
                  style={[
                    styles.headerContent,
                    styles.absoluteHeader,
                    {
                      opacity: successHeaderOpacity,
                      transform: [{ translateY: successHeaderTranslateY }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  <Text style={[styles.title, styles.titleSuccess]}>
                    Verified successfully
                  </Text>
                  <Text style={styles.subtitle}>
                    Your number has been verified. Redirecting...
                  </Text>
                </Animated.View>
              </View>

              {/* Animation Stage */}
              <Animated.View
                style={[
                  styles.stageContainer,
                  { transform: [{ translateX: shakeX }] },
                ]}
                pointerEvents="none"
              >
                {/* Rotating Orbit Ring & Digit Boxes */}
                <Animated.View
                  style={[
                    styles.orbitWrapper,
                    { transform: [{ rotate: spinRotate }] },
                  ]}
                >
                  <OrbitRing
                    gatherProgress={gatherProgress}
                    colorProgress={colorProgress}
                    collapseProgress={collapseProgress}
                  />

                  {/* 4 Digit Boxes */}
                  {digits.map((digit, index) => (
                    <OtpBox
                      key={index}
                      index={index}
                      digit={digit}
                      isActive={index === activeIndex}
                      phase={phase}
                      gatherProgress={gatherProgress}
                      colorProgress={colorProgress}
                      collapseProgress={collapseProgress}
                    />
                  ))}
                </Animated.View>

                {/* Success State Center Elements */}
                {phase === 'success' && (
                  <View style={styles.successWrapper} pointerEvents="none">
                    <SuccessBurst progress={burstProgress} />

                    <Animated.View
                      style={[
                        styles.centerSquare,
                        { transform: [{ scale: centerSquareScale }] },
                      ]}
                    >
                      <Checkmark progress={checkProgress} />
                    </Animated.View>
                  </View>
                )}
              </Animated.View>

              {/* Real TextInput for Native Keyboard & SMS Autofill */}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={code}
                onChangeText={handleTextChange}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={length}
                caretHidden
                editable={phase === 'typing'}
                accessibilityLabel="OTP Code Input"
              />
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      );
    }
  )
);

const styles = StyleSheet.create({
  keyboardAvoid: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: OTP_CONFIG.COLORS.bgCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.07,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  dragPill: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: OTP_CONFIG.COLORS.dragHandle,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerContainer: {
    minHeight: 54,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  absoluteHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  title: {
    color: OTP_CONFIG.COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-medium' },
    }),
  },
  titleSuccess: {
    color: OTP_CONFIG.COLORS.accentEmerald,
  },
  subtitle: {
    color: OTP_CONFIG.COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif' },
    }),
  },
  phoneHighlight: {
    color: OTP_CONFIG.COLORS.textPhone,
    fontWeight: '500',
  },
  stageContainer: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitWrapper: {
    width: 220,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerSquare: {
    width: OTP_CONFIG.CENTER_SQUARE_SIZE,
    height: OTP_CONFIG.CENTER_SQUARE_SIZE,
    borderRadius: OTP_CONFIG.BOX_RADIUS,
    borderWidth: 1.5,
    borderColor: OTP_CONFIG.COLORS.accentEmerald,
    backgroundColor: OTP_CONFIG.COLORS.accentFill,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: OTP_CONFIG.COLORS.accentEmerald,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
    }),
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
  },
});
