import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock } from 'lucide-react-native';
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

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

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

  // Initialize default schedule
  const getDefaultSchedule = (): Record<number, DaySchedule> => {
    const defaultSchedule: Record<number, DaySchedule> = {};
    DAYS.forEach((day) => {
      defaultSchedule[day.value] = {
        is_available: day.value >= 1 && day.value <= 5, // Mon-Fri by default
        start_time: '09:00',
        end_time: '18:00',
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

        {DAYS.map((day) => (
          <Card key={day.value} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <View style={styles.dayInfo}>
                <Text style={styles.dayName}>{day.label}</Text>
                <Text style={styles.dayStatus}>
                  {schedule[day.value]?.is_available
                    ? `${schedule[day.value].start_time} - ${schedule[day.value].end_time}`
                    : 'Unavailable'}
                </Text>
              </View>
              <Switch
                value={schedule[day.value]?.is_available || false}
                onValueChange={() => toggleDay(day.value)}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            </View>

            {schedule[day.value]?.is_available && (
              <View style={styles.timeSelectors}>
                <View style={styles.timeSelector}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.timeScroll}
                  >
                    {TIME_SLOTS.slice(0, -1).map((time) => (
                      <TouchableOpacity
                        key={`start-${time}`}
                        style={[
                          styles.timeChip,
                          schedule[day.value].start_time === time &&
                            styles.timeChipSelected,
                        ]}
                        onPress={() => updateTime(day.value, 'start_time', time)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            schedule[day.value].start_time === time &&
                              styles.timeChipTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.timeSelector}>
                  <Text style={styles.timeLabel}>End</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.timeScroll}
                  >
                    {TIME_SLOTS.slice(1).map((time) => (
                      <TouchableOpacity
                        key={`end-${time}`}
                        style={[
                          styles.timeChip,
                          schedule[day.value].end_time === time &&
                            styles.timeChipSelected,
                        ]}
                        onPress={() => updateTime(day.value, 'end_time', time)}
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            schedule[day.value].end_time === time &&
                              styles.timeChipTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
          </Card>
        ))}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
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
            style={styles.quickAction}
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
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <GradientButton
            title="Save Availability"
            onPress={handleSave}
            loading={saving}
          />
        </View>

        <View style={{ height: 100 }} />
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
  dayCard: {
    marginBottom: SPACING.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayInfo: {
    flex: 1,
  },
  dayName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayStatus: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  timeSelectors: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  timeSelector: {
    gap: SPACING.sm,
  },
  timeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  timeScroll: {
    flexDirection: 'row',
  },
  timeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.chipBackground,
    marginRight: SPACING.sm,
  },
  timeChipSelected: {
    backgroundColor: COLORS.primary,
  },
  timeChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  timeChipTextSelected: {
    color: COLORS.white,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  quickAction: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.chipBackground,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  saveSection: {
    marginTop: SPACING.xl,
  },
});
