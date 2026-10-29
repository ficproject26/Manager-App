import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ASSETS } from '../../assets/logo';
import { theme } from '../../theme';

const { colors, typography, spacing } = theme;

export interface SplashScreenProps {
  loadingMessage?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  loadingMessage = 'Loading...',
}) => {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoOpacity, logoScale, textOpacity]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
        translucent={false}
      />
      <View style={styles.container} testID="splash-screen">
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={ASSETS.logo}
              style={styles.logo}
              resizeMode="contain"
              testID="fic-logo"
            />
          </Animated.View>

          <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
            <Text style={styles.title}>Forge India Connect</Text>
            <Text style={styles.subtitle}>Manager App</Text>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
          <Text style={styles.loadingText}>{loadingMessage}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: '40%',
    maxWidth: 120,
    aspectRatio: 1,
    marginBottom: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: typography.headingLarge.fontSize,
    lineHeight: typography.headingLarge.lineHeight,
    fontWeight: typography.headingLarge.fontWeight,
    color: colors.primary,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.title.fontSize,
    lineHeight: typography.title.lineHeight,
    fontWeight: typography.title.fontWeight,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.lg,
  },
  spinner: {
    marginBottom: spacing.xs,
  },
  loadingText: {
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    fontWeight: typography.caption.fontWeight,
    color: colors.textMuted,
  },
});
