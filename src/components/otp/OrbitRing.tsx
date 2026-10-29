import React from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { OTP_CONFIG } from './otpConfig';

interface OrbitRingProps {
  gatherProgress: Animated.Value;
  colorProgress: Animated.Value;
  collapseProgress: Animated.Value;
}

export const OrbitRing: React.FC<OrbitRingProps> = React.memo(
  ({ gatherProgress, colorProgress, collapseProgress }) => {
    const ringDiameter = OTP_CONFIG.ORBIT_RADIUS * 2;

    const trackOpacity = gatherProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    const collapseOpacity = collapseProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });

    const glowOpacity = colorProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.85],
    });

    return (
      <View style={styles.container} pointerEvents="none">
        {/* Orbit circular track */}
        <Animated.View
          style={[
            styles.trackWrapper,
            {
              opacity: Animated.multiply(trackOpacity, collapseOpacity),
            },
          ]}
        >
          <Svg
            width={ringDiameter + 2}
            height={ringDiameter + 2}
            viewBox={`0 0 ${ringDiameter + 2} ${ringDiameter + 2}`}
          >
            <Circle
              cx={OTP_CONFIG.ORBIT_RADIUS + 1}
              cy={OTP_CONFIG.ORBIT_RADIUS + 1}
              r={OTP_CONFIG.ORBIT_RADIUS}
              fill="none"
              stroke={OTP_CONFIG.COLORS.orbitTrack}
              strokeWidth={1}
            />
          </Svg>
        </Animated.View>

        {/* Center dot glow */}
        <Animated.View style={[styles.centerGlow, { opacity: glowOpacity }]}>
          <Svg width={36} height={36} viewBox="0 0 36 36">
            <Defs>
              <RadialGradient id="centerDotGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor={OTP_CONFIG.COLORS.accentGlow} stopOpacity="0.8" />
                <Stop offset="50%" stopColor={OTP_CONFIG.COLORS.accentEmerald} stopOpacity="0.3" />
                <Stop offset="100%" stopColor={OTP_CONFIG.COLORS.accentEmerald} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={18} cy={18} r={18} fill="url(#centerDotGlow)" />
          </Svg>
        </Animated.View>

        {/* Small center dot */}
        <Animated.View
          style={[
            styles.centerDotWrapper,
            {
              opacity: Animated.multiply(trackOpacity, collapseOpacity),
            },
          ]}
        >
          <View
            style={[
              styles.centerDot,
              { backgroundColor: OTP_CONFIG.COLORS.centerDot },
            ]}
          />
          <Animated.View
            style={[
              styles.centerDot,
              styles.centerDotEmerald,
              { opacity: colorProgress },
            ]}
          />
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDotWrapper: {
    position: 'absolute',
    width: 6,
    height: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  centerDotEmerald: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: OTP_CONFIG.COLORS.accentEmerald,
  },
});
