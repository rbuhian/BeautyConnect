import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  format,
  parseISO,
  addDays,
  startOfWeek,
  isSameDay,
  isToday,
} from 'date-fns';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../constants';
import { Booking } from '../types';

interface WeekTimelineProps {
  selectedDate: string;
  bookings: Booking[];
  onDateSelect: (date: string) => void;
  onBookingPress: (booking: Booking) => void;
  onEmptySlotPress?: (date: string, time: string) => void;
  getStaffColor: (staffId: string) => string;
  getStatusColor: (status: string) => string;
  isSalon: boolean;
}

const SLOT_HEIGHT = 60; // Height for 30-min slot
const START_HOUR = 8; // 8 AM
const END_HOUR = 20; // 8 PM

// Generate time slots from start to end hour
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < END_HOUR) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }
  return slots;
};

// Get week dates starting from Sunday
const getWeekDates = (date: Date): Date[] => {
  const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

// Calculate position for a booking based on time slot
const getBookingPosition = (timeSlot: string): number => {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = START_HOUR * 60;
  return ((totalMinutes - startMinutes) / 30) * SLOT_HEIGHT;
};

// Calculate height based on duration
const getBookingHeight = (durationMinutes: number): number => {
  return (durationMinutes / 30) * SLOT_HEIGHT;
};

const WeekTimeline = React.memo(function WeekTimeline({
  selectedDate,
  bookings,
  onDateSelect,
  onBookingPress,
  onEmptySlotPress,
  getStaffColor,
  getStatusColor,
  isSalon,
}: WeekTimelineProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const weekDates = getWeekDates(parseISO(selectedDate));
  const timeSlots = generateTimeSlots();

  // Filter bookings for selected date
  const selectedDateBookings = bookings.filter(
    booking => booking.date === selectedDate
  );

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
      const scrollPosition = ((currentHour - START_HOUR) * 2) * SLOT_HEIGHT;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: true });
      }, 100);
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Week Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.weekSelector}
        contentContainerStyle={styles.weekSelectorContent}
      >
        {weekDates.map(date => {
          const dateString = format(date, 'yyyy-MM-dd');
          const isSelected = isSameDay(date, parseISO(selectedDate));
          const isTodayDate = isToday(date);

          return (
            <TouchableOpacity
              key={dateString}
              onPress={() => onDateSelect(dateString)}
              style={[
                styles.dayChip,
                isSelected && styles.dayChipSelected,
                isTodayDate && !isSelected && styles.dayChipToday,
              ]}
            >
              <Text
                style={[
                  styles.dayLabel,
                  isSelected && styles.dayLabelSelected,
                  isTodayDate && !isSelected && styles.dayLabelToday,
                ]}
              >
                {format(date, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isTodayDate && !isSelected && styles.dayNumberToday,
                ]}
              >
                {format(date, 'd')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Timeline */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.timeline}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.timelineContent}>
          {/* Time slots */}
          {timeSlots.map((slot, index) => (
            <View key={slot} style={styles.timeSlot}>
              <View style={styles.timeLabel}>
                <Text style={styles.timeLabelText}>
                  {format(parseISO(`2000-01-01T${slot}`), 'h:mm a')}
                </Text>
              </View>
              <View style={styles.slotLine} />
            </View>
          ))}

          {/* Bookings overlay */}
          <View style={styles.bookingsOverlay}>
            {selectedDateBookings.map(booking => {
              const top = getBookingPosition(booking.time_slot);
              const height = getBookingHeight(
                booking.service?.duration_minutes || 60
              );
              const staffColor = booking.staff_member_id
                ? getStaffColor(booking.staff_member_id)
                : COLORS.primary;

              return (
                <TouchableOpacity
                  key={booking.id}
                  style={[
                    styles.bookingBlock,
                    {
                      top,
                      height: Math.max(height, SLOT_HEIGHT * 0.8), // Minimum height
                      borderLeftColor: isSalon ? staffColor : COLORS.primary,
                    },
                  ]}
                  onPress={() => onBookingPress(booking)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bookingContent}>
                    {/* Time */}
                    <Text style={styles.bookingTime} numberOfLines={1}>
                      {booking.time_slot}
                    </Text>

                    {/* Client name */}
                    <Text style={styles.bookingClient} numberOfLines={1}>
                      {booking.client?.name || 'Client'}
                    </Text>

                    {/* Service name */}
                    <Text style={styles.bookingService} numberOfLines={1}>
                      {booking.service?.name || 'Service'}
                    </Text>

                    {/* Staff name (salon only) */}
                    {isSalon && booking.staff_member && (
                      <Text style={styles.bookingStaff} numberOfLines={1}>
                        {booking.staff_member.name}
                      </Text>
                    )}

                    {/* Status badge */}
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(booking.status) },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

export default WeekTimeline;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekSelector: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  weekSelectorContent: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  dayChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    minWidth: 60,
    alignItems: 'center',
  },
  dayChipSelected: {
    backgroundColor: COLORS.primary,
  },
  dayChipToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dayLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  dayLabelSelected: {
    color: COLORS.white,
  },
  dayLabelToday: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: COLORS.white,
  },
  dayNumberToday: {
    color: COLORS.primary,
  },
  timeline: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  timelineContent: {
    position: 'relative',
    paddingBottom: SPACING.xxl,
  },
  timeSlot: {
    height: SLOT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeLabel: {
    width: 80,
    paddingRight: SPACING.sm,
    paddingTop: 4,
  },
  timeLabelText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  slotLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 8,
  },
  bookingsOverlay: {
    position: 'absolute',
    left: 80,
    right: 0,
    top: 0,
    bottom: 0,
    paddingRight: SPACING.md,
  },
  bookingBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 4,
    padding: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingContent: {
    flex: 1,
    position: 'relative',
  },
  bookingTime: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  bookingClient: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 1,
  },
  bookingService: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 1,
  },
  bookingStaff: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statusDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
