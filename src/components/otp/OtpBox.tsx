import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, Platform } from 'react-native';
import { OTP_CONFIG } from './otpConfig';
import { OtpPhase } from './types';

interface OtpBoxProps {
  index: number;
  digit: string;
  isActive: boolean;
  phase: OtpPhase;
  gatherProgress: Animated.Value;
  colorProgress: Animated.Value;
  collapseProgress: Animated.Value;
}

const ROW_X_OFFSETS = [-87, -29, 29, 87];
const CIRCLE_OFFSETS = [
  { x: -OTP_CONFIG.ORBIT_RADIUS, y: 0 },
  { x: 0, y: -OTP_CONFIG.ORBIT_RADIUS },
  { x: OTP_CONFIG.ORBIT_RADIUS, y: 0 },
  { x: 0, y: OTP_CONFIG.ORBIT_RADIUS },
];

export const OtpBox: React.FC<OtpBoxProps> = React.memo(
  ({
    index,
    digit,
    isActive,
    phase,
    gatherProgress,
    colorProgress,
    collapseProgress,
  }) => {
    const caretAnim = useRef(new Animated.Value(0)).current;
    const digitScale = useRef(new Animated.Value(digit ? 1 : 0.7)).current;
    const digitOpacity = useRef(new Animated.Value(digit ? 1 : 0)).current;
    const prevDigit = useRef(digit);

    // Caret blink animation when box is active and empty
    useEffect(() => {
      let anim: Animated.CompositeAnimation | null = null;
      if (isActive && !digit && phase === 'typing') {
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(caretAnim, {
              toValue: 1,
              duration: OTP_CONFIG.TIMINGS.CARET_BLINK,
              useNativeDriver: true,
            }),
            Animated.timing(caretAnim, {
              toValue: 0,
              duration: OTP_CONFIG.TIMINGS.CARET_BLINK,
              useNativeDriver: true,
            }),
          ])
        );
        anim.start();
      } else {
        caretAnim.setValue(0);
      }
      return () => {
        anim?.stop();
      };
    }, [isActive, digit, phase, caretAnim]);

    // Pop animation on digit entry
    useEffect(() => {
      if (digit && !prevDigit.current) {
        digitScale.setValue(0.6);
        digitOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(digitScale, {
            toValue: 1,
            friction: 5,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.timing(digitOpacity, {
            toValue: 1,
            duration: OTP_CONFIG.TIMINGS.DIGIT_POP,
            useNativeDriver: true,
          }),
        ]).start();
      } else if (!digit && prevDigit.current) {
        digitScale.setValue(0.7);
        digitOpacity.setValue(0);
      }
      prevDigit.current = digit;
    }, [digit, digitScale, digitOpacity]);

    // Box position interpolations
    const translateX = gatherProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [ROW_X_OFFSETS[index], CIRCLE_OFFSETS[index].x],
    });

    const translateY = gatherProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, CIRCLE_OFFSETS[index].y],
    });

    const boxScale = collapseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });

    const boxOpacity = collapseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });

    const isError = phase === 'error';

    return (
      <Animated.View
        style={[
          styles.boxContainer,
          {
            opacity: boxOpacity,
            transform: [
              { translateX },
              { translateY },
              { scale: boxScale },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <View
          style={[
            styles.box,
            isActive && styles.boxActive,
            Boolean(digit) && styles.boxFilled,
            isError && styles.boxError,
          ]}
        >
          {digit ? (
            <Animated.Text
              style={[
                styles.digitText,
                isError && styles.digitTextError,
                {
                  opacity: digitOpacity,
                  transform: [{ scale: digitScale }],
                },
              ]}
            >
              {digit}
            </Animated.Text>
          ) : isActive && phase === 'typing' ? (
            <Animated.View
              style={[
                styles.caret,
                { opacity: caretAnim },
              ]}
            />
          ) : null}
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  boxContainer: {
    position: 'absolute',
    width: OTP_CONFIG.BOX_SIZE,
    height: OTP_CONFIG.BOX_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: OTP_CONFIG.BOX_SIZE,
    height: OTP_CONFIG.BOX_SIZE,
    borderRadius: OTP_CONFIG.BOX_RADIUS,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  boxActive: {
    borderColor: '#1D4ED8',
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#1D4ED8',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  boxFilled: {
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
  },
  boxError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  digitText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  digitTextError: {
    color: '#DC2626',
  },
  caret: {
    width: OTP_CONFIG.CARET_WIDTH,
    height: OTP_CONFIG.CARET_HEIGHT,
    backgroundColor: '#1D4ED8',
    borderRadius: 1,
  },
});
