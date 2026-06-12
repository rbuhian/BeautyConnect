import React, { useState, useEffect, useCallback } from 'react';
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
import {
  ArrowLeft,
  Clock,
  Calendar,
  Car,
  Hash,
  Coffee,
  Minus,
  Plus,
  X,
  Check,
} from 'lucide-react-native';
import { Card, Loading, GradientButton } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { SchedulingRules } from '../../types';
import { getSchedulingRules, upsertSchedulingRules } from '../../services/scheduling-rules';

// Time options for lunch break picker (6am to 10pm)
const TIME_OPTIONS = Array.from({ length: 17 }, (_, i) => {
  const hour = i + 6;
  const hourStr = hour.toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return {
    label: `${hour12}:00 ${ampm}`,
    value: `${hourStr}:00`,
  };
});

export default function SchedulingRulesScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();
  const [rules, setRules] = useState<SchedulingRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Time picker modal
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingField, setEditingField] = useState<'lunch_start_time' | 'lunch_end_time'>('lunch_start_time');

  const fetchRules = useCallback(async () => {
    if (!professionalProfile?.id) return;
    try {
      const result = await getSchedulingRules(professionalProfile.id);
      if (result.data) setRules(result.data);
    } catch (err) {
      console.error('Error fetching scheduling rules:', err);
    } finally {
      setLoading(false);
    }
  }, [professionalProfile?.id]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const updateField = <K extends keyof SchedulingRules>(field: K, value: SchedulingRules[K]) => {
    if (!rules) return;
    setRules({ ...rules, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!professionalProfile?.id || !rules) return;

    setSaving(true);
    try {
      const result = await upsertSchedulingRules(professionalProfile.id, {
        buffer_minutes: rules.buffer_minutes,
        max_daily_bookings: rules.max_daily_bookings,
        lunch_break_enabled: rules.lunch_break_enabled,
        lunch_start_time: rules.lunch_start_time,
        lunch_end_time: rules.lunch_end_time,
        travel_buffer_minutes: rules.travel_buffer_minutes,
        min_advance_booking_hours: rules.min_advance_booking_hours,
      });

      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        setHasChanges(false);
        Alert.alert('Saved', 'Scheduling rules updated successfully.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save scheduling rules.');
    } finally {
      setSaving(false);
    }
  };

  const openTimePicker = (field: 'lunch_start_time' | 'lunch_end_time') => {
    setEditingField(field);
    setShowTimePicker(true);
  };

  const selectTime = (value: string) => {
    updateField(editingField, value);
    setShowTimePicker(false);
  };

  const formatTime = (time: string) => {
    const opt = TIME_OPTIONS.find((t) => t.value === time);
    return opt?.label || time;
  };

  if (loading || !rules) {
    return <Loading fullScreen message="Loading rules..." />;
  }

  const isHomeService = professionalProfile?.location_type === 'home_service' || professionalProfile?.location_type === 'both';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scheduling Rules</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Buffer Time Between Bookings */}
        <Card style={styles.ruleCard}>
          <View style={styles.ruleHeader}>
            <View style={[styles.ruleIcon, { backgroundColor: '#E3F2FD' }]}>
              <Clock size={20} color="#1976D2" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Buffer Time</Text>
              <Text style={styles.ruleDescription}>
                Break between consecutive bookings
              </Text>
            </View>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateField('buffer_minutes', Math.max(0, rules.buffer_minutes - 5))}
            >
              <Minus size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperText}>{rules.buffer_minutes}</Text>
              <Text style={styles.stepperUnit}>min</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => updateField('buffer_minutes', Math.min(60, rules.buffer_minutes + 5))}
            >
              <Plus size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Max Daily Bookings */}
        <Card style={styles.ruleCard}>
          <View style={styles.ruleHeader}>
            <View style={[styles.ruleIcon, { backgroundColor: '#F3E5F5' }]}>
              <Hash size={20} color={COLORS.primary} />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Max Daily Bookings</Text>
              <Text style={styles.ruleDescription}>
                Limit bookings per day (leave off for unlimited)
              </Text>
            </View>
            <Switch
              value={rules.max_daily_bookings !== null}
              onValueChange={(enabled) => {
                updateField('max_daily_bookings', enabled ? 8 : null);
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          {rules.max_daily_bookings !== null && (
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() =>
                  updateField('max_daily_bookings', Math.max(1, (rules.max_daily_bookings || 1) - 1))
                }
              >
                <Minus size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperText}>{rules.max_daily_bookings}</Text>
                <Text style={styles.stepperUnit}>bookings</Text>
              </View>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() =>
                  updateField('max_daily_bookings', Math.min(30, (rules.max_daily_bookings || 1) + 1))
                }
              >
                <Plus size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Lunch Break */}
        <Card style={styles.ruleCard}>
          <View style={styles.ruleHeader}>
            <View style={[styles.ruleIcon, { backgroundColor: '#FFF3E0' }]}>
              <Coffee size={20} color={COLORS.warning} />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Lunch Break</Text>
              <Text style={styles.ruleDescription}>
                Block off time for lunch
              </Text>
            </View>
            <Switch
              value={rules.lunch_break_enabled}
              onValueChange={(val) => updateField('lunch_break_enabled', val)}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={COLORS.white}
            />
          </View>
          {rules.lunch_break_enabled && (
            <View style={styles.timePickerRow}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => openTimePicker('lunch_start_time')}
              >
                <Text style={styles.timeLabel}>Start</Text>
                <Text style={styles.timeValue}>{formatTime(rules.lunch_start_time)}</Text>
              </TouchableOpacity>
              <Text style={styles.timeSeparator}>to</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => openTimePicker('lunch_end_time')}
              >
                <Text style={styles.timeLabel}>End</Text>
                <Text style={styles.timeValue}>{formatTime(rules.lunch_end_time)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Travel Buffer (for home service professionals) */}
        {isHomeService && (
          <Card style={styles.ruleCard}>
            <View style={styles.ruleHeader}>
              <View style={[styles.ruleIcon, { backgroundColor: '#E8F5E9' }]}>
                <Car size={20} color={COLORS.success} />
              </View>
              <View style={styles.ruleInfo}>
                <Text style={styles.ruleTitle}>Travel Buffer</Text>
                <Text style={styles.ruleDescription}>
                  Extra time for home service travel
                </Text>
              </View>
            </View>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() =>
                  updateField('travel_buffer_minutes', Math.max(0, rules.travel_buffer_minutes - 5))
                }
              >
                <Minus size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperText}>{rules.travel_buffer_minutes}</Text>
                <Text style={styles.stepperUnit}>min</Text>
              </View>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() =>
                  updateField('travel_buffer_minutes', Math.min(60, rules.travel_buffer_minutes + 5))
                }
              >
                <Plus size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Min Advance Booking */}
        <Card style={styles.ruleCard}>
          <View style={styles.ruleHeader}>
            <View style={[styles.ruleIcon, { backgroundColor: '#FCE4EC' }]}>
              <Calendar size={20} color="#E91E63" />
            </View>
            <View style={styles.ruleInfo}>
              <Text style={styles.ruleTitle}>Minimum Advance Notice</Text>
              <Text style={styles.ruleDescription}>
                How far in advance clients must book
              </Text>
            </View>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                updateField('min_advance_booking_hours', Math.max(1, rules.min_advance_booking_hours - 1))
              }
            >
              <Minus size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperText}>{rules.min_advance_booking_hours}</Text>
              <Text style={styles.stepperUnit}>hours</Text>
            </View>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() =>
                updateField('min_advance_booking_hours', Math.min(72, rules.min_advance_booking_hours + 1))
              }
            >
              <Plus size={18} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <GradientButton
            title={saving ? 'Saving...' : 'Save Rules'}
            onPress={handleSave}
            disabled={!hasChanges || saving}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingField === 'lunch_start_time' ? 'Lunch Start Time' : 'Lunch End Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIME_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === rules[editingField];
                return (
                  <TouchableOpacity
                    style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                    onPress={() => selectTime(item.value)}
                  >
                    <Text
                      style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && <Check size={20} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
  },
  // Rule cards
  ruleCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ruleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ruleDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    alignItems: 'center',
    minWidth: 80,
  },
  stepperText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepperUnit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Time picker row
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  timeButton: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeSeparator: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  // Save
  saveSection: {
    marginTop: SPACING.lg,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
