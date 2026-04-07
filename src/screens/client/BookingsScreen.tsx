import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  User,
} from 'lucide-react-native';
import { Card, Loading, EmptyState, SkeletonList } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Booking } from '../../types';
import { getClientBookings } from '../../services/client';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FFF3E0', text: '#E65100' },
  confirmed: { bg: '#E8F5E9', text: '#2E7D32' },
  completed: { bg: '#E3F2FD', text: '#1565C0' },
  cancelled: { bg: '#FFEBEE', text: '#C62828' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Confirmation',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function BookingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [upcomingResult, pastResult] = await Promise.all([
        getClientBookings(user.id, 'upcoming'),
        getClientBookings(user.id, 'past'),
      ]);

      if (upcomingResult.data) {
        setUpcomingBookings(upcomingResult.data);
      }
      if (pastResult.data) {
        setPastBookings(pastResult.data);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const formatTime = useCallback((time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  }, []);

  const renderBookingCard = useCallback(({ item }: { item: Booking }) => {
    const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const proName = (item.professional as any)?.user?.name || 'Beauty Professional';
    const proAvatar = (item.professional as any)?.user?.avatar;
    const serviceName = (item.service as any)?.name || 'Service';
    const staffMember = item.staff_member as { id: string; name: string; avatar: string | null } | null;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id, booking: item })}
        activeOpacity={0.9}
      >
        <Card style={styles.bookingCard}>
          <View style={styles.cardHeader}>
            <View style={styles.proInfo}>
              {proAvatar ? (
                <Image source={{ uri: proAvatar }} style={styles.proAvatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.proAvatar}
                >
                  <Text style={styles.proInitial}>
                    {proName[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.proDetails}>
                <Text style={styles.proName} numberOfLines={1}>
                  {proName}
                </Text>
                <Text style={styles.serviceName} numberOfLines={1}>
                  {serviceName}
                </Text>
                {staffMember && (
                  <View style={styles.staffRow}>
                    <User size={12} color={COLORS.textSecondary} />
                    <Text style={styles.staffName} numberOfLines={1}>
                      with {staffMember.name}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}
            >
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Calendar size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{formatTime(item.time_slot)}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>
                {item.location_type === 'salon' ? 'At Salon' : 'Home Service'}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.priceLabel}>Total</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceValue}>
                ₱{item.total_price?.toLocaleString()}
              </Text>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }, [navigation, formatDate, formatTime]);

  const bookings = useMemo(
    () => (activeTab === 'upcoming' ? upcomingBookings : pastBookings),
    [activeTab, upcomingBookings, pastBookings]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}
          >
            Upcoming ({upcomingBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text
            style={[styles.tabText, activeTab === 'past' && styles.tabTextActive]}
          >
            Past ({pastBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList type="booking" count={4} />
        </View>
      ) : bookings.length === 0 ? (
        <EmptyState
          type={activeTab === 'upcoming' ? 'bookings' : 'history'}
          actionLabel={activeTab === 'upcoming' ? 'Discover Professionals' : undefined}
          onAction={activeTab === 'upcoming' ? () => navigation.navigate('Discover') : undefined}
        />
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  skeletonContainer: {
    padding: SPACING.lg,
  },
  bookingCard: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  proInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  proAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  proInitial: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  proDetails: {
    flex: 1,
  },
  proName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  staffName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  priceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  priceValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
