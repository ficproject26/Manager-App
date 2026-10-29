import React from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { OTP_CONFIG } from './otpConfig';

interface CheckmarkProps {
  progress: Animated.Value;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const Checkmark: React.FC<CheckmarkProps> = React.memo(
  ({
    progress,
    size = OTP_CONFIG.CENTER_SQUARE_SIZE,
    color = OTP_CONFIG.COLORS.accentEmerald,
    strokeWidth = 3,
  }) => {
    const scale = progress.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0.2, 1.25, 1],
    });
    const opacity = progress.interpolate({
      inputRange: [0, 0.25, 1],
      outputRange: [0, 1, 1],
    });

    return (
      <Animated.View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            opacity,
            transform: [{ scale }],
          },
        ]}
        pointerEvents="none"
      >
        <Svg width={size} height={size} viewBox="0 0 40 40">
          <Path
            d="M 11 20.5 L 17 26.5 L 29 14.5"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
