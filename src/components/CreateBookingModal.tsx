import React, { useState, useEffect, useMemo } from 'react';
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
import { X, Calendar, Clock } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES } from '../constants';
import { Service, StaffMember } from '../types';
import Button from './Button';
import Input from './Input';

interface CreateBookingModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateBooking: (bookingData: {
    clientName: string;
    clientPhone: string;
    serviceId: string;
    date: string;
    timeSlot: string;
    locationType: 'home' | 'salon';
    clientAddress?: string;
    staffMemberId?: string;
  }) => Promise<void>;
  initialDate?: string;
  initialTimeSlot?: string;
  services: Service[];
  staffMembers?: StaffMember[];
  isSalon: boolean;
}

// Generate time slots from 8 AM to 8 PM
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 8; hour <= 20; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 20) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const CreateBookingModal = React.memo(function CreateBookingModal({
  visible,
  onClose,
  onCreateBooking,
  initialDate,
  initialTimeSlot,
  services,
  staffMembers = [],
  isSalon,
}: CreateBookingModalProps) {
  // Form state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    initialDate || format(new Date(), 'yyyy-MM-dd')
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(initialTimeSlot || '09:00');
  const [locationType, setLocationType] = useState<'home' | 'salon'>('salon');
  const [clientAddress, setClientAddress] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loading, setLoading] = useState(false);

  // Show/hide dropdowns
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showStaffPicker, setShowStaffPicker] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setClientName('');
      setClientPhone('');
      setSelectedServiceId('');
      setSelectedDate(initialDate || format(new Date(), 'yyyy-MM-dd'));
      setSelectedTimeSlot(initialTimeSlot || '09:00');
      setLocationType('salon');
      setClientAddress('');
      setSelectedStaffId('');
      setShowServicePicker(false);
      setShowTimePicker(false);
      setShowStaffPicker(false);
    }
  }, [visible, initialDate, initialTimeSlot]);

  const selectedService = services.find(s => s.id === selectedServiceId);
  const selectedStaff = staffMembers.find(s => s.id === selectedStaffId);

  // Filter staff members based on selected service
  const availableStaff = useMemo(() => {
    if (!selectedService || !isSalon) return staffMembers;

    // If service is assigned to a specific staff member, only show that staff
    if (selectedService.staff_member_id) {
      return staffMembers.filter(s => s.id === selectedService.staff_member_id);
    }

    // Otherwise, filter by staff specialties matching service category
    return staffMembers.filter(s =>
      s.is_active && s.specialties.includes(selectedService.category)
    );
  }, [selectedService, staffMembers, isSalon]);

  // Reset staff selection when service changes (available staff might change)
  useEffect(() => {
    if (selectedServiceId) {
      // Check if currently selected staff is still available
      const isStillAvailable = availableStaff.some(s => s.id === selectedStaffId);
      if (!isStillAvailable) {
        // Auto-select if only one staff available, otherwise clear selection
        if (availableStaff.length === 1) {
          setSelectedStaffId(availableStaff[0].id);
        } else {
          setSelectedStaffId('');
        }
      }
    }
  }, [selectedServiceId, availableStaff]);

  const handleSubmit = async () => {
    // Validation
    if (!clientName.trim()) {
      Alert.alert('Validation Error', 'Please enter client name');
      return;
    }
    if (!clientPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter client phone number');
      return;
    }
    if (!selectedServiceId) {
      Alert.alert('Validation Error', 'Please select a service');
      return;
    }
    if (isSalon && availableStaff.length > 0 && !selectedStaffId) {
      Alert.alert('Validation Error', 'Please select a staff member');
      return;
    }
    if (isSalon && availableStaff.length === 0) {
      Alert.alert('Validation Error', 'No staff available for this service. Please add staff with the required specialty.');
      return;
    }
    if (locationType === 'home' && !clientAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter client address for home service');
      return;
    }

    setLoading(true);
    try {
      await onCreateBooking({
        clientName,
        clientPhone,
        serviceId: selectedServiceId,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        locationType,
        clientAddress: locationType === 'home' ? clientAddress : undefined,
        staffMemberId: isSalon ? selectedStaffId : undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
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
          <Text style={styles.headerTitle}>Create Booking</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Client Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Information</Text>
            <Input
              label="Client Name"
              value={clientName}
              onChangeText={setClientName}
              placeholder="Enter client name"
            />
            <Input
              label="Phone Number"
              value={clientPhone}
              onChangeText={setClientPhone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />
          </View>

          {/* Service Selection */}
          <View style={[styles.section, { zIndex: 30 }]}>
            <Text style={styles.sectionTitle}>Service</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowServicePicker(!showServicePicker)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedServiceId && styles.placeholderText,
                  ]}
                >
                  {selectedService ? selectedService.name : 'Select service'}
                </Text>
              </TouchableOpacity>
              {showServicePicker && (
                <ScrollView style={styles.pickerDropdown} nestedScrollEnabled>
                  {services.filter(s => s.is_active).map(service => (
                    <TouchableOpacity
                      key={service.id}
                      style={styles.pickerOption}
                      onPress={() => {
                        setSelectedServiceId(service.id);
                        setShowServicePicker(false);
                      }}
                    >
                      <Text style={styles.pickerOptionText}>{service.name}</Text>
                      <Text style={styles.pickerOptionSubtext}>
                        ₱{service.price} • {service.duration_minutes} mins
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Date & Time */}
          <View style={[styles.section, { zIndex: 20 }]}>
            <Text style={styles.sectionTitle}>Date & Time</Text>
            <View style={styles.row}>
              <View style={styles.dateInput}>
                <Text style={styles.inputLabel}>Date</Text>
                <View style={styles.dateDisplay}>
                  <Calendar size={16} color={COLORS.textSecondary} />
                  <Text style={styles.dateText}>
                    {format(parseISO(selectedDate), 'MMM d, yyyy')}
                  </Text>
                </View>
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>Time</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(!showTimePicker)}
                >
                  <Clock size={16} color={COLORS.textSecondary} />
                  <Text style={styles.timeText}>{selectedTimeSlot}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {showTimePicker && (
              <View style={styles.timePickerDropdown}>
                <ScrollView style={styles.timePickerScroll}>
                  {TIME_SLOTS.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.timeSlot,
                        selectedTimeSlot === slot && styles.timeSlotSelected,
                      ]}
                      onPress={() => {
                        setSelectedTimeSlot(slot);
                        setShowTimePicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTimeSlot === slot && styles.timeSlotTextSelected,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Staff Selection (Salon only) */}
          {isSalon && (
            <View style={[styles.section, { zIndex: 10 }]}>
              <Text style={styles.sectionTitle}>Staff Member</Text>
              {!selectedServiceId ? (
                <Text style={styles.helperText}>Please select a service first</Text>
              ) : availableStaff.length === 0 ? (
                <Text style={styles.helperText}>
                  No staff available for this service. Please add staff with "{CATEGORIES.find(c => c.value === selectedService?.category)?.label || selectedService?.category}" specialty.
                </Text>
              ) : (
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowStaffPicker(!showStaffPicker)}
                  >
                    <Text
                      style={[
                        styles.pickerButtonText,
                        !selectedStaffId && styles.placeholderText,
                      ]}
                    >
                      {selectedStaff ? selectedStaff.name : 'Select staff member'}
                    </Text>
                  </TouchableOpacity>
                  {showStaffPicker && (
                    <ScrollView style={styles.pickerDropdown} nestedScrollEnabled>
                      {availableStaff.map(staff => (
                        <TouchableOpacity
                          key={staff.id}
                          style={styles.pickerOption}
                          onPress={() => {
                            setSelectedStaffId(staff.id);
                            setShowStaffPicker(false);
                          }}
                        >
                          <Text style={styles.pickerOptionText}>{staff.name}</Text>
                          <Text style={styles.pickerOptionSubtext}>
                            {staff.specialties.map(s => CATEGORIES.find(c => c.value === s)?.label || s).join(', ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Location Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.locationTypeButton,
                  locationType === 'salon' && styles.locationTypeButtonActive,
                ]}
                onPress={() => setLocationType('salon')}
              >
                <Text
                  style={[
                    styles.locationTypeText,
                    locationType === 'salon' && styles.locationTypeTextActive,
                  ]}
                >
                  Salon
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationTypeButton,
                  locationType === 'home' && styles.locationTypeButtonActive,
                ]}
                onPress={() => setLocationType('home')}
              >
                <Text
                  style={[
                    styles.locationTypeText,
                    locationType === 'home' && styles.locationTypeTextActive,
                  ]}
                >
                  Home Service
                </Text>
              </TouchableOpacity>
            </View>

            {locationType === 'home' && (
              <Input
                label="Client Address"
                value={clientAddress}
                onChangeText={setClientAddress}
                placeholder="Enter client address"
                multiline
                numberOfLines={3}
              />
            )}
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
            title={loading ? 'Creating...' : 'Create Booking'}
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

export default CreateBookingModal;

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
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  pickerContainer: {
    position: 'relative',
    zIndex: 1,
  },
  pickerButton: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  pickerButtonText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.textLight,
  },
  helperText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  pickerDropdown: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
  },
  pickerOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  pickerOptionSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  dateInput: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  dateDisplay: {
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
  },
  timeButton: {
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
  timeText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  timePickerDropdown: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 200,
  },
  timePickerScroll: {
    maxHeight: 200,
  },
  timeSlot: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timeSlotSelected: {
    backgroundColor: COLORS.chipBackground,
  },
  timeSlotText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  timeSlotTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  locationTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  locationTypeButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
  },
  locationTypeButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipBackground,
  },
  locationTypeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  locationTypeTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
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
