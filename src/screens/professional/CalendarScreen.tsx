import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isToday,
  isTomorrow,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  List,
  Filter,
  Plus,
  Ban,
} from 'lucide-react-native';

import { useAuth } from '../../hooks/useAuth';
import { Booking, BookingStatus, StaffMember } from '../../types';
import { getBookingsByDateRange, getBusinessBookingsByDateRange } from '../../services/calendar';
import { getActiveStaffMembers } from '../../services/business';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';

type ViewMode = 'month' | 'week';

export default function CalendarScreen({ navigation }: any) {
  const { user, professionalProfile } = useAuth();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [statusFilters, setStatusFilters] = useState<BookingStatus[]>([
    'pending',
    'confirmed',
  ]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const isSalon = !!professionalProfile?.business;
  const businessId = professionalProfile?.business?.id;

  // Load staff members if salon
  useEffect(() => {
    const loadStaffMembers = async () => {
      if (!isSalon || !businessId) return;

      const result = await getActiveStaffMembers(businessId);
      if (result.data) {
        setStaffMembers(result.data);
      }
    };

    loadStaffMembers();
  }, [isSalon, businessId]);

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    if (!professionalProfile) return;

    try {
      const startDate = format(
        startOfMonth(parseISO(selectedDate)),
        'yyyy-MM-dd'
      );
      const endDate = format(endOfMonth(parseISO(selectedDate)), 'yyyy-MM-dd');

      let result;
      if (isSalon && businessId) {
        // Salon: fetch all staff bookings
        result = await getBusinessBookingsByDateRange(
          businessId,
          startDate,
          endDate,
          selectedStaffIds.length > 0 ? selectedStaffIds : undefined,
          statusFilters.length > 0 ? statusFilters : undefined
        );
      } else {
        // Solo: fetch professional bookings
        result = await getBookingsByDateRange(
          professionalProfile.id,
          startDate,
          endDate,
          statusFilters.length > 0 ? statusFilters : undefined
        );
      }

      if (result.data) {
        setBookings(result.data);
        generateMarkedDates(result.data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    professionalProfile,
    selectedDate,
    statusFilters,
    selectedStaffIds,
    isSalon,
    businessId,
  ]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Generate marked dates for calendar
  const generateMarkedDates = (bookingsData: Booking[]) => {
    const marked: Record<string, any> = {};

    // Group bookings by date
    const bookingsByDate: Record<string, Booking[]> = {};
    bookingsData.forEach(booking => {
      if (!bookingsByDate[booking.date]) {
        bookingsByDate[booking.date] = [];
      }
      bookingsByDate[booking.date].push(booking);
    });

    // Create marked dates
    Object.keys(bookingsByDate).forEach(date => {
      const dateBookings = bookingsByDate[date];
      const dots = dateBookings.map(booking => ({
        color: getStatusColor(booking.status),
      }));

      marked[date] = {
        marked: true,
        dots: dots.slice(0, 3), // Show max 3 dots
        count: dateBookings.length,
      };
    });

    // Mark selected date
    if (marked[selectedDate]) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: COLORS.primary,
      };
    } else {
      marked[selectedDate] = {
        selected: true,
        selectedColor: COLORS.primary,
      };
    }

    setMarkedDates(marked);
  };

  // Get status color
  const getStatusColor = (status: BookingStatus): string => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'confirmed':
        return COLORS.success;
      case 'completed':
        return COLORS.primary;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  // Get staff color
  const getStaffColor = (staffId: string): string => {
    const colors = [
      '#8B5CF6',
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#EC4899',
      '#14B8A6',
    ];
    const hash = staffId
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      // Status filter
      if (
        statusFilters.length > 0 &&
        !statusFilters.includes(booking.status)
      ) {
        return false;
      }
      // Staff filter (salon only)
      if (selectedStaffIds.length > 0) {
        return (
          booking.staff_member_id &&
          selectedStaffIds.includes(booking.staff_member_id)
        );
      }
      return true;
    });
  }, [bookings, statusFilters, selectedStaffIds]);

  // Get bookings for selected date
  const bookingsForSelectedDate = useMemo(() => {
    return filteredBookings.filter(booking => booking.date === selectedDate);
  }, [filteredBookings, selectedDate]);

  // Format booking date
  const formatBookingDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  // Handle date selection
  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    if (viewMode === 'month') {
      setViewMode('week');
    }
  };

  // Handle month change
  const handleMonthChange = (month: DateData) => {
    setSelectedDate(month.dateString);
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // Handle booking press
  const handleBookingPress = (booking: Booking) => {
    navigation.navigate('BookingDetail', { booking });
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={COLORS.textPrimary} />
            {(statusFilters.length < 4 || selectedStaffIds.length > 0) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewModeToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'month' && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode('month')}
        >
          <CalendarIcon
            size={18}
            color={
              viewMode === 'month' ? COLORS.white : COLORS.textSecondary
            }
          />
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === 'month' && styles.toggleButtonTextActive,
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === 'week' && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode('week')}
        >
          <List
            size={18}
            color={viewMode === 'week' ? COLORS.white : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === 'week' && styles.toggleButtonTextActive,
            ]}
          >
            Week
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewMode === 'month' ? (
          /* Month View */
          <View style={styles.content}>
            <Calendar
              current={selectedDate}
              onDayPress={handleDayPress}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              markingType="multi-dot"
              theme={{
                backgroundColor: COLORS.background,
                calendarBackground: COLORS.white,
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.white,
                todayTextColor: COLORS.primary,
                dayTextColor: COLORS.textPrimary,
                textDisabledColor: COLORS.textLight,
                monthTextColor: COLORS.textPrimary,
                textMonthFontWeight: '600',
                textDayFontSize: FONT_SIZES.sm,
                textMonthFontSize: FONT_SIZES.lg,
                textDayHeaderFontSize: FONT_SIZES.xs,
                arrowColor: COLORS.primary,
              }}
              style={styles.calendar}
            />

            {/* Selected Date Bookings */}
            <View style={styles.selectedDateSection}>
              <Text style={styles.sectionTitle}>
                {formatBookingDate(selectedDate)}
              </Text>

              {bookingsForSelectedDate.length === 0 ? (
                <EmptyState
                  icon={<CalendarIcon size={48} color={COLORS.textLight} />}
                  title="No bookings"
                  description={`No bookings for ${formatBookingDate(selectedDate)}`}
                />
              ) : (
                bookingsForSelectedDate.map(booking => (
                  <TouchableOpacity
                    key={booking.id}
                    onPress={() => handleBookingPress(booking)}
                  >
                    <Card style={styles.bookingCard}>
                      {isSalon && booking.staff_member_id && (
                        <View
                          style={[
                            styles.staffIndicator,
                            {
                              backgroundColor: getStaffColor(
                                booking.staff_member_id
                              ),
                            },
                          ]}
                        />
                      )}
                      <View style={styles.bookingContent}>
                        <View style={styles.bookingHeader}>
                          <Text style={styles.bookingTime}>
                            {booking.time_slot}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: getStatusColor(
                                  booking.status
                                ),
                              },
                            ]}
                          >
                            <Text style={styles.statusText}>
                              {booking.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.bookingClient}>
                          {booking.client?.name}
                        </Text>
                        <Text style={styles.bookingService}>
                          {booking.service?.name}
                        </Text>
                        {isSalon && booking.staff_member && (
                          <Text style={styles.bookingStaff}>
                            Staff: {booking.staff_member.name}
                          </Text>
                        )}
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        ) : (
          /* Week View - Placeholder for now */
          <View style={styles.content}>
            <Text style={styles.placeholderText}>
              Week view coming in next phase
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="Create Booking"
            onPress={() => setShowCreateModal(true)}
            icon={<Plus size={20} color={COLORS.white} />}
            variant="primary"
            style={styles.actionButton}
          />
          <Button
            title="Block Time"
            onPress={() => setShowBlockModal(true)}
            icon={<Ban size={20} color={COLORS.primary} />}
            variant="outline"
            style={styles.actionButton}
          />
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modals - Placeholders */}
      {/* TODO: Implement FilterModal, CreateBookingModal, BlockTimeModal */}
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
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    padding: SPACING.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  viewModeToggle: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    gap: SPACING.xs,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  toggleButtonTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  calendar: {
    borderRadius: RADIUS.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedDateSection: {
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  bookingCard: {
    marginBottom: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  staffIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  bookingContent: {
    paddingLeft: SPACING.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  bookingTime: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
    textTransform: 'capitalize',
  },
  bookingClient: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  bookingService: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  bookingStaff: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  placeholderText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
  actionButtons: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  actionButton: {
    marginBottom: SPACING.sm,
  },
});
