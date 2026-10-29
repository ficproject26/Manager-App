import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { FICHeader } from '../../components/ui/FICHeader';

export interface PlaceholderScreenProps {
  title: string;
  onOpenDrawer?: () => void;
}

export const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title, onOpenDrawer }) => {
  return (
    <View style={styles.container}>
      <FICHeader title={title} leftActionIcon={<Text style={styles.menuIcon}>☰</Text>} onLeftAction={onOpenDrawer} />
      <View style={styles.content}>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.message}>Navigation route verified. Feature module ready for implementation.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  menuIcon: {
    fontSize: 20,
    color: theme.colors.surface,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    ...theme.typography.heading,
    color: theme.colors.primary,
  },
  message: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});
