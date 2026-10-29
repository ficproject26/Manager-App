import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Vendor, VendorStatus } from '../../../types';
import { VENDOR_ASSETS } from '../../../assets/vendors';

export interface VendorCardProps {
  vendor: Vendor;
  onPress?: (vendor: Vendor) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({ vendor, onPress }) => {
  const getStatusBadge = () => {
    switch (vendor.status) {
      case VendorStatus.NOT_INTERESTED:
        return {
          label: 'Not Interested',
          bg: '#FEF2F2',
          dot: '#DC2626',
          text: '#B91C1C',
        };
      case VendorStatus.ONBOARDED:
        return {
          label: 'Active',
          bg: '#DCFCE7',
          dot: '#16A34A',
          text: '#15803D',
        };
      case VendorStatus.VISITED:
        return {
          label: 'Visited',
          bg: '#DBEAFE',
          dot: '#2563EB',
          text: '#1E40AF',
        };
      case VendorStatus.LEAD:
      default:
        return {
          label: 'Lead',
          bg: '#F3F4F6',
          dot: '#6B7280',
          text: '#374151',
        };
    }
  };

  const statusInfo = getStatusBadge();

  const getVendorImageSource = () => {
    const customPhoto = vendor.shopPhotoUrl || vendor.logoUrl || (vendor as any).photoUrl || (vendor as any).imageUri || (vendor as any).storefrontPhotoUri;
    if (customPhoto) {
      return { uri: customPhoto };
    }
    if (vendor.imageKey && VENDOR_ASSETS[vendor.imageKey]) {
      return VENDOR_ASSETS[vendor.imageKey];
    }
    return VENDOR_ASSETS.abc_traders;
  };

  const imageSource = getVendorImageSource();

  const hasIssues = (vendor.issueCount || 0) > 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress ? () => onPress(vendor) : undefined}
    >
      {/* Storefront Image */}
      <Image
        source={imageSource}
        style={styles.storeImage}
        resizeMode="cover"
      />

      {/* Center Details */}
      <View style={styles.centerDetails}>
        <Text style={styles.businessName} numberOfLines={1}>
          {vendor.businessName}
        </Text>

        <Text style={styles.categoryText} numberOfLines={1}>
          {vendor.businessType || 'Retail'} • {vendor.subcategory || vendor.category}
        </Text>

        <View style={styles.locationRow}>
          <Icon name="map-marker-outline" size={13} color="#64748B" style={styles.metaIcon} />
          <Text style={styles.locationText} numberOfLines={1}>
            {vendor.locationDistrict || vendor.address || 'Tamil Nadu'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="storefront-outline" size={13} color="#64748B" style={styles.metaIcon} />
            <Text style={styles.statText}>{vendor.outletCount || 1} Outlets</Text>
          </View>

          <View style={styles.statItem}>
            <Icon
              name="file-document-outline"
              size={13}
              color={hasIssues ? '#EF4444' : '#64748B'}
              style={styles.metaIcon}
            />
            <Text style={[styles.statText, hasIssues && styles.issuesText]}>
              {vendor.issueCount || 0} {vendor.issueCount === 1 ? 'Issue' : 'Issues'}
            </Text>
          </View>
        </View>
      </View>

      {/* Right Column: Status & Chevron */}
      <View style={styles.rightCol}>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.dot }]} />
          <Text style={[styles.statusText, { color: statusInfo.text }]}>
            {statusInfo.label}
          </Text>
        </View>

        <Icon name="chevron-right" size={18} color="#94A3B8" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  storeImage: {
    width: 64,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  centerDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 6,
    justifyContent: 'center',
  },
  businessName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  metaIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 11,
    color: '#64748B',
  },
  issuesText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 56,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  activeDot: {
    backgroundColor: '#16A34A',
  },
  inactiveDot: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeStatusText: {
    color: '#15803D',
  },
  inactiveStatusText: {
    color: '#DC2626',
  },
});
