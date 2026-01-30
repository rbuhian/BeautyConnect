import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  User,
  Check,
  X,
  Navigation,
  Users,
  RefreshCw,
  ChevronRight,
} from 'lucide-react-native';
import { GradientButton, Card, Button } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { Booking, StaffMember } from '../../types';
import { updateBookingStatus } from '../../services/professional';
import { format, parseISO, differenceInHours } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import {
  sendBookingConfirmedNotification,
  sendBookingDeclinedNotification,
  sendBookingCancelledNotification,
  sendReviewRequestNotification,
  scheduleBookingReminder,
  sendStaffAssignedNotification,
} from '../../services/notifications';
import {
  getActiveStaffMembers,
  reassignBookingStaff,
} from '../../services/business';
import { getBookingReview } from '../../services/review';

export default function BookingDetailScreen({ navigation, route }: any) {
  const { booking: initialBooking } = route.params as { booking: Booking };
  const { user, professionalProfile } = useAuth();
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [loading, setLoading] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [hasReviewedClient, setHasReviewedClient] = useState(false);
  const [myReview, setMyReview] = useState<any>(null);

  const hasBusiness = !!professionalProfile?.business;

  useEffect(() => {
    if (hasBusiness && professionalProfile?.business?.id) {
      loadStaffMembers();
    }
  }, [hasBusiness, professionalProfile?.business?.id]);

  // Check if professional has reviewed the client
  useEffect(() => {
    const checkReview = async () => {
      if (!user?.id || booking.status !== 'completed') return;

      try {
        const { data } = await getBookingReview(booking.id, user.id);
        if (data) {
          setHasReviewedClient(true);
          setMyReview(data);
        } else {
          setHasReviewedClient(false);
          setMyReview(null);
        }
      } catch (err) {
        console.error('Error checking review status:', err);
      }
    };

    checkReview();
  }, [booking.id, booking.status, user?.id]);

  const loadStaffMembers = async () => {
    if (!professionalProfile?.business?.id) return;
    setLoadingStaff(true);
    try {
      const staff = await getActiveStaffMembers(professionalProfile.business.id);
      setStaffMembers(staff);
    } catch (err) {
      console.error('Error loading staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleReassignStaff = async (staffMember: StaffMember | null) => {
    setReassigning(true);
    try {
      await reassignBookingStaff(booking.id, staffMember?.id || null);

      // Update local booking state with type assertion
      const updatedBooking = {
        ...booking,
        staff_member_id: staffMember?.id || null,
        staff_member: staffMember ? {
          id: staffMember.id,
          name: staffMember.name,
          avatar: staffMember.avatar,
        } : undefined,
      } as Booking;
      setBooking(updatedBooking);

      // Send notification to staff member if they have a user account
      if (staffMember?.user_id) {
        await sendStaffAssignedNotification(
          staffMember.user_id,
          booking.client?.name || 'Client',
          booking.service?.name || 'Service',
          format(parseISO(booking.date), 'MMM d, yyyy'),
          booking.id
        );
      }

      setShowStaffModal(false);
      Alert.alert(
        'Success',
        staffMember
          ? `Booking reassigned to ${staffMember.name}`
          : 'Staff assignment removed'
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to reassign staff member');
    } finally {
      setReassigning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'EEEE, MMMM d, yyyy');
  };

  const getStatusColor = (status: string) => {
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

  const getStatusBackground = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFF8E1';
      case 'confirmed':
        return '#E8F5E9';
      case 'completed':
        return '#F3E5F5';
      case 'cancelled':
        return '#FFEBEE';
      default:
        return COLORS.chipBackground;
    }
  };

  const handleAccept = async () => {
    Alert.alert(
      'Accept Booking',
      'Are you sure you want to accept this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await updateBookingStatus(booking.id, 'confirmed');
              if (result.data) {
                setBooking(result.data);

                // Send notification to client
                if (booking.client_id) {
                  const formattedDate = format(parseISO(booking.date), 'MMM d, yyyy');
                  await sendBookingConfirmedNotification(
                    booking.client_id,
                    user?.name || 'Professional',
                    booking.service?.name || 'Service',
                    formattedDate,
                    booking.id
                  );

                  // Schedule reminder notification for both parties
                  const bookingDate = parseISO(booking.date);
                  await scheduleBookingReminder(
                    booking.client_id,
                    booking.service?.name || 'Service',
                    user?.name || 'Professional',
                    bookingDate,
                    booking.time_slot,
                    booking.id
                  );
                }

                Alert.alert('Success', 'Booking confirmed!');
              } else if (result.error) {
                Alert.alert('Error', result.error.message);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to accept booking.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDecline = async () => {
    Alert.alert(
      'Decline Booking',
      'Are you sure you want to decline this booking? The client will be notified and the deposit will be refunded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await updateBookingStatus(booking.id, 'cancelled', 'professional');
              if (result.data) {
                setBooking(result.data);

                // Send notification to client
                if (booking.client_id) {
                  await sendBookingDeclinedNotification(
                    booking.client_id,
                    user?.name || 'Professional',
                    booking.service?.name || 'Service',
                    booking.id
                  );
                }

                Alert.alert('Booking Declined', 'The client has been notified.');
              } else if (result.error) {
                Alert.alert('Error', result.error.message);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to decline booking.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleComplete = async () => {
    Alert.alert(
      'Mark as Completed',
      'Are you sure you want to mark this booking as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setLoading(true);
            try {
              const result = await updateBookingStatus(booking.id, 'completed');
              if (result.data) {
                setBooking(result.data);

                // Send review request notification to client
                if (booking.client_id) {
                  await sendReviewRequestNotification(
                    booking.client_id,
                    user?.name || 'Professional',
                    booking.service?.name || 'Service',
                    booking.id
                  );
                }

                Alert.alert('Success', 'Booking marked as completed!');
              } else if (result.error) {
                Alert.alert('Error', result.error.message);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to complete booking.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReviewClient = () => {
    navigation.navigate('WriteReview', {
      bookingId: booking.id,
      serviceName: booking.service?.name || 'Service',
      clientId: booking.client_id,
      clientName: booking.client?.name || 'Client',
      clientAvatar: booking.client?.avatar,
    });
  };

  const handleCancel = async () => {
    const bookingDate = parseISO(`${booking.date}T${booking.time_slot}`);
    const hoursUntil = differenceInHours(bookingDate, new Date());

    let message = 'Are you sure you want to cancel this booking?';
    if (hoursUntil < 24) {
      message += '\n\nNote: The deposit may not be refundable since the booking is less than 24 hours away.';
    }

    Alert.alert('Cancel Booking', message, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            const result = await updateBookingStatus(booking.id, 'cancelled', 'professional');
            if (result.data) {
              setBooking(result.data);

              // Send notification to client
              if (booking.client_id) {
                const formattedDate = format(parseISO(booking.date), 'MMM d');
                await sendBookingCancelledNotification(
                  booking.client_id,
                  user?.name || 'Professional',
                  booking.service?.name || 'Service',
                  formattedDate,
                  booking.id
                );
              }

              Alert.alert('Booking Cancelled', 'The client has been notified.');
            } else if (result.error) {
              Alert.alert('Error', result.error.message);
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to cancel booking.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const callClient = () => {
    if (booking.client?.phone) {
      Linking.openURL(`tel:${booking.client.phone}`);
    }
  };

  const openMaps = () => {
    if (booking.client_address) {
      const address = encodeURIComponent(booking.client_address);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: getStatusBackground(booking.status) },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Card style={styles.clientCard}>
            <View style={styles.clientHeader}>
              {booking.client?.avatar ? (
                <Image
                  source={{ uri: booking.client.avatar }}
                  style={styles.clientAvatar}
                />
              ) : (
                <View style={styles.clientAvatarPlaceholder}>
                  <User size={24} color={COLORS.textSecondary} />
                </View>
              )}
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>
                  {booking.client?.name || 'Client'}
                </Text>
                <Text style={styles.clientPhone}>{booking.client?.phone}</Text>
              </View>
            </View>
            <View style={styles.clientActions}>
              <TouchableOpacity style={styles.clientAction} onPress={callClient}>
                <Phone size={20} color={COLORS.primary} />
                <Text style={styles.clientActionText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clientAction}
                onPress={() => navigation.navigate('Chat', { bookingId: booking.id })}
              >
                <MessageCircle size={20} color={COLORS.primary} />
                <Text style={styles.clientActionText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Assigned Staff Member / Staff Assignment */}
        {hasBusiness && (booking.status === 'pending' || booking.status === 'confirmed') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {booking.staff_member ? 'Assigned Staff' : 'Assign Staff'}
            </Text>
            <Card style={styles.staffCard}>
              {booking.staff_member ? (
                <View style={styles.staffRow}>
                  <View style={styles.staffInfo}>
                    {(booking.staff_member as any)?.avatar ? (
                      <Image
                        source={{ uri: (booking.staff_member as any).avatar }}
                        style={styles.staffAvatar}
                      />
                    ) : (
                      <View style={styles.staffAvatarPlaceholder}>
                        <Users size={20} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <View style={styles.staffDetails}>
                      <Text style={styles.staffName}>
                        {(booking.staff_member as any)?.name || 'Staff Member'}
                      </Text>
                      <Text style={styles.staffSubtext}>Will handle this appointment</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.reassignButton}
                    onPress={() => setShowStaffModal(true)}
                  >
                    <RefreshCw size={16} color={COLORS.primary} />
                    <Text style={styles.reassignText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.assignStaffButton}
                  onPress={() => setShowStaffModal(true)}
                >
                  <Users size={20} color={COLORS.primary} />
                  <Text style={styles.assignStaffText}>Assign a staff member</Text>
                  <ChevronRight size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </Card>
          </View>
        )}

        {/* Show assigned staff for completed/cancelled bookings (read-only) */}
        {booking.staff_member && (booking.status === 'completed' || booking.status === 'cancelled') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Assigned Staff</Text>
            <Card style={styles.staffCard}>
              <View style={styles.staffInfo}>
                {(booking.staff_member as any)?.avatar ? (
                  <Image
                    source={{ uri: (booking.staff_member as any).avatar }}
                    style={styles.staffAvatar}
                  />
                ) : (
                  <View style={styles.staffAvatarPlaceholder}>
                    <Users size={20} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.staffDetails}>
                  <Text style={styles.staffName}>
                    {(booking.staff_member as any)?.name || 'Staff Member'}
                  </Text>
                  <Text style={styles.staffSubtext}>Handled this appointment</Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Service Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service</Text>
          <Card>
            <Text style={styles.serviceName}>{booking.service?.name}</Text>
            <View style={styles.serviceDetails}>
              <View style={styles.serviceDetail}>
                <Clock size={16} color={COLORS.textSecondary} />
                <Text style={styles.serviceDetailText}>
                  {booking.service?.duration_minutes} mins
                </Text>
              </View>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total Price</Text>
              <Text style={styles.priceValue}>
                ₱{booking.total_price?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.depositRow}>
              <Text style={styles.depositLabel}>
                Deposit {booking.deposit_paid ? '(Paid)' : '(Pending)'}
              </Text>
              <Text
                style={[
                  styles.depositValue,
                  { color: booking.deposit_paid ? COLORS.success : COLORS.warning },
                ]}
              >
                ₱{booking.deposit_amount?.toLocaleString()}
              </Text>
            </View>
          </Card>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <Card>
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIcon}>
                <Calendar size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.scheduleLabel}>Date</Text>
                <Text style={styles.scheduleValue}>{formatDate(booking.date)}</Text>
              </View>
            </View>
            <View style={styles.scheduleDivider} />
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIcon}>
                <Clock size={20} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.scheduleLabel}>Time</Text>
                <Text style={styles.scheduleValue}>{booking.time_slot}</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Card>
            <View style={styles.locationHeader}>
              <MapPin size={20} color={COLORS.primary} />
              <Text style={styles.locationType}>
                {booking.location_type === 'home' ? 'Home Service' : 'At Your Salon'}
              </Text>
            </View>
            {booking.location_type === 'home' && booking.client_address && (
              <>
                <Text style={styles.locationAddress}>{booking.client_address}</Text>
                <TouchableOpacity style={styles.directionsButton} onPress={openMaps}>
                  <Navigation size={16} color={COLORS.white} />
                  <Text style={styles.directionsText}>Get Directions</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {booking.status === 'pending' && (
            <>
              <GradientButton
                title="Accept Booking"
                onPress={handleAccept}
                loading={loading}
                style={styles.actionButton}
              />
              <Button
                title="Decline"
                onPress={handleDecline}
                variant="outline"
                style={styles.actionButton}
              />
            </>
          )}

          {booking.status === 'confirmed' && (
            <>
              <GradientButton
                title="Mark as Completed"
                onPress={handleComplete}
                loading={loading}
                style={styles.actionButton}
              />
              <Button
                title="Cancel Booking"
                onPress={handleCancel}
                variant="outline"
                style={[styles.actionButton, styles.cancelButton]}
              />
            </>
          )}

          {booking.status === 'completed' && (
            <>
              <View style={styles.completedBanner}>
                <Check size={24} color={COLORS.success} />
                <Text style={styles.completedText}>
                  This booking has been completed
                </Text>
              </View>

              {!hasReviewedClient && (
                <GradientButton
                  title="Review Client"
                  onPress={handleReviewClient}
                  style={styles.actionButton}
                />
              )}

              {hasReviewedClient && myReview && (
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
            </>
          )}

          {booking.status === 'cancelled' && (
            <View style={styles.cancelledBanner}>
              <X size={24} color={COLORS.error} />
              <Text style={styles.cancelledText}>
                This booking was cancelled
                {booking.cancelled_by === 'professional' ? ' by you' : ' by the client'}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Staff Selection Modal */}
      <Modal
        visible={showStaffModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStaffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Staff Member</Text>
              <TouchableOpacity onPress={() => setShowStaffModal(false)}>
                <X size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingStaff ? (
              <View style={styles.modalLoading}>
                <Text style={styles.modalLoadingText}>Loading staff...</Text>
              </View>
            ) : (
              <FlatList
                data={staffMembers}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={
                  booking.staff_member ? (
                    <TouchableOpacity
                      style={styles.staffOptionItem}
                      onPress={() => handleReassignStaff(null)}
                      disabled={reassigning}
                    >
                      <View style={styles.staffOptionAvatarPlaceholder}>
                        <X size={20} color={COLORS.textSecondary} />
                      </View>
                      <View style={styles.staffOptionDetails}>
                        <Text style={styles.staffOptionName}>Unassign Staff</Text>
                        <Text style={styles.staffOptionSubtext}>Remove staff assignment</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.staffOptionItem,
                      (booking.staff_member as any)?.id === item.id && styles.staffOptionSelected,
                    ]}
                    onPress={() => handleReassignStaff(item)}
                    disabled={reassigning}
                  >
                    {item.avatar ? (
                      <Image source={{ uri: item.avatar }} style={styles.staffOptionAvatar} />
                    ) : (
                      <View style={styles.staffOptionAvatarPlaceholder}>
                        <User size={20} color={COLORS.textSecondary} />
                      </View>
                    )}
                    <View style={styles.staffOptionDetails}>
                      <Text style={styles.staffOptionName}>{item.name}</Text>
                      {item.specialties && item.specialties.length > 0 && (
                        <Text style={styles.staffOptionSubtext}>
                          {item.specialties.slice(0, 2).join(', ')}
                        </Text>
                      )}
                    </View>
                    {(booking.staff_member as any)?.id === item.id && (
                      <Check size={20} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.modalEmpty}>
                    <Text style={styles.modalEmptyText}>No staff members found</Text>
                    <Text style={styles.modalEmptySubtext}>
                      Add staff members in Team Management
                    </Text>
                  </View>
                }
              />
            )}
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBanner: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  statusText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  clientCard: {
    padding: SPACING.lg,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  clientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  clientAvatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientInfo: {
    marginLeft: SPACING.md,
  },
  clientName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clientPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  clientActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  clientAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
  },
  clientActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  staffCard: {
    padding: SPACING.md,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  staffAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffDetails: {
    marginLeft: SPACING.md,
  },
  staffName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  staffSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  reassignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.sm,
  },
  reassignText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  assignStaffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  assignStaffText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  serviceName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  serviceDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  priceLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  priceValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  depositLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  depositValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  scheduleValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  scheduleDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  locationType: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  directionsText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.white,
  },
  actionsSection: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  actionButton: {
    width: '100%',
  },
  cancelButton: {
    borderColor: COLORS.error,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#E8F5E9',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  completedText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.success,
    fontWeight: '500',
  },
  myReviewCard: {
    padding: SPACING.md,
    marginTop: SPACING.sm,
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
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FFEBEE',
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  cancelledText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.error,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '70%',
    paddingBottom: SPACING.xl,
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
  modalLoading: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalLoadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  modalEmpty: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalEmptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  staffOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  staffOptionSelected: {
    backgroundColor: COLORS.chipBackground,
  },
  staffOptionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  staffOptionAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffOptionDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  staffOptionName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  staffOptionSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
