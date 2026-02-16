import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Star,
  X,
  Navigation,
  User,
} from 'lucide-react-native';
import { Card, Loading, Button } from '../../components';
import PaymentWebView from '../../components/PaymentWebView';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CANCELLATION_HOURS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Booking } from '../../types';
import { getBookingById, cancelBooking, hasReviewedBooking } from '../../services/client';
import { getBookingReview } from '../../services/review';
import { sendBookingCancelledNotification } from '../../services/notifications';
import { createDepositCheckout, waitForDepositPayment } from '../../services/payment';
import { Review } from '../../types';

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

export default function BookingDetailScreen({ navigation, route }: any) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [payingDeposit, setPayingDeposit] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await getBookingById(bookingId);
      if (result.data) {
        setBooking(result.data);

        if (result.data.status === 'completed') {
          const reviewResult = await hasReviewedBooking(bookingId, user.id);
          setHasReviewed(reviewResult.data || false);

          // Fetch the review if it exists
          if (reviewResult.data) {
            const myReviewResult = await getBookingReview(bookingId, user.id);
            if (myReviewResult.data) {
              setMyReview(myReviewResult.data);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId, user?.id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Refresh booking when returning from WriteReviewScreen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchBooking();
    });
    return unsubscribe;
  }, [navigation, fetchBooking]);

  const canCancel = () => {
    if (!booking) return false;
    if (booking.status !== 'pending' && booking.status !== 'confirmed') return false;

    const bookingDateTime = new Date(`${booking.date}T${booking.time_slot}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilBooking >= CANCELLATION_HOURS;
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? Your deposit may be forfeited if cancelling within 24 hours of the appointment.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id || !booking) return;
            setCancelling(true);
            try {
              const result = await cancelBooking(bookingId, user.id);
              if (result.error) {
                Alert.alert('Error', result.error.message);
              } else {
                // Send notification to professional
                const professionalUserId = (booking.professional as any)?.user_id;
                if (professionalUserId) {
                  const formattedDate = new Date(booking.date).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                  });
                  await sendBookingCancelledNotification(
                    professionalUserId,
                    user.name || 'Client',
                    (booking.service as any)?.name || 'Service',
                    formattedDate,
                    bookingId
                  );
                }

                Alert.alert('Booking Cancelled', 'Your booking has been cancelled.');
                fetchBooking();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel booking');
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handlePayDeposit = async () => {
    if (!booking) return;
    setPayingDeposit(true);
    try {
      const serviceName = (booking.service as any)?.name || 'Service';
      const result = await createDepositCheckout(
        booking.id,
        booking.deposit_amount,
        serviceName
      );

      if (result.data) {
        setPaymentUrl(result.data.checkoutUrl);
        setShowPayment(true);
      } else {
        Alert.alert('Error', result.error?.message || 'Failed to start payment');
      }
    } catch {
      Alert.alert('Error', 'Failed to start payment. Please try again.');
    } finally {
      setPayingDeposit(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    if (!booking) return;

    const status = await waitForDepositPayment(booking.id);
    if (status === 'paid') {
      Alert.alert('Deposit Paid!', 'Your deposit has been received.');
    } else {
      Alert.alert('Payment Processing', 'Your payment is being processed. It may take a moment to reflect.');
    }
    fetchBooking();
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const handleCall = () => {
    const phone = (booking?.professional as any)?.user?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleMessage = () => {
    navigation.navigate('Chat', { bookingId: bookingId });
  };

  const handleDirections = () => {
    const address =
      booking?.location_type === 'salon'
        ? (booking?.professional as any)?.salon_address
        : booking?.client_address;

    if (address) {
      const encodedAddress = encodeURIComponent(address);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
    }
  };

  const handleReview = () => {
    navigation.navigate('WriteReview', {
      bookingId,
      professionalId: (booking?.professional as any)?.user_id,
      professionalName: (booking?.professional as any)?.user?.name,
      professionalAvatar: (booking?.professional as any)?.user?.avatar || null,
      serviceName: (booking?.service as any)?.name,
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PH', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return <Loading fullScreen message="Loading booking..." />;
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = STATUS_COLORS[booking.status] || STATUS_COLORS.pending;
  const proName = (booking.professional as any)?.user?.name || 'Beauty Professional';
  const proAvatar = (booking.professional as any)?.user?.avatar;
  const serviceName = (booking.service as any)?.name || 'Service';
  const serviceDuration = (booking.service as any)?.duration_minutes || 60;
  const staffMember = booking.staff_member as { id: string; name: string; avatar: string | null } | null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusCard, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>
            {STATUS_LABELS[booking.status]}
          </Text>
          {booking.status === 'pending' && (
            <Text style={styles.statusSubtext}>
              Waiting for professional to confirm
            </Text>
          )}
        </View>

        {/* Professional Card */}
        <Card style={styles.proCard}>
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
              <Text style={styles.proName}>{proName}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color="#FFB800" fill="#FFB800" />
                <Text style={styles.ratingText}>
                  {(booking.professional as any)?.avg_rating?.toFixed(1) || '5.0'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.proActions}>
            <TouchableOpacity style={styles.proActionButton} onPress={handleCall}>
              <Phone size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.proActionButton} onPress={handleMessage}>
              <MessageCircle size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Assigned Staff Member */}
        {staffMember && (
          <Card style={styles.staffCard}>
            <View style={styles.staffHeader}>
              <User size={16} color={COLORS.primary} />
              <Text style={styles.staffLabel}>Assigned Stylist</Text>
            </View>
            <View style={styles.staffInfo}>
              {staffMember.avatar ? (
                <Image source={{ uri: staffMember.avatar }} style={styles.staffAvatar} />
              ) : (
                <View style={styles.staffAvatarPlaceholder}>
                  <User size={16} color={COLORS.textSecondary} />
                </View>
              )}
              <Text style={styles.staffName}>{staffMember.name}</Text>
            </View>
          </Card>
        )}

        {/* Booking Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={18} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>{formatDate(booking.date)}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Clock size={18} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.detailLabel}>Time</Text>
              <Text style={styles.detailValue}>
                {formatTime(booking.time_slot)} ({serviceDuration} mins)
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>
                {booking.location_type === 'salon' ? 'At Salon' : 'Home Service'}
              </Text>
              {booking.location_type === 'salon' && (booking.professional as any)?.salon_address && (
                <Text style={styles.addressText}>
                  {(booking.professional as any).salon_address}
                </Text>
              )}
              {booking.location_type === 'home' && booking.client_address && (
                <Text style={styles.addressText}>{booking.client_address}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.directionsButton} onPress={handleDirections}>
              <Navigation size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Service & Pricing */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Service & Payment</Text>

          <View style={styles.serviceRow}>
            <Text style={styles.serviceLabel}>{serviceName}</Text>
            <Text style={styles.servicePrice}>
              ₱{booking.total_price?.toLocaleString()}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Deposit (30%)</Text>
            <View style={styles.paymentValue}>
              <Text style={styles.depositAmount}>
                ₱{booking.deposit_amount?.toLocaleString()}
              </Text>
              <Text
                style={[
                  styles.paymentStatus,
                  { color: booking.deposit_paid ? COLORS.success : COLORS.warning },
                ]}
              >
                {booking.deposit_paid ? 'Paid' : 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Balance Due</Text>
            <Text style={styles.balanceAmount}>
              ₱{((booking.total_price || 0) - (booking.deposit_amount || 0)).toLocaleString()}
            </Text>
          </View>
        </Card>

        {/* Pay Deposit Button */}
        {!booking.deposit_paid && (booking.status === 'pending' || booking.status === 'confirmed') && (
          <TouchableOpacity
            style={styles.payDepositButton}
            onPress={handlePayDeposit}
            disabled={payingDeposit}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.payDepositGradient}
            >
              <Text style={styles.payDepositText}>
                {payingDeposit ? 'Processing...' : `Pay Deposit — ₱${booking.deposit_amount?.toLocaleString()}`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Actions */}
        {booking.status === 'completed' && !hasReviewed && (
          <TouchableOpacity style={styles.reviewButton} onPress={handleReview}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.reviewButtonGradient}
            >
              <Star size={18} color={COLORS.white} />
              <Text style={styles.reviewButtonText}>Write a Review</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* My Review */}
        {booking.status === 'completed' && hasReviewed && myReview && (
          <Card style={styles.myReviewCard}>
            <View style={styles.myReviewHeader}>
              <Text style={styles.myReviewTitle}>Your Review</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    color="#FFB800"
                    fill={star <= myReview.rating ? '#FFB800' : 'transparent'}
                  />
                ))}
              </View>
            </View>
            {myReview.text && (
              <Text style={styles.myReviewText}>{myReview.text}</Text>
            )}
            <Text style={styles.myReviewDate}>
              Posted on {new Date(myReview.created_at).toLocaleDateString('en-PH', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </Card>
        )}

        {canCancel() && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={cancelling}
          >
            <X size={18} color={COLORS.error} />
            <Text style={styles.cancelButtonText}>
              {cancelling ? 'Cancelling...' : 'Cancel Booking'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Cancellation Policy */}
        <View style={styles.policyNote}>
          <Text style={styles.policyText}>
            Free cancellation up to {CANCELLATION_HOURS} hours before your appointment.
            Late cancellations may forfeit the deposit.
          </Text>
        </View>
      </ScrollView>

      <PaymentWebView
        visible={showPayment}
        checkoutUrl={paymentUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
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
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  statusCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  statusText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  statusSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  proInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  proAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  proInitial: {
    fontSize: FONT_SIZES.lg,
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
    marginBottom: SPACING.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  proActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  proActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffCard: {
    flexDirection: 'column',
    padding: SPACING.md,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  staffLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  staffAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  detailsCard: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  detailLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  addressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  directionsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  serviceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  servicePrice: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  paymentLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  paymentValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  depositAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  paymentStatus: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  reviewButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  reviewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  reviewButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    gap: SPACING.sm,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.error,
  },
  policyNote: {
    padding: SPACING.md,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
  },
  policyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  myReviewCard: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  myReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  myReviewTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 2,
  },
  myReviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  myReviewDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  payDepositButton: {
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  payDepositGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
  },
  payDepositText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
