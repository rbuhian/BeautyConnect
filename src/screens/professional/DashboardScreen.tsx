import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
  Star,
} from 'lucide-react-native';
import { ProfessionalTabScreenProps } from '../../navigation/types';
import { Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Booking, Review } from '../../types';
import {
  getUpcomingBookings,
  getProfessionalStats,
} from '../../services/professional';
import { getReviewsReceived, ReviewWithDetails } from '../../services/review';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

export default function DashboardScreen({
  navigation,
}: ProfessionalTabScreenProps<'Dashboard'>) {
  const { user, professionalProfile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!professionalProfile?.id || !user?.id) return;

    try {
      const [bookingsRes, statsRes, reviewsRes] = await Promise.all([
        getUpcomingBookings(professionalProfile.id),
        getProfessionalStats(professionalProfile.id),
        getReviewsReceived(user.id, 5), // Get last 5 reviews
      ]);

      if (bookingsRes.data) {
        setBookings(bookingsRes.data);
      }
      if (statsRes.data) {
        setStats(statsRes.data);
      }
      if (reviewsRes.data) {
        setReviews(reviewsRes.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professionalProfile?.id, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatBookingDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'confirmed':
        return COLORS.success;
      case 'completed':
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  if (loading) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  const todayBookings = bookings.filter((b) => isToday(parseISO(b.date)));
  const pendingBookings = bookings.filter((b) => b.status === 'pending');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hello, {user?.name?.split(' ')[0] || 'there'}!
            </Text>
            <Text style={styles.subGreeting}>
              {todayBookings.length > 0
                ? `You have ${todayBookings.length} booking${todayBookings.length > 1 ? 's' : ''} today`
                : 'No bookings scheduled for today'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Profile' as never)}
          >
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={24} color={COLORS.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Live Status Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('EditProfile' as never)}
        >
          <LinearGradient
            colors={
              professionalProfile?.is_live
                ? [COLORS.gradientStart, COLORS.gradientEnd]
                : [COLORS.textSecondary, COLORS.textLight]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.liveCard}
          >
            <View style={styles.liveContent}>
              <View
                style={[
                  styles.liveDot,
                  {
                    backgroundColor: professionalProfile?.is_live
                      ? '#4ADE80'
                      : COLORS.white,
                  },
                ]}
              />
              <Text style={styles.liveText}>
                {professionalProfile?.is_live
                  ? 'Your profile is live'
                  : 'Your profile is hidden'}
              </Text>
            </View>
            <Text style={styles.liveSubtext}>
              {professionalProfile?.is_live
                ? 'Clients can find and book you'
                : 'Tap to complete your profile and go live'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <CheckCircle size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>{stats.completedBookings}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF8E1' }]}>
              <AlertCircle size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.statValue}>{stats.pendingBookings}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
              <TrendingUp size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>
              ₱{stats.totalEarnings.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </Card>
        </View>

        {/* Pending Requests Section */}
        {pendingBookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Calendar' as never)}
              >
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>

            {pendingBookings.slice(0, 3).map((booking) => (
              <TouchableOpacity
                key={booking.id}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('BookingDetail', { booking })
                }
              >
                <Card style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingClientInfo}>
                      {booking.client?.avatar ? (
                        <Image
                          source={{ uri: booking.client.avatar }}
                          style={styles.clientAvatar}
                        />
                      ) : (
                        <View style={styles.clientAvatarPlaceholder}>
                          <User size={16} color={COLORS.textSecondary} />
                        </View>
                      )}
                      <View>
                        <Text style={styles.clientName}>
                          {booking.client?.name || 'Client'}
                        </Text>
                        <Text style={styles.serviceName}>
                          {booking.service?.name}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(booking.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(booking.status) },
                        ]}
                      >
                        {booking.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingDetails}>
                    <View style={styles.bookingDetail}>
                      <Calendar size={14} color={COLORS.textSecondary} />
                      <Text style={styles.bookingDetailText}>
                        {formatBookingDate(booking.date)}
                      </Text>
                    </View>
                    <View style={styles.bookingDetail}>
                      <Clock size={14} color={COLORS.textSecondary} />
                      <Text style={styles.bookingDetailText}>
                        {booking.time_slot}
                      </Text>
                    </View>
                    <View style={styles.bookingDetail}>
                      <MapPin size={14} color={COLORS.textSecondary} />
                      <Text style={styles.bookingDetailText}>
                        {booking.location_type === 'home' ? 'Home Service' : 'At Salon'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <Text style={styles.bookingPrice}>
                      ₱{booking.total_price?.toLocaleString()}
                    </Text>
                    <ChevronRight size={20} color={COLORS.textSecondary} />
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Bookings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Calendar' as never)}
            >
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          {bookings.filter((b) => b.status === 'confirmed').length === 0 ? (
            <Card style={styles.emptyCard}>
              <Calendar size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No upcoming bookings</Text>
              <Text style={styles.emptySubtext}>
                Confirmed bookings will appear here
              </Text>
            </Card>
          ) : (
            bookings
              .filter((b) => b.status === 'confirmed')
              .slice(0, 5)
              .map((booking) => (
                <TouchableOpacity
                  key={booking.id}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('BookingDetail', { booking })
                  }
                >
                  <Card style={styles.bookingCard}>
                    <View style={styles.bookingHeader}>
                      <View style={styles.bookingClientInfo}>
                        {booking.client?.avatar ? (
                          <Image
                            source={{ uri: booking.client.avatar }}
                            style={styles.clientAvatar}
                          />
                        ) : (
                          <View style={styles.clientAvatarPlaceholder}>
                            <User size={16} color={COLORS.textSecondary} />
                          </View>
                        )}
                        <View>
                          <Text style={styles.clientName}>
                            {booking.client?.name || 'Client'}
                          </Text>
                          <Text style={styles.serviceName}>
                            {booking.service?.name}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(booking.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(booking.status) },
                          ]}
                        >
                          {booking.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingDetails}>
                      <View style={styles.bookingDetail}>
                        <Calendar size={14} color={COLORS.textSecondary} />
                        <Text style={styles.bookingDetailText}>
                          {formatBookingDate(booking.date)}
                        </Text>
                      </View>
                      <View style={styles.bookingDetail}>
                        <Clock size={14} color={COLORS.textSecondary} />
                        <Text style={styles.bookingDetailText}>
                          {booking.time_slot}
                        </Text>
                      </View>
                      <View style={styles.bookingDetail}>
                        <MapPin size={14} color={COLORS.textSecondary} />
                        <Text style={styles.bookingDetailText}>
                          {booking.location_type === 'home'
                            ? 'Home Service'
                            : 'At Salon'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookingFooter}>
                      <Text style={styles.bookingPrice}>
                        ₱{booking.total_price?.toLocaleString()}
                      </Text>
                      <ChevronRight size={20} color={COLORS.textSecondary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ManageServices' as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <TrendingUp size={20} color="#1976D2" />
              </View>
              <Text style={styles.actionText}>Services</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Availability' as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Clock size={20} color={COLORS.success} />
              </View>
              <Text style={styles.actionText}>Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('EditProfile' as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <User size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.actionText}>Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Settings' as never)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                <Calendar size={20} color="#F57C00" />
              </View>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Reviews Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {professionalProfile && (
              <View style={styles.ratingBadge}>
                <Star size={14} color="#FFB800" fill="#FFB800" />
                <Text style={styles.ratingBadgeText}>
                  {professionalProfile.avg_rating?.toFixed(1) || '0.0'} ({professionalProfile.total_reviews || 0})
                </Text>
              </View>
            )}
          </View>

          {reviews.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Star size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No reviews yet</Text>
              <Text style={styles.emptySubtext}>
                Client reviews will appear here
              </Text>
            </Card>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    {review.reviewer?.avatar ? (
                      <Image
                        source={{ uri: review.reviewer.avatar }}
                        style={styles.reviewerAvatar}
                      />
                    ) : (
                      <View style={styles.reviewerAvatarPlaceholder}>
                        <User size={14} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <View style={styles.reviewerDetails}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer?.name || 'Client'}
                      </Text>
                      <Text style={styles.reviewServiceName}>
                        {review.service_name}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.reviewRating}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        color="#FFB800"
                        fill={star <= review.rating ? '#FFB800' : 'transparent'}
                      />
                    ))}
                  </View>
                </View>
                {review.text && (
                  <Text style={styles.reviewText} numberOfLines={2}>
                    {review.text}
                  </Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </Card>
            ))
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subGreeting: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  liveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  liveText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  liveSubtext: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  bookingCard: {
    marginBottom: SPACING.sm,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bookingClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  bookingDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  bookingPrice: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  ratingBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#F57C00',
  },
  reviewCard: {
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  reviewerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewServiceName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  reviewDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
});
