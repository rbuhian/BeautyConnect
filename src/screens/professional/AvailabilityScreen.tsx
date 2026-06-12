import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, X, Check } from 'lucide-react-native';
import { GradientButton, Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Availability } from '../../types';
import { getAvailability, setAvailabilityBulk } from '../../services/professional';

const DAYS = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

// Generate time options from 6am to 10pm
const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i; // 0 (12 AM) to 23 (11 PM)
  const hourStr = hour.toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return {
    label: `${hour12}:00 ${ampm}`,
    value: `${hourStr}:00`,
  };
});

interface DaySchedule {
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export default function AvailabilityScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();
  const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Time picker modal state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'start_time' | 'end_time'>('start_time');

  // Initialize default schedule
  const getDefaultSchedule = (): Record<number, DaySchedule> => {
    const defaultSchedule: Record<number, DaySchedule> = {};
    DAYS.forEach((day) => {
      defaultSchedule[day.value] = {
        is_available: day.value >= 1 && day.value <= 5, // Mon-Fri by default
        start_time: '09:00',
        end_time: '23:00',
      };
    });
    return defaultSchedule;
  };

  const fetchAvailability = useCallback(async () => {
    if (!professionalProfile?.id) return;

    try {
      const result = await getAvailability(professionalProfile.id);
      if (result.data && result.data.length > 0) {
        const loadedSchedule: Record<number, DaySchedule> = getDefaultSchedule();
        result.data.forEach((avail: Availability) => {
          loadedSchedule[avail.day_of_week] = {
            is_available: avail.is_available,
            start_time: avail.start_time,
            end_time: avail.end_time,
          };
        });
        setSchedule(loadedSchedule);
      } else {
        // No availability exists - create default schedule automatically
        const defaultSchedule = getDefaultSchedule();
        setSchedule(defaultSchedule);

        // Auto-save default availability to database for existing professionals
        const availabilityData = DAYS.map((day) => ({
          professional_id: professionalProfile.id,
          day_of_week: day.value,
          is_available: defaultSchedule[day.value].is_available,
          start_time: defaultSchedule[day.value].start_time,
          end_time: defaultSchedule[day.value].end_time,
        }));

        await setAvailabilityBulk(professionalProfile.id, availabilityData);
        console.log('Default availability created for professional');
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
      setSchedule(getDefaultSchedule());
    } finally {
      setLoading(false);
    }
  }, [professionalProfile?.id]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const toggleDay = (dayValue: number) => {
    setSchedule((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        is_available: !prev[dayValue].is_available,
      },
    }));
  };

  const updateTime = (dayValue: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [dayValue]: {
        ...prev[dayValue],
        [field]: value,
      },
    }));
  };

  const openTimePicker = (dayValue: number, field: 'start_time' | 'end_time') => {
    setEditingDay(dayValue);
    setEditingField(field);
    setShowTimePicker(true);
  };

  const selectTime = (value: string) => {
    if (editingDay !== null) {
      updateTime(editingDay, editingField, value);
    }
    setShowTimePicker(false);
  };

  // Format time for display (e.g., "09:00" -> "9:00 AM")
  const formatTimeDisplay = (time: string) => {
    if (!time) return '';
    const hour = parseInt(time.split(':')[0]);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${hour12}:00 ${ampm}`;
  };

  // Normalize time to HH:00 format for comparison
  const normalizeTime = (time: string) => {
    if (!time) return '';
    const parts = time.split(':');
    const hour = parts[0].padStart(2, '0');
    return `${hour}:00`;
  };

  // Get current time value for highlighting in picker
  const getCurrentTimeValue = () => {
    if (editingDay === null) return '';
    const daySchedule = schedule[editingDay];
    if (!daySchedule) return '';
    const time = daySchedule[editingField];
    return normalizeTime(time);
  };

  const handleSave = async () => {
    if (!professionalProfile?.id) {
      Alert.alert('Error', 'Professional profile not found.');
      return;
    }

    // Validate times
    for (const day of DAYS) {
      const daySchedule = schedule[day.value];
      if (daySchedule.is_available) {
        if (daySchedule.start_time >= daySchedule.end_time) {
          Alert.alert('Invalid Time', `${day.label}: Start time must be before end time.`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const availabilities = DAYS.map((day) => ({
        day_of_week: day.value,
        start_time: schedule[day.value].start_time,
        end_time: schedule[day.value].end_time,
        is_available: schedule[day.value].is_available,
      }));

      const result = await setAvailabilityBulk(professionalProfile.id, availabilities);

      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        Alert.alert('Success', 'Availability updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      console.error('Save availability error:', err);
      Alert.alert('Error', 'Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loading fullScreen message="Loading availability..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.description}>
          Set your weekly availability. Clients can only book during these hours.
        </Text>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              const newSchedule = { ...schedule };
              DAYS.forEach((day) => {
                if (day.value >= 1 && day.value <= 5) {
                  newSchedule[day.value].is_available = true;
                } else {
                  newSchedule[day.value].is_available = false;
                }
              });
              setSchedule(newSchedule);
            }}
          >
            <Text style={styles.quickActionText}>Weekdays Only</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => {
              const newSchedule = { ...schedule };
              DAYS.forEach((day) => {
                newSchedule[day.value].is_available = true;
              });
              setSchedule(newSchedule);
            }}
          >
            <Text style={styles.quickActionText}>Every Day</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionClear]}
            onPress={() => {
              const newSchedule = { ...schedule };
              DAYS.forEach((day) => {
                newSchedule[day.value].is_available = false;
              });
              setSchedule(newSchedule);
            }}
          >
            <Text style={[styles.quickActionText, styles.quickActionClearText]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {DAYS.map((day) => (
          <Card key={day.value} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day.label}</Text>
              <Switch
                value={schedule[day.value]?.is_available || false}
                onValueChange={() => toggleDay(day.value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                thumbColor={schedule[day.value]?.is_available ? COLORS.primary : COLORS.textSecondary}
              />
            </View>

            {schedule[day.value]?.is_available && (
              <View style={styles.timeSection}>
                <View style={styles.timeRow}>
                  <Clock size={16} color={COLORS.textSecondary} />
                  <View style={styles.timePickerContainer}>
                    <TouchableOpacity
                      style={styles.timePicker}
                      onPress={() => openTimePicker(day.value, 'start_time')}
                    >
                      <Text style={styles.timeText}>
                        {formatTimeDisplay(schedule[day.value].start_time)}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.timeSeparator}>to</Text>
                    <TouchableOpacity
                      style={styles.timePicker}
                      onPress={() => openTimePicker(day.value, 'end_time')}
                    >
                      <Text style={styles.timeText}>
                        {formatTimeDisplay(schedule[day.value].end_time)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </Card>
        ))}

        {/* Save Button */}
        <GradientButton
          title="Save Availability"
          onPress={handleSave}
          loading={saving}
          style={styles.saveButton}
        />

        <View style={{ height: 100 }} />
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    padding: SPACING.lg,
  },
  description: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
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
  dayName: {
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
