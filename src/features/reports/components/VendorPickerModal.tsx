import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../../theme';
import { services } from '../../../services';
import { Vendor } from '../../../types';
import { FICTextInput } from '../../../components/ui/FICTextInput';
import { FICButton } from '../../../components/ui/FICButton';
import { FICLoadingState } from '../../../components/feedback/FICLoadingState';

export interface VendorPickerModalProps {
  visible: boolean;
  alreadySelectedIds: string[];
  onSelectVendor: (vendor: Vendor) => void;
  onClose: () => void;
}

export const VendorPickerModal: React.FC<VendorPickerModalProps> = ({
  visible,
  alreadySelectedIds,
  onSelectVendor,
  onClose,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (visible) {
      loadVendors();
    }
  }, [visible]);

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      const list = await services.vendorRepository.getVendors();
      const sorted = [...list].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setVendors(sorted);
    } catch {
      setVendors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredVendors = vendors.filter(v => {
    const isAlreadySelected = alreadySelectedIds.includes(v.id);
    if (isAlreadySelected) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.businessName.toLowerCase().includes(q) ||
      v.vendorName.toLowerCase().includes(q) ||
      v.address.toLowerCase().includes(q)
    );
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Select Vendor Visited</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <FICTextInput
            placeholder="Search vendor by name or location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon={<Text style={styles.searchIcon}>🔍</Text>}
          />
        </View>

        {isLoading ? (
          <FICLoadingState message="Loading vendors..." />
        ) : (
          <FlatList
            data={filteredVendors}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.vendorCard}
                onPress={() => {
                  onSelectVendor(item);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={styles.vendorInfo}>
                  <Text style={styles.businessName}>{item.businessName}</Text>
                  <Text style={styles.vendorOwner}>{item.vendorName}</Text>
                  <Text style={styles.vendorAddress} numberOfLines={1}>
                    📍 {item.address}
                  </Text>
                </View>
                <View style={styles.addBadge}>
                  <Text style={styles.addBadgeText}>+ Add</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No available vendors found.</Text>
              </View>
            }
          />
        )}

        <View style={styles.footer}>
          <FICButton title="Cancel" variant="outline" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
  },
  headerTitle: {
    ...theme.typography.title,
    color: theme.colors.surface,
  },
  closeBtn: {
    padding: theme.spacing.xs,
  },
  closeText: {
    fontSize: 20,
    color: theme.colors.surface,
    fontWeight: '700',
  },
  searchSection: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchIcon: {
    fontSize: 16,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  vendorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.card,
  },
  vendorInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  businessName: {
    ...theme.typography.title,
    color: theme.colors.text,
  },
  vendorOwner: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginVertical: 2,
  },
  vendorAddress: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  addBadge: {
    backgroundColor: theme.colors.primaryLight + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
  },
  addBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  emptyBox: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textMuted,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
