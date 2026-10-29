import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { FICButton } from '../../components/ui/FICButton';
import { useAuth } from '../../hooks/useAuth';

export const LoginScreenPlaceholder: React.FC = () => {
  const { login, isLoading } = useAuth();

  const handleLogin = async () => {
    await login('manager@forgeindia.in', 'Password123');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Forge India Connect</Text>
        <Text style={styles.subtitle}>FIC Manager Portal Terminal</Text>
        <FICButton
          title="Sign In as Field Manager"
          onPress={handleLogin}
          loading={isLoading}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    ...theme.elevation.card,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.primary,
  },
  subtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  button: {
    width: '100%',
  },
});
