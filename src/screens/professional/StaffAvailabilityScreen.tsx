import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock } from 'lucide-react-native';
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

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { label: `${hour}:00`, value: `${hour}:00:00` };
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
          end_time: existing?.end_time || '17:00:00',
          is_available: existing?.is_available ?? false,
        };
      });

      setSchedule(initialSchedule);
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
                        onPress={() => {
                          // In a real app, this would open a time picker
                          // For simplicity, cycling through common hours
                          const currentHour = parseInt(day.start_time.split(':')[0]);
                          const nextHour = (currentHour + 1) % 24;
                          updateTime(
                            day.day_of_week,
                            'start_time',
                            `${nextHour.toString().padStart(2, '0')}:00:00`
                          );
                        }}
                      >
                        <Text style={styles.timeText}>
                          {day.start_time.substring(0, 5)}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.timeSeparator}>to</Text>
                      <TouchableOpacity
                        style={styles.timePicker}
                        onPress={() => {
                          const currentHour = parseInt(day.end_time.split(':')[0]);
                          const nextHour = (currentHour + 1) % 24;
                          updateTime(
                            day.day_of_week,
                            'end_time',
                            `${nextHour.toString().padStart(2, '0')}:00:00`
                          );
                        }}
                      >
                        <Text style={styles.timeText}>
                          {day.end_time.substring(0, 5)}
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
});
