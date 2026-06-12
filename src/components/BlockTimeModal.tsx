import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Clock } from 'lucide-react-native';
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
    // When omitted, the whole day is blocked.
    startTime?: string;
    endTime?: string;
  }) => Promise<void>;
  initialDate?: string;
  staffMembers?: StaffMember[];
  isSalon: boolean;
  // When set, the modal edits an existing block instead of creating one.
  editingBlock?: {
    date: string;
    reason: string | null;
    start_time: string | null;
    end_time: string | null;
  } | null;
  onUpdateBlock?: (blockData: {
    date: string;
    reason?: string;
    startTime?: string;
    endTime?: string;
  }) => Promise<void>;
}

// Generate next 30 days for date selection
const generateDateOptions = (startDate: Date): Date[] => {
  const dates: Date[] = [];
  for (let i = 0; i < 30; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
};

// 30-minute time options (00:00 - 23:30) as 'HH:mm'
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m}`);
  }
}

const toMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

const formatTimeLabel = (t: string): string => {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
};

const BlockTimeModal = React.memo(function BlockTimeModal({
  visible,
  onClose,
  onBlockTime,
  initialDate,
  staffMembers = [],
  isSalon,
  editingBlock,
  onUpdateBlock,
}: BlockTimeModalProps) {
  const isEditing = !!editingBlock;
  // Form state
  const [selectedDate, setSelectedDate] = useState(
    initialDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [blockWholeDay, setBlockWholeDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const dateOptions = generateDateOptions(new Date());

  // Reset / prefill form when modal opens
  useEffect(() => {
    if (visible) {
      if (editingBlock) {
        setSelectedDate(editingBlock.date);
        setReason(editingBlock.reason || '');
        const wholeDay = !editingBlock.start_time || !editingBlock.end_time;
        setBlockWholeDay(wholeDay);
        setStartTime(editingBlock.start_time || '09:00');
        setEndTime(editingBlock.end_time || '17:00');
      } else {
        setSelectedDate(initialDate || format(new Date(), 'yyyy-MM-dd'));
        setReason('');
        setBlockWholeDay(true);
        setStartTime('09:00');
        setEndTime('17:00');
      }
      setSelectedStaffIds([]);
      setShowDatePicker(false);
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
  }, [visible, initialDate, editingBlock]);

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
    // Validation (staff selection only applies when creating)
    if (!isEditing && isSalon && selectedStaffIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one staff member');
      return;
    }

    if (!blockWholeDay && toMinutes(endTime) <= toMinutes(startTime)) {
      Alert.alert('Validation Error', 'End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        date: selectedDate,
        reason: reason.trim() || undefined,
        startTime: blockWholeDay ? undefined : startTime,
        endTime: blockWholeDay ? undefined : endTime,
      };
      if (isEditing && onUpdateBlock) {
        await onUpdateBlock(payload);
      } else {
        await onBlockTime({
          ...payload,
          staffMemberIds: isSalon ? selectedStaffIds : [],
        });
      }
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
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Blocked Time' : 'Block Time'}</Text>
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

          {/* Time Range */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabelWrap}>
                <Text style={styles.sectionTitle}>Block entire day</Text>
                <Text style={styles.sectionDescription}>
                  Turn off to block only a specific time range
                </Text>
              </View>
              <Switch
                value={blockWholeDay}
                onValueChange={(v) => {
                  setBlockWholeDay(v);
                  setShowStartPicker(false);
                  setShowEndPicker(false);
                }}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
              />
            </View>

            {!blockWholeDay && (
              <View style={styles.timeRow}>
                {/* Start time */}
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setShowStartPicker(!showStartPicker);
                      setShowEndPicker(false);
                    }}
                  >
                    <Clock size={18} color={COLORS.textSecondary} />
                    <Text style={styles.dateText}>{formatTimeLabel(startTime)}</Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <View style={styles.datePicker}>
                      <ScrollView style={styles.datePickerScroll} nestedScrollEnabled>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.dateOption, t === startTime && styles.dateOptionSelected]}
                            onPress={() => {
                              setStartTime(t);
                              setShowStartPicker(false);
                            }}
                          >
                            <Text style={[styles.dateOptionText, t === startTime && styles.dateOptionTextSelected]}>
                              {formatTimeLabel(t)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* End time */}
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>End</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setShowEndPicker(!showEndPicker);
                      setShowStartPicker(false);
                    }}
                  >
                    <Clock size={18} color={COLORS.textSecondary} />
                    <Text style={styles.dateText}>{formatTimeLabel(endTime)}</Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <View style={styles.datePicker}>
                      <ScrollView style={styles.datePickerScroll} nestedScrollEnabled>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.dateOption, t === endTime && styles.dateOptionSelected]}
                            onPress={() => {
                              setEndTime(t);
                              setShowEndPicker(false);
                            }}
                          >
                            <Text style={[styles.dateOptionText, t === endTime && styles.dateOptionTextSelected]}>
                              {formatTimeLabel(t)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Staff Selection (Salon only, not when editing a single block) */}
          {!isEditing && isSalon && staffMembers.length > 0 && (
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
            title={
              loading
                ? isEditing ? 'Saving...' : 'Blocking...'
                : isEditing ? 'Save Changes' : 'Block Time'
            }
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  switchLabelWrap: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  timeCol: {
    flex: 1,
  },
  timeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
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
