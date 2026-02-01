import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, X, Check } from 'lucide-react-native';
import { ProfessionalScreenProps } from '../../navigation/types';
import { GradientButton, Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { StaffAvailability, StaffMember } from '../../types';
import {
  getStaffMemberById,
  getStaffAvailability,
  setStaffAvailability,
} from '../../services/business';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Generate time options from 6am to 11pm
const TIME_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const hour = i + 6; // Start from 6am
  const hourStr = hour.toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return {
    label: `${hour12}:00 ${ampm}`,
    value: `${hourStr}:00:00`
  };
});

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export default function StaffAvailabilityScreen({
  navigation,
  route,
}: ProfessionalScreenProps<'StaffAvailability'>) {
  const { staffId } = route.params;
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Time picker modal state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'start_time' | 'end_time'>('start_time');

  const openTimePicker = (dayOfWeek: number, field: 'start_time' | 'end_time') => {
    setEditingDay(dayOfWeek);
    setEditingField(field);
    setShowTimePicker(true);
  };

  const selectTime = (value: string) => {
    if (editingDay !== null) {
      updateTime(editingDay, editingField, value);
    }
    setShowTimePicker(false);
  };

  useEffect(() => {
    fetchData();
  }, [staffId]);

  const fetchData = async () => {
    try {
      const [staffData, availabilityData] = await Promise.all([
        getStaffMemberById(staffId),
        getStaffAvailability(staffId),
      ]);

      setStaff(staffData);

      // Initialize schedule for all days
      const initialSchedule: DaySchedule[] = DAYS_OF_WEEK.map((day) => {
        const existing = availabilityData.find((a) => a.day_of_week === day.value);
        return {
          day_of_week: day.value,
          start_time: existing?.start_time || '09:00:00',
          end_time: existing?.end_time || '18:00:00',
          is_available: existing?.is_available ?? (day.value >= 1 && day.value <= 5), // Mon-Fri by default
        };
      });

      setSchedule(initialSchedule);

      // Auto-save default availability for existing staff who don't have any
      if (!availabilityData || availabilityData.length === 0) {
        console.log('No availability found, creating default schedule for staff');
        await setStaffAvailability(staffId, initialSchedule);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayOfWeek: number) => {
    setSchedule((prev) =>
      prev.map((s) =>
        s.day_of_week === dayOfWeek
          ? { ...s, is_available: !s.is_available }
          : s
      )
    );
  };

  const updateTime = (
    dayOfWeek: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    setSchedule((prev) =>
      prev.map((s) =>
        s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
      )
    );
  };

  const applyQuickAction = (action: 'weekdays' | 'everyday' | 'clear') => {
    setSchedule((prev) =>
      prev.map((s) => ({
        ...s,
        is_available:
          action === 'clear'
            ? false
            : action === 'everyday'
            ? true
            : s.day_of_week >= 1 && s.day_of_week <= 5,
      }))
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const availableSchedule = schedule
        .filter((s) => s.is_available)
        .map((s) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_available: true,
        }));

      await setStaffAvailability(staffId, availableSchedule);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  // Format time for display (e.g., "09:00:00" -> "9:00 AM")
  const formatTimeDisplay = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${hour12}:00 ${ampm}`;
  };

  // Normalize time to HH:00:00 format for comparison
  const normalizeTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    const hour = parts[0].padStart(2, '0');
    return `${hour}:00:00`;
  };

  // Get current time value for highlighting in picker
  const getCurrentTimeValue = () => {
    if (editingDay === null) return '';
    const daySchedule = schedule.find(s => s.day_of_week === editingDay);
    if (!daySchedule) return '';
    const time = daySchedule[editingField];
    return normalizeTime(time);
  };

  if (loading) {
    return <Loading message="Loading availability..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Staff Availability</Text>
          {staff && (
            <Text style={styles.headerSubtitle}>{staff.name}</Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => applyQuickAction('weekdays')}
          >
            <Text style={styles.quickActionText}>Weekdays Only</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => applyQuickAction('everyday')}
          >
            <Text style={styles.quickActionText}>Every Day</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionClear]}
            onPress={() => applyQuickAction('clear')}
          >
            <Text style={[styles.quickActionText, styles.quickActionClearText]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Schedule */}
        {schedule.map((day) => {
          const dayInfo = DAYS_OF_WEEK.find((d) => d.value === day.day_of_week);
          return (
            <Card key={day.day_of_week} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayInfo?.label}</Text>
                <Switch
                  value={day.is_available}
                  onValueChange={() => toggleDay(day.day_of_week)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                  thumbColor={day.is_available ? COLORS.primary : COLORS.textSecondary}
                />
              </View>

              {day.is_available && (
                <View style={styles.timeSection}>
                  <View style={styles.timeRow}>
                    <Clock size={16} color={COLORS.textSecondary} />
                    <View style={styles.timePickerContainer}>
                      <TouchableOpacity
                        style={styles.timePicker}
                        onPress={() => openTimePicker(day.day_of_week, 'start_time')}
                      >
                        <Text style={styles.timeText}>
                          {formatTimeDisplay(day.start_time)}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.timeSeparator}>to</Text>
                      <TouchableOpacity
                        style={styles.timePicker}
                        onPress={() => openTimePicker(day.day_of_week, 'end_time')}
                      >
                        <Text style={styles.timeText}>
                          {formatTimeDisplay(day.end_time)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </Card>
          );
        })}

        <GradientButton
          title="Save Availability"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {editingField === 'start_time' ? 'Start' : 'End'} Time
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === getCurrentTimeValue();
                return (
                  <TouchableOpacity
                    style={[
                      styles.timeOption,
                      isSelected && styles.timeOptionSelected,
                    ]}
                    onPress={() => selectTime(item.value)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        isSelected && styles.timeOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Check size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.timeList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
  },
  quickActionClear: {
    backgroundColor: COLORS.error + '15',
  },
  quickActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  quickActionClearText: {
    color: COLORS.error,
  },
  dayCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  timePickerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timePicker: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
  },
  timeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  timeSeparator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  saveButton: {
    marginTop: SPACING.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '60%',
    paddingBottom: SPACING.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.xs,
  },
  timeOptionSelected: {
    backgroundColor: COLORS.chipBackground,
  },
  timeOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  timeOptionTextSelected: {
    fontWeight: '600',
    color: COLORS.primary,
  },
});
