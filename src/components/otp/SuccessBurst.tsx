import React, { useMemo } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { OTP_CONFIG } from './otpConfig';
import { ParticleConfig } from './types';

interface SuccessBurstProps {
  progress: Animated.Value;
}

const PARTICLE_COUNT = 20;

export const SuccessBurst: React.FC<SuccessBurstProps> = React.memo(({ progress }) => {
  const particles: ParticleConfig[] = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * 2 * Math.PI;
      const isEmerald = i % 3 !== 0;
      return {
        id: i,
        angle,
        distance: 46 + (i % 5) * 8,
        size: i % 2 === 0 ? 5 : 3.5,
        color: isEmerald ? OTP_CONFIG.COLORS.accentEmerald : '#34D399',
        delay: (i % 4) * 0.05,
      };
    });
  }, []);

  const ring1Scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const ring1Opacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.5, 0.2, 0],
  });

  const ring2Scale = progress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.9, 1, 2.8],
  });
  const ring2Opacity = progress.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 0.45, 0.15, 0],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.burstRing,
          { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.burstRing,
          { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
        ]}
      />
      {particles.map((p) => {
        const translateX = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(p.angle) * p.distance],
        });
        const translateY = progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(p.angle) * p.distance],
        });
        const opacity = progress.interpolate({
          inputRange: [0, 0.2, 0.8, 1],
          outputRange: [0, 1, 0.8, 0],
        });
        const scale = progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0.2, 1.2, 0.4],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.dot,
              {
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burstRing: {
    position: 'absolute',
    width: OTP_CONFIG.CENTER_SQUARE_SIZE,
    height: OTP_CONFIG.CENTER_SQUARE_SIZE,
    borderRadius: OTP_CONFIG.BOX_RADIUS,
    borderWidth: 1.5,
    borderColor: OTP_CONFIG.COLORS.accentEmerald,
  },
  dot: {
    position: 'absolute',
  },
});
