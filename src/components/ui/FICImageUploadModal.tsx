import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { cameraLocationService } from '../../services/camera/CameraLocationService';

export interface FICImageUploadModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  currentImageUri?: string | null;
  onImageSelected: (imageUri: string, fileName?: string, gpsCoords?: string) => void;
  onRemoveImage?: () => void;
  onClose: () => void;
}

export const FICImageUploadModal: React.FC<FICImageUploadModalProps> = ({
  visible,
  title,
  subtitle,
  currentImageUri,
  onImageSelected,
  onRemoveImage,
  onClose,
}) => {
  const [selectedUri, setSelectedUri] = useState<string | null>(currentImageUri || null);
  const [selectedName, setSelectedName] = useState<string>('Captured_Photo.jpg');
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  useEffect(() => {
    setSelectedUri(currentImageUri || null);
  }, [currentImageUri, visible]);

  // Real Device Camera / Gallery Capture
  const handleCaptureRealPhoto = async (mode: 'camera' | 'gallery' = 'camera') => {
    try {
      setIsCapturing(true);
      const result = await cameraLocationService.capturePhotoWithGps(mode);
      if (result && result.uri) {
        setSelectedUri(result.uri);
        setSelectedName(result.fileName);
        onImageSelected(result.uri, result.fileName);
        onClose();
      }
    } catch (error: any) {
      if (error.message && !error.message.includes('No photo')) {
        console.warn('Camera/Gallery capture error:', error.message);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const handleConfirm = () => {
    if (selectedUri) {
      onImageSelected(selectedUri, selectedName);
      onClose();
    } else {
      Alert.alert('No Photo Captured', 'Please capture or select a photo using the device camera or gallery.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.cardContainer}>
              <View style={styles.header}>
                <View style={styles.dragHandle} />
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{title}</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>

              <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                {/* CURRENT PHOTO PREVIEW */}
                {selectedUri ? (
                  <View style={styles.previewBox}>
                    <Image source={{ uri: selectedUri }} style={styles.previewImage} resizeMode="cover" />
                    <View style={styles.previewMetaRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewName} numberOfLines={1}>
                          {selectedName}
                        </Text>
                        <Text style={styles.previewSize}>
                          Real Device Photo Attached
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => {
                          setSelectedUri(null);
                          if (onRemoveImage) onRemoveImage();
                        }}
                      >
                        <Icon name="trash-can-outline" size={18} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* UPLOAD ACTIONS ROW */}
                <Text style={styles.sectionLabel}>Capture Real Device Photo</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                    onPress={() => handleCaptureRealPhoto('camera')}
                    disabled={isCapturing}
                    activeOpacity={0.8}
                  >
                    <Icon name="camera" size={32} color="#2563EB" />
                    <Text style={[styles.actionBtnTitle, { color: '#1D4ED8' }]}>Real Camera</Text>
                    <Text style={styles.actionBtnSub}>Open device camera app</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                    onPress={() => handleCaptureRealPhoto('gallery')}
                    disabled={isCapturing}
                    activeOpacity={0.8}
                  >
                    <Icon name="image-multiple" size={32} color="#16A34A" />
                    <Text style={[styles.actionBtnTitle, { color: '#15803D' }]}>Device Gallery</Text>
                    <Text style={styles.actionBtnSub}>Choose photo file</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.infoBanner}>
                  <Icon name="check-circle-outline" size={18} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={styles.infoBannerText}>
                    Capture a real-time photo with your device camera or select any picture directly from your gallery.
                  </Text>
                </View>
              </ScrollView>

              {/* BOTTOM CONFIRM BUTTON */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.confirmBtn, !selectedUri && styles.confirmBtnDisabled]}
                  onPress={handleConfirm}
                  disabled={!selectedUri}
                  activeOpacity={0.85}
                >
                  <Icon name="check" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnText}>Attach & Save Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    alignItems: 'center',
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  contentScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  previewBox: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 160,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  previewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  previewSize: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '600',
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
  },
  actionBtnSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
