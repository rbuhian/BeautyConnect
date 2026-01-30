import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  ChevronRight,
} from 'lucide-react-native';
import { Card, Loading, EmptyState } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Booking } from '../../types';
import { getStaffBookings, getStaffMemberByUserId } from '../../services/business';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF3E0', text: '#E65100' },
  confirmed: { bg: '#E8F5E9', text: '#2E7D32' },
  completed: { bg: '#E3F2FD', text: '#1565C0' },
  cancelled: { bg: '#FFEBEE', text: '#C62828' },
};

export default function StaffBookingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const fetchStaffMember = useCallback(async () => {
    if (!user?.id) return;
    try {
      const staffMember = await getStaffMemberByUserId(user.id);
      if (staffMember) {
        setStaffMemberId(staffMember.id);
        return staffMember.id;
      }
    } catch (err) {
      console.error('Error fetching staff member:', err);
    }
    return null;
  }, [user?.id]);

  const fetchBookings = useCallback(async (staffId?: string) => {
    const id = staffId || staffMemberId;
    if (!id) return;

    try {
      const status = activeTab === 'upcoming'
        ? ['pending', 'confirmed']
        : ['completed', 'cancelled'];
      const data = await getStaffBookings(id, status);
      setBookings(data as Booking[]);
    } catch (err) {
      console.error('Error fetching staff bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffMemberId, activeTab]);

  useEffect(() => {
    const init = async () => {
      const staffId = await fetchStaffMember();
      if (staffId) {
        fetchBookings(staffId);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (staffMemberId) {
      setLoading(true);
      fetchBookings();
    }
  }, [activeTab, staffMemberId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatBookingDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const renderBookingCard = ({ item }: { item: Booking }) => {
    const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const clientName = item.client?.name || 'Client';
    const clientAvatar = item.client?.avatar;
    const serviceName = item.service?.name || 'Service';

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('BookingDetail', { booking: item })}
        activeOpacity={0.9}
      >
        <Card style={styles.bookingCard}>
          <View style={styles.cardHeader}>
            <View style={styles.clientInfo}>
              {clientAvatar ? (
                <Image source={{ uri: clientAvatar }} style={styles.clientAvatar} />
              ) : (
                <View style={styles.clientAvatarPlaceholder}>
                  <User size={16} color={COLORS.textSecondary} />
                </View>
              )}
              <View style={styles.clientDetails}>
                <Text style={styles.clientName} numberOfLines={1}>
                  {clientName}
                </Text>
                <Text style={styles.serviceName} numberOfLines={1}>
                  {serviceName}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {item.status}
              </Text>
            </View>
          </View>

          <View style={styles.bookingDetails}>
            <View style={styles.detailItem}>
              <Calendar size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{formatBookingDate(item.date)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Clock size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{formatTime(item.time_slot)}</Text>
            </View>
            <View style={styles.detailItem}>
              <MapPin size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>
                {item.location_type === 'home' ? 'Home Service' : 'At Salon'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.priceText}>₱{item.total_price?.toLocaleString()}</Text>
            <ChevronRight size={20} color={COLORS.textSecondary} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen message="Loading your bookings..." />;
  }

  if (!staffMemberId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <View style={{ width: 40 }} />
        </View>
        <EmptyState
          icon="user"
          title="Not a Staff Member"
          message="You are not linked to any business as a staff member."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title={activeTab === 'upcoming' ? 'No Upcoming Bookings' : 'No Past Bookings'}
            message={
              activeTab === 'upcoming'
                ? "You don't have any upcoming appointments assigned to you."
                : "You don't have any completed or cancelled appointments."
            }
          />
        }
      />
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.chipBackground,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  bookingCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  clientAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientDetails: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  priceText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});
