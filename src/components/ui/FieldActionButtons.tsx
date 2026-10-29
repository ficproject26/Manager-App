import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme';
import { googleMapsLocationService } from '../../services/maps';

export interface FieldActionButtonsProps {
  phoneNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  titleOrLabel?: string;
  address?: string;
  subtitle?: string;
  showContainerCard?: boolean;
  showCall?: boolean;
  showNavigate?: boolean;
  style?: StyleProp<ViewStyle>;
  onCallInitiated?: () => void;
  onNavigateInitiated?: () => void;
}

/**
 * Validates real phone numbers. Returns error message if missing or invalid.
 */
export function validatePhoneNumber(phone?: string | null): { valid: boolean; error?: string; clean?: string } {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Phone number unavailable' };
  }
  const clean = phone.trim().replace(/[\s\-\(\)]/g, '');
  // Valid phone numbers must contain 7-15 digits optionally starting with '+'
  const phoneRegex = /^(\+?[0-9]{7,15})$/;
  if (!phoneRegex.test(clean)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  return { valid: true, clean };
}

/**
 * Validates real geographic coordinates. Returns error message if missing or invalid.
 */
export function validateCoordinates(lat?: number | null, lng?: number | null): { valid: boolean; error?: string } {
  if (lat === undefined || lat === null || lng === undefined || lng === null) {
    return { valid: false, error: 'Location unavailable' };
  }
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) {
    return { valid: false, error: 'Invalid destination location' };
  }
  // Coordinates must be within valid global geographic bounds
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180 || (numLat === 0 && numLng === 0)) {
    return { valid: false, error: 'Invalid destination location' };
  }
  return { valid: true };
}

export const FieldActionButtons: React.FC<FieldActionButtonsProps> = ({
  phoneNumber,
  latitude,
  longitude,
  titleOrLabel,
  address,
  subtitle,
  showContainerCard = false,
  showCall = true,
  showNavigate = true,
  style,
  onCallInitiated,
  onNavigateInitiated,
}) => {
  const phoneStatus = validatePhoneNumber(phoneNumber);
  const locationStatus = validateCoordinates(latitude, longitude);

  const handleCall = async () => {
    if (!phoneStatus.valid) {
      Alert.alert('Call', phoneStatus.error || 'Phone number unavailable');
      return;
    }
    const telUrl = `tel:${phoneStatus.clean}`;
    try {
      const supported = await Linking.canOpenURL(telUrl);
      if (supported) {
        await Linking.openURL(telUrl);
        onCallInitiated?.();
      } else {
        Alert.alert('Phone Call', `Unable to open dialer. Number: ${phoneNumber}`);
      }
    } catch {
      Alert.alert('Phone Call', `Dial: ${phoneNumber}`);
    }
  };

  const handleNavigate = async () => {
    onNavigateInitiated?.();
    await googleMapsLocationService.openNavigation(latitude, longitude, titleOrLabel, address);
  };

  if (!showCall && !showNavigate) {
    return null;
  }

  const renderContent = () => (
    <View style={styles.actionRow}>
      {/* Call Button */}
      {showCall && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.callButton,
            !phoneStatus.valid && styles.disabledButton,
            !showNavigate && { flex: 1 },
          ]}
          onPress={handleCall}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Call ${titleOrLabel || 'Contact'}`}
        >
          <Icon
            name="phone"
            size={16}
            color={phoneStatus.valid ? '#1E40AF' : '#94A3B8'}
            style={styles.btnIcon}
          />
          <Text
            style={[
              styles.buttonText,
              styles.callButtonText,
              !phoneStatus.valid && styles.disabledButtonText,
            ]}
          >
            Call
          </Text>
        </TouchableOpacity>
      )}

      {/* Navigate Button */}
      {showNavigate && (
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.navigateButton,
            !locationStatus.valid && styles.disabledButton,
            !showCall && { flex: 1 },
          ]}
          onPress={handleNavigate}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Navigate to ${titleOrLabel || 'Location'}`}
        >
          <Icon
            name="navigation-variant"
            size={16}
            color={locationStatus.valid ? '#0D9488' : '#94A3B8'}
            style={styles.btnIcon}
          />
          <Text
            style={[
              styles.buttonText,
              styles.navigateButtonText,
              !locationStatus.valid && styles.disabledButtonText,
            ]}
          >
            Navigate
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (showContainerCard) {
    return (
      <View style={[styles.cardContainer, style]}>
        {(titleOrLabel || subtitle || address) && (
          <View style={styles.headerInfo}>
            {titleOrLabel ? <Text style={styles.cardTitle}>{titleOrLabel}</Text> : null}
            {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
            {address ? (
              <View style={styles.addressRow}>
                <Icon name="map-marker-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.cardAddress} numberOfLines={2}>
                  {address}
                </Text>
              </View>
            ) : null}
          </View>
        )}
        {renderContent()}
      </View>
    );
  }

  return <View style={style}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerInfo: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardAddress: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  callButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  navigateButton: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  disabledButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.65,
  },
  btnIcon: {
    marginRight: 6,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  callButtonText: {
    color: '#1E40AF',
  },
  navigateButtonText: {
    color: '#0D9488',
  },
  disabledButtonText: {
    color: '#94A3B8',
  },
});
