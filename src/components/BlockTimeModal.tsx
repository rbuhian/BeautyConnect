import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar } from 'lucide-react-native';
import { format, parseISO, addDays } from 'date-fns';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../constants';
import { StaffMember } from '../types';
import Button from './Button';
import Input from './Input';

interface BlockTimeModalProps {
  visible: boolean;
  onClose: () => void;
  onBlockTime: (blockData: {
    date: string;
    staffMemberIds: string[];
    reason?: string;
  }) => Promise<void>;
  initialDate?: string;
  staffMembers?: StaffMember[];
  isSalon: boolean;
}

// Generate next 30 days for date selection
const generateDateOptions = (startDate: Date): Date[] => {
  const dates: Date[] = [];
  for (let i = 0; i < 30; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
};

const BlockTimeModal = React.memo(function BlockTimeModal({
  visible,
  onClose,
  onBlockTime,
  initialDate,
  staffMembers = [],
  isSalon,
}: BlockTimeModalProps) {
  // Form state
  const [selectedDate, setSelectedDate] = useState(
    initialDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateOptions = generateDateOptions(new Date());

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate || format(new Date(), 'yyyy-MM-dd'));
      setSelectedStaffIds([]);
      setReason('');
      setShowDatePicker(false);
    }
  }, [visible, initialDate]);

  const handleStaffToggle = (staffId: string) => {
    if (selectedStaffIds.includes(staffId)) {
      setSelectedStaffIds(selectedStaffIds.filter(id => id !== staffId));
    } else {
      setSelectedStaffIds([...selectedStaffIds, staffId]);
    }
  };

  const handleSelectAllStaff = () => {
    if (selectedStaffIds.length === staffMembers.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(staffMembers.map(s => s.id));
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (isSalon && selectedStaffIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one staff member');
      return;
    }

    setLoading(true);
    try {
      await onBlockTime({
        date: selectedDate,
        staffMemberIds: isSalon ? selectedStaffIds : [],
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error blocking time:', error);
      Alert.alert('Error', 'Failed to block time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Block Time</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar size={20} color={COLORS.textSecondary} />
              <Text style={styles.dateText}>
                {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.datePicker}>
                <ScrollView style={styles.datePickerScroll}>
                  {dateOptions.map(date => {
                    const dateString = format(date, 'yyyy-MM-dd');
                    const isSelected = dateString === selectedDate;
                    return (
                      <TouchableOpacity
                        key={dateString}
                        style={[
                          styles.dateOption,
                          isSelected && styles.dateOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedDate(dateString);
                          setShowDatePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dateOptionText,
                            isSelected && styles.dateOptionTextSelected,
                          ]}
                        >
                          {format(date, 'EEE, MMM d, yyyy')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Staff Selection (Salon only) */}
          {isSalon && staffMembers.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Staff Members</Text>
                <TouchableOpacity onPress={handleSelectAllStaff}>
                  <Text style={styles.selectAllButton}>
                    {selectedStaffIds.length === staffMembers.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionDescription}>
                Select which staff to block for this date
              </Text>

              {staffMembers.map(staff => {
                const isSelected = selectedStaffIds.includes(staff.id);
                return (
                  <TouchableOpacity
                    key={staff.id}
                    style={styles.checkboxRow}
                    onPress={() => handleStaffToggle(staff.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        isSelected && {
                          backgroundColor: COLORS.primary,
                          borderColor: COLORS.primary,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.staffInfo}>
                      <Text style={styles.staffName}>{staff.name}</Text>
                      <Text style={styles.staffSpecialties}>
                        {staff.specialties.join(', ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Reason */}
          <View style={styles.section}>
            <Input
              label="Reason (Optional)"
              value={reason}
              onChangeText={setReason}
              placeholder="e.g., Personal day, Holiday, Training"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="outline"
            style={styles.footerButton}
          />
          <Button
            title={loading ? 'Blocking...' : 'Block Time'}
            onPress={handleSubmit}
            variant="primary"
            style={styles.footerButton}
            disabled={loading}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
});

export default BlockTimeModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  selectAllButton: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dateText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    flex: 1,
  },
  datePicker: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
  },
  datePickerScroll: {
    maxHeight: 200,
  },
  dateOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dateOptionSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  dateOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  dateOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  checkmark: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  staffSpecialties: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.xl,
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerButton: {
    flex: 1,
  },
});
