import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../constants';
import { BookingStatus, StaffMember } from '../types';
import Button from './Button';

interface CalendarFilterModalProps {
  visible: boolean;
  onClose: () => void;
  statusFilters: BookingStatus[];
  onStatusChange: (filters: BookingStatus[]) => void;
  staffMembers?: StaffMember[];
  selectedStaffIds: string[];
  onStaffChange: (ids: string[]) => void;
}

const STATUS_OPTIONS: { value: BookingStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: COLORS.warning },
  { value: 'confirmed', label: 'Confirmed', color: COLORS.success },
  { value: 'completed', label: 'Completed', color: COLORS.primary },
  { value: 'cancelled', label: 'Cancelled', color: COLORS.error },
];

const CalendarFilterModal = React.memo(function CalendarFilterModal({
  visible,
  onClose,
  statusFilters,
  onStatusChange,
  staffMembers = [],
  selectedStaffIds,
  onStaffChange,
}: CalendarFilterModalProps) {
  const [localStatusFilters, setLocalStatusFilters] = useState<BookingStatus[]>(statusFilters);
  const [localStaffIds, setLocalStaffIds] = useState<string[]>(selectedStaffIds);

  // Update local state when props change
  useEffect(() => {
    setLocalStatusFilters(statusFilters);
    setLocalStaffIds(selectedStaffIds);
  }, [statusFilters, selectedStaffIds]);

  const handleStatusToggle = (status: BookingStatus) => {
    if (localStatusFilters.includes(status)) {
      setLocalStatusFilters(localStatusFilters.filter(s => s !== status));
    } else {
      setLocalStatusFilters([...localStatusFilters, status]);
    }
  };

  const handleStaffToggle = (staffId: string) => {
    if (localStaffIds.includes(staffId)) {
      setLocalStaffIds(localStaffIds.filter(id => id !== staffId));
    } else {
      setLocalStaffIds([...localStaffIds, staffId]);
    }
  };

  const handleSelectAllStaff = () => {
    if (localStaffIds.length === staffMembers.length) {
      setLocalStaffIds([]);
    } else {
      setLocalStaffIds(staffMembers.map(s => s.id));
    }
  };

  const handleApply = () => {
    onStatusChange(localStatusFilters);
    onStaffChange(localStaffIds);
    onClose();
  };

  const handleClear = () => {
    setLocalStatusFilters(['pending', 'confirmed']);
    setLocalStaffIds([]);
  };

  const hasStaff = staffMembers.length > 0;

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
          <Text style={styles.headerTitle}>Filter Bookings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Filters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Status</Text>
            <Text style={styles.sectionDescription}>
              Select which statuses to show
            </Text>

            {STATUS_OPTIONS.map(option => {
              const isSelected = localStatusFilters.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={styles.checkboxRow}
                  onPress={() => handleStatusToggle(option.value)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && {
                        backgroundColor: option.color,
                        borderColor: option.color,
                      },
                    ]}
                  >
                    {isSelected && <Check size={16} color={COLORS.white} />}
                  </View>
                  <View style={styles.checkboxLabelContainer}>
                    <Text style={styles.checkboxLabel}>{option.label}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: option.color },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Staff Filters (Salon only) */}
          {hasStaff && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Staff Members</Text>
                  <Text style={styles.sectionDescription}>
                    Filter by specific staff
                  </Text>
                </View>
                <TouchableOpacity onPress={handleSelectAllStaff}>
                  <Text style={styles.selectAllButton}>
                    {localStaffIds.length === staffMembers.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              {staffMembers.map(staff => {
                const isSelected = localStaffIds.includes(staff.id);
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
                      {isSelected && <Check size={16} color={COLORS.white} />}
                    </View>
                    <View style={styles.staffLabelContainer}>
                      {staff.avatar ? (
                        <View style={styles.staffAvatar}>
                          <Text style={styles.staffAvatarText}>
                            {staff.name.charAt(0)}
                          </Text>
                        </View>
                      ) : null}
                      <View>
                        <Text style={styles.checkboxLabel}>{staff.name}</Text>
                        <Text style={styles.staffSpecialties}>
                          {staff.specialties.join(', ')}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {localStaffIds.length === 0 && (
                <Text style={styles.emptyNote}>
                  No staff selected - showing all staff bookings
                </Text>
              )}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Button
            title="Clear Filters"
            onPress={handleClear}
            variant="outline"
            style={styles.footerButton}
          />
          <Button
            title="Apply Filters"
            onPress={handleApply}
            variant="primary"
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
});

export default CalendarFilterModal;

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
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
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
  checkboxLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  staffLabelContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  staffSpecialties: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  emptyNote: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.xl, // Extra space for Android navigation
    gap: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerButton: {
    flex: 1,
  },
});
