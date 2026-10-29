import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { theme } from '../../theme';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICTextInput } from '../../components/ui/FICTextInput';
import { FICButton } from '../../components/ui/FICButton';

export interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter your registered corporate email address.');
      return;
    }
    setIsSubmitting(true);
    // Simulate backend password reset instruction dispatch
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Reset Password"
        leftActionIcon={<Text style={styles.headerIcon}>←</Text>}
        onLeftAction={onBack}
      />

      <View style={styles.container}>
        <FICCard style={styles.card}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your registered FIC corporate email. We'll send instructions to reset your account password.
          </Text>

          {isSent ? (
            <View style={styles.sentContainer}>
              <Text style={styles.sentIcon}>✉️</Text>
              <Text style={styles.sentTitle}>Reset Link Dispatched</Text>
              <Text style={styles.sentDesc}>
                Instructions have been sent to {email}. Check your inbox or reach out to IT admin support.
              </Text>
              <FICButton
                title="Return to Login"
                variant="primary"
                onPress={onBack}
                style={{ marginTop: theme.spacing.lg }}
              />
            </View>
          ) : (
            <View>
              <FICTextInput
                label="Corporate Email *"
                placeholder="manager@forgeindia.in"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <FICButton
                title={isSubmitting ? 'Sending Request...' : 'Send Reset Link'}
                variant="primary"
                loading={isSubmitting}
                onPress={handleReset}
                style={{ marginTop: theme.spacing.md }}
              />
            </View>
          )}
        </FICCard>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerIcon: {
    fontSize: 20,
    color: theme.colors.surface,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  card: {
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.headingLarge,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  sentContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  sentIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.sm,
  },
  sentTitle: {
    ...theme.typography.title,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  sentDesc: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
