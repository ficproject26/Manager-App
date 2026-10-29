import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { services } from '../../services';
import { Manager } from '../../types';
import { FICHeader } from '../../components/ui/FICHeader';
import { FICCard } from '../../components/ui/FICCard';
import { FICAvatar } from '../../components/ui/FICAvatar';
import { FICButton } from '../../components/ui/FICButton';
import { FICLoadingState } from '../../components/feedback/FICLoadingState';
import { FICErrorState } from '../../components/feedback/FICErrorState';

export interface ManagerDetailScreenProps {
  managerId?: string;
  onBack: () => void;
  onOpenDrawer?: () => void;
  onNavigateRoute?: (routeName: string, params?: Record<string, any>) => void;
}

export const ManagerDetailScreen: React.FC<ManagerDetailScreenProps> = ({
  managerId,
  onBack,
  onOpenDrawer,
}) => {
  const [manager, setManager] = useState<Manager | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchManager = useCallback(async () => {
    if (!managerId) {
      setError('Manager ID not provided');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await services.managerRepository.getManagerById(managerId);
      if (!data) {
        setError('Manager profile not found');
      } else {
        setManager(data);
      }
    } catch {
      setError('Unable to load manager profile');
    } finally {
      setIsLoading(false);
    }
  }, [managerId]);

  useEffect(() => {
    fetchManager();
  }, [fetchManager]);

  const handleCall = () => {
    if (manager?.phone) {
      Linking.openURL(`tel:${manager.phone}`).catch(() => {
        Alert.alert('Phone Call', `Dial: ${manager.phone}`);
      });
    }
  };

  const handleEmail = () => {
    if (manager?.email) {
      Linking.openURL(`mailto:${manager.email}`).catch(() => {
        Alert.alert('Email', `Write to: ${manager.email}`);
      });
    }
  };

  if (isLoading) {
    return <FICLoadingState message="Loading manager profile..." />;
  }

  if (error || !manager) {
    return (
      <FICErrorState
        title="Profile Not Found"
        message={error || 'Unable to display manager profile.'}
        onRetry={fetchManager}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={theme.colors.primaryDark} barStyle="light-content" />
      <FICHeader
        title="Manager Profile"
        leftActionIcon={<Text style={styles.headerIcon}>←</Text>}
        onLeftAction={onBack}
        rightActionIcon={onOpenDrawer ? <Text style={styles.headerIcon}>☰</Text> : undefined}
        onRightAction={onOpenDrawer}
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header Profile Summary */}
        <FICCard style={styles.card}>
          <View style={styles.profileHeader}>
            <FICAvatar name={manager.name} size={64} />
            <View style={styles.profileHeaderText}>
              <Text style={styles.name}>{manager.name}</Text>
              <Text style={styles.empId}>Employee ID: {manager.employeeId}</Text>
              <View style={styles.badgesRow}>
                <View style={styles.roleChip}>
                  <Text style={styles.roleText}>{manager.role}</Text>
                </View>
                <View
                  style={[
                    styles.statusChip,
                    manager.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      manager.status === 'ACTIVE' ? styles.statusTextActive : styles.statusTextInactive,
                    ]}
                  >
                    {manager.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </FICCard>

        {/* Territory Scope Card */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionTitle}>Territory Scope</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Territory:</Text>
            <Text style={styles.infoValue}>📍 {manager.territoryName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>State Scope:</Text>
            <Text style={styles.infoValue}>{manager.stateId}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>District Scope:</Text>
            <Text style={styles.infoValue}>{manager.districtId || 'All Districts'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Division Scope:</Text>
            <Text style={styles.infoValue}>{manager.divisionName || manager.divisionId || 'All Divisions'}</Text>
          </View>
        </FICCard>

        {/* Contact Information */}
        <FICCard style={styles.card}>
          <Text style={styles.sectionTitle}>Contact Directives</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mobile Number:</Text>
            <Text style={styles.infoValue}>{manager.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Corporate Email:</Text>
            <Text style={styles.infoValue}>{manager.email}</Text>
          </View>

          <View style={styles.contactActions}>
            <FICButton
              title="📞 Call Manager"
              variant="outline"
              onPress={handleCall}
              style={styles.contactBtn}
            />
            <FICButton
              title="✉️ Send Email"
              variant="outline"
              onPress={handleEmail}
              style={styles.contactBtn}
            />
          </View>
        </FICCard>
      </ScrollView>
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
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileHeaderText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  name: {
    ...theme.typography.headingMedium,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  empId: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  roleChip: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  roleText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 10,
  },
  statusChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.sm,
  },
  statusActive: {
    backgroundColor: theme.colors.successLight,
  },
  statusInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    ...theme.typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  statusTextActive: {
    color: theme.colors.success,
  },
  statusTextInactive: {
    color: theme.colors.textSecondary,
  },
  sectionTitle: {
    ...theme.typography.title,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  infoLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  infoValue: {
    ...theme.typography.bodyMedium,
    color: theme.colors.text,
    fontWeight: '600',
  },
  contactActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  contactBtn: {
    flex: 1,
  },
});
