import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface FICOperatingHoursModalProps {
  visible: boolean;
  currentHours: string;
  onSelectHours: (hours: string) => void;
  onClose: () => void;
}

const QUICK_PRESETS = [
  { label: '9:00 AM - 9:00 PM', open: '09:00 AM', close: '09:00 PM' },
  { label: '10:00 AM - 8:00 PM', open: '10:00 AM', close: '08:00 PM' },
  { label: '9:00 AM - 6:00 PM', open: '09:00 AM', close: '06:00 PM' },
  { label: '10:00 AM - 10:00 PM', open: '10:00 AM', close: '10:00 PM' },
  { label: '24 Hours (Open All Day)', open: '24 Hours', close: '24 Hours' },
];

const OPENING_TIMES = [
  '07:00 AM',
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '12:00 PM',
];

const CLOSING_TIMES = [
  '05:00 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
  '08:30 PM',
  '09:00 PM',
  '09:30 PM',
  '10:00 PM',
  '11:00 PM',
];

export const FICOperatingHoursModal: React.FC<FICOperatingHoursModalProps> = ({
  visible,
  currentHours,
  onSelectHours,
  onClose,
}) => {
  const [selectedOpen, setSelectedOpen] = useState<string>('09:00 AM');
  const [selectedClose, setSelectedClose] = useState<string>('09:00 PM');
  const [is24Hours, setIs24Hours] = useState<boolean>(false);

  const handleSelectPreset = (preset: typeof QUICK_PRESETS[0]) => {
    if (preset.open === '24 Hours') {
      setIs24Hours(true);
    } else {
      setIs24Hours(false);
      setSelectedOpen(preset.open);
      setSelectedClose(preset.close);
    }
  };

  const handleSaveHours = () => {
    if (is24Hours) {
      onSelectHours('24 Hours (Open All Day)');
    } else {
      onSelectHours(`${selectedOpen} - ${selectedClose}`);
    }
    onClose();
  };

  const currentDisplay = is24Hours
    ? '24 Hours (Open All Day)'
    : `${selectedOpen} - ${selectedClose}`;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.cardContainer}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.dragHandle} />
                <View style={styles.titleRow}>
                  <View style={styles.titleWithIcon}>
                    <Icon name="clock-outline" size={22} color="#EA580C" style={{ marginRight: 8 }} />
                    <Text style={styles.title}>Select Operating Hours</Text>
                  </View>
                  <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
                {/* Quick Presets */}
                <Text style={styles.sectionLabel}>Quick Presets (One Tap)</Text>
                <View style={styles.presetsGrid}>
                  {QUICK_PRESETS.map(p => {
                    const isSel = is24Hours
                      ? p.open === '24 Hours'
                      : !is24Hours && selectedOpen === p.open && selectedClose === p.close;
                    return (
                      <TouchableOpacity
                        key={p.label}
                        style={[styles.presetChip, isSel && styles.presetChipActive]}
                        onPress={() => handleSelectPreset(p)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.presetChipText, isSel && styles.presetChipTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!is24Hours && (
                  <>
                    {/* Opening Time */}
                    <Text style={styles.sectionLabel}>Opening Time</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                      {OPENING_TIMES.map(t => {
                        const isSel = selectedOpen === t;
                        return (
                          <TouchableOpacity
                            key={`open-${t}`}
                            style={[styles.timeChip, isSel && styles.timeChipActive]}
                            onPress={() => setSelectedOpen(t)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.timeChipText, isSel && styles.timeChipTextActive]}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Closing Time */}
                    <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Closing Time</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                      {CLOSING_TIMES.map(t => {
                        const isSel = selectedClose === t;
                        return (
                          <TouchableOpacity
                            key={`close-${t}`}
                            style={[styles.timeChip, isSel && styles.timeChipActive]}
                            onPress={() => setSelectedClose(t)}
                            activeOpacity={0.75}
                          >
                            <Text style={[styles.timeChipText, isSel && styles.timeChipTextActive]}>
                              {t}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                {/* Preview Banner */}
                <View style={styles.previewBanner}>
                  <Icon name="clock-check-outline" size={20} color="#C2410C" style={{ marginRight: 8 }} />
                  <Text style={styles.previewText}>
                    Selected: <Text style={{ fontWeight: '700' }}>{currentDisplay}</Text>
                  </Text>
                </View>
              </ScrollView>

              {/* Footer Save Button */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveHours} activeOpacity={0.85}>
                  <Text style={styles.saveBtnText}>Save Operating Hours</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 16,
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
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  timeChipActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 12,
  },
  previewText: {
    fontSize: 13,
    color: '#9A3412',
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  saveBtn: {
    backgroundColor: '#EA580C',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

