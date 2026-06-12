import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Home, Building2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Loading } from '../../components';
import { BookingInterstitialAd } from '../../components/ads';
import { COLORS, SPACING, FONT_SIZES, RADIUS, AD_CONFIG } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Service, AdCreative } from '../../types';
import {
  getAvailableTimeSlots,
  createBooking,
  ProfessionalWithDetails,
} from '../../services/client';
import { getActiveAds } from '../../services/ads';
import { sendNewBookingNotification } from '../../services/notifications';
import { sendEmailNotification, BookingEmailData } from '../../services/email';
import StarRating from '../../components/StarRating';

const PAYMENT_METHODS = ['GCash', 'PayMaya', 'Banks'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

const AppLogo = require('../../../BeautyConnect.png');
const AVATAR_COLORS = ['#4DD9C0', '#E85D8A', '#F5C842', '#6B8EF5', '#E07B3A'];

interface BookingFlowProps {
  navigation: any;
  route: {
    params: {
      professionalId: string;
      serviceId: string;
      professional: ProfessionalWithDetails;
      service: Service;
    };
  };
}

export default function BookingFlowScreen({ navigation, route }: BookingFlowProps) {
  const { professionalId, service, professional } = route.params;
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<'home' | 'salon'>('salon');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialAd, setInterstitialAd] = useState<AdCreative | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  const showLocationStep =
    professional.location_type === 'both' || professional.location_type === 'home_service';

  // ── Helpers ──────────────────────────────────────────────────────────────

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-PH', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchTimeSlots = useCallback(async () => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    try {
      const result = await getAvailableTimeSlots(professionalId, selectedDate, service.duration_minutes);
      setAvailableSlots(result.data || []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [professionalId, selectedDate, service.duration_minutes]);

  useEffect(() => {
    if (selectedDate) fetchTimeSlots();
  }, [selectedDate, fetchTimeSlots]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(formatDate(date));
    setSelectedTime(null);
    setShowCalendar(false);
    setShowTimeModal(true);
  };

  const navigateToBookingDetail = async (bookingId: string, bookingData?: any) => {
    const lastShown = await AsyncStorage.getItem('last_interstitial_ts');
    const cooldownOk = !lastShown || Date.now() - parseInt(lastShown, 10) > AD_CONFIG.INTERSTITIAL_COOLDOWN_MS;
    if (cooldownOk) {
      const adResult = await getActiveAds('interstitial', 'client', [service.category]);
      if (adResult.data && adResult.data.length > 0) {
        setInterstitialAd(adResult.data[0]);
        setConfirmedBookingId(bookingId);
        setShowInterstitial(true);
        return;
      }
    }
    navigation.replace('BookingDetail', { bookingId, booking: bookingData });
  };

  const handleConfirmBooking = async () => {
    if (!user?.id || !selectedDate || !selectedTime) {
      Alert.alert('Required', 'Please select a date and time.');
      return;
    }
    if (!selectedPaymentMethod) {
      Alert.alert('Required', 'Please select a payment method.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createBooking({
        client_id: user.id,
        professional_id: professionalId,
        service_id: service.id,
        date: selectedDate,
        time_slot: selectedTime,
        location_type: locationType,
        deposit_amount: 0,
        total_price: service.price,
      });

      if (result.error) { Alert.alert('Error', result.error.message); return; }

      const bookingId = result.data?.id || '';

      if (professional.user_id) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const formattedDate = dateObj.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
        await sendNewBookingNotification(professional.user_id, user.name || 'Client', service.name, formattedDate, bookingId);

        const longDate = dateObj.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const [h, m] = selectedTime.split(':');
        const hour = parseInt(h);
        const timeFormatted = `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
        const locationText = locationType === 'home' ? 'Home Service' : professional.salon_address || 'At Salon';
        const emailData: BookingEmailData = {
          bookingId, clientName: user.name || 'Client',
          professionalName: professional.user?.name || 'Beauty Professional',
          serviceName: service.name, date: longDate, time: timeFormatted,
          locationText, depositAmount: 0, totalPrice: service.price,
        };
        sendEmailNotification(user.id, 'booking_new_client', emailData);
        sendEmailNotification(professional.user_id, 'booking_new_pro', emailData);
        const bookingDateTime = new Date(`${selectedDate}T${selectedTime}`);
        const reminderAt = new Date(bookingDateTime.getTime() - 24 * 60 * 60 * 1000);
        if (reminderAt > new Date()) {
          sendEmailNotification(user.id, 'booking_reminder', emailData, reminderAt);
          sendEmailNotification(professional.user_id, 'booking_reminder', emailData, reminderAt);
        }
      }

      navigateToBookingDetail(bookingId, result.data);
    } catch {
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const avatarBg = AVATAR_COLORS[0];
  const proInitials = professional.user?.name
    ? professional.user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <Image source={AppLogo} style={styles.logoImage} />
            <Text style={styles.logoText}>Maquillage.Ph</Text>
          </View>

          {/* Service name */}
          <Text style={styles.serviceName}>{service.name}</Text>

          {/* Date field */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Date:</Text>
            <TouchableOpacity style={styles.pill} onPress={() => setShowCalendar(true)}>
              <Text style={[styles.pillText, !selectedDate && styles.pillPlaceholder]}>
                {selectedDate ? formatDisplayDate(selectedDate) : 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time field */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Time:</Text>
            <TouchableOpacity
              style={[styles.pill, !selectedDate && styles.pillDisabled]}
              onPress={() => { if (selectedDate) setShowTimeModal(true); }}
              disabled={!selectedDate}
            >
              <Text style={[styles.pillText, !selectedTime && styles.pillPlaceholder]}>
                {selectedTime ? formatTime(selectedTime) : 'Select time'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location field (only if professional offers both/home) */}
          {showLocationStep && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Location:</Text>
              <TouchableOpacity style={styles.pill} onPress={() => setShowLocationModal(true)}>
                <Text style={styles.pillText}>
                  {locationType === 'home' ? 'Home Service' : 'At Salon'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Artist */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Artist:</Text>
            <View style={styles.artistRow}>
              <View style={[styles.artistAvatar, { backgroundColor: avatarBg }]}>
                {professional.user?.avatar ? (
                  <Image source={{ uri: professional.user.avatar }} style={styles.artistAvatarImg} />
                ) : (
                  <Text style={styles.artistInitials}>{proInitials}</Text>
                )}
              </View>
              <View>
                <Text style={styles.artistName}>{professional.user?.name || 'Beauty Artist'}</Text>
                <StarRating
                  rating={professional.avg_rating ?? 0}
                  size={18}
                  activeColor={COLORS.warning}
                  inactiveColor="rgba(255,255,255,0.3)"
                  spacing={2}
                />
              </View>
            </View>
          </View>

          {/* Price info */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>₱{service.price.toLocaleString()}</Text>
          </View>

          {/* Payment Method */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Payment Method:</Text>
            <TouchableOpacity style={styles.pill} onPress={() => setShowPaymentModal(true)}>
              <Text style={[styles.pillText, !selectedPaymentMethod && styles.pillPlaceholder]}>
                {selectedPaymentMethod || 'Select payment method'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Conditions */}
          <View style={styles.termsRow}>
            <TouchableOpacity
              onPress={() => setTermsAccepted(v => !v)}
              activeOpacity={0.7}
              style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
            >
              {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I agree to the{' '}
              <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>Terms and Conditions</Text>
              {' '}and{' '}
              <Text style={styles.termsLink} onPress={() => setShowCancellationModal(true)}>Cancellation Policy</Text>
            </Text>
          </View>

          {/* Terms Modal */}
          <Modal visible={showTermsModal} transparent animationType="slide" onRequestClose={() => setShowTermsModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Terms and Conditions</Text>
                  <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                    <X size={22} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.termsBody}>
                    {`By using Maquillage.Ph, you agree to the following:\n\n1. BOOKING\nBookings are confirmed upon acceptance by the service provider. Prices shown are final at time of booking.\n\n2. PAYMENTS\nPayment is made directly to the service provider using the selected payment method. Maquillage.Ph does not process payments.\n\n3. CONDUCT\nBoth clients and professionals are expected to behave respectfully. Harassment or misconduct will result in account termination.\n\n4. ACCURACY\nYou are responsible for providing accurate booking information including date, time, and location.\n\n5. CHANGES\nMaquillage.Ph reserves the right to update these terms at any time. Continued use of the app constitutes acceptance of updated terms.`}
                  </Text>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Cancellation Policy Modal */}
          <Modal visible={showCancellationModal} transparent animationType="slide" onRequestClose={() => setShowCancellationModal(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalSheet, { maxHeight: '80%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Cancellation Policy</Text>
                  <TouchableOpacity onPress={() => setShowCancellationModal(false)}>
                    <X size={22} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.termsBody}>
                    {`Cancellation terms for bookings on Maquillage.Ph:\n\n1. CLIENT CANCELLATIONS\nClients may cancel a booking before it is confirmed by the service provider at no penalty.\n\nOnce confirmed, cancellations are subject to the service provider's individual policy.\n\n2. PROVIDER CANCELLATIONS\nIf a service provider cancels a confirmed booking, the client will be notified immediately and may rebook with another provider.\n\n3. NO-SHOWS\nFailure to appear at the scheduled time without prior notice may result in account warnings or restrictions.\n\n4. DISPUTES\nAny disputes regarding cancellations should be resolved directly between the client and service provider. Maquillage.Ph is not liable for losses resulting from cancellations.`}
                  </Text>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Confirm */}
          <TouchableOpacity
            style={[styles.confirmBtn, (!selectedDate || !selectedTime || !selectedPaymentMethod || !termsAccepted || submitting) && styles.confirmBtnDisabled]}
            onPress={handleConfirmBooking}
            disabled={!selectedDate || !selectedTime || !selectedPaymentMethod || !termsAccepted || submitting}
          >
            <LinearGradient
              colors={['#E91E8C', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmText}>
                {submitting ? 'Confirming...' : 'Confirm'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* ── Calendar Modal ── */}
      <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <X size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.monthNav}>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                <ChevronLeft size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.monthText}>
                {currentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                <ChevronRight size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <Text key={d} style={styles.weekDayText}>{d}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {generateCalendarDays().map((day, i) => {
                if (!day) return <View key={`e-${i}`} style={styles.calDay} />;
                const dateStr = formatDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
                const isSelected = selectedDate === dateStr;
                const isDisabled = isDateDisabled(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.calDay, isSelected && styles.calDaySelected, isDisabled && styles.calDayDisabled]}
                    onPress={() => handleDateSelect(day)}
                    disabled={isDisabled}
                  >
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected, isDisabled && styles.calDayTextDisabled]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Time Slots Modal ── */}
      <Modal visible={showTimeModal} transparent animationType="slide" onRequestClose={() => setShowTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate ? formatDisplayDate(selectedDate) : 'Select Time'}
              </Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <X size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {loadingSlots ? (
              <Loading message="Loading available times..." />
            ) : availableSlots.length === 0 ? (
              <View style={styles.noSlots}>
                <Text style={styles.noSlotsText}>No available times for this date.</Text>
                <TouchableOpacity onPress={() => { setShowTimeModal(false); setShowCalendar(true); }}>
                  <Text style={styles.selectAnotherText}>Pick another date</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={styles.timeGrid}>
                  {availableSlots.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[styles.timeSlot, selectedTime === slot && styles.timeSlotSelected]}
                      onPress={() => { setSelectedTime(slot); setShowTimeModal(false); }}
                    >
                      <Text style={[styles.timeSlotText, selectedTime === slot && styles.timeSlotTextSelected]}>
                        {formatTime(slot)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Location Modal ── */}
      <Modal visible={showLocationModal} transparent animationType="slide" onRequestClose={() => setShowLocationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Service Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <X size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={styles.locationOptions}>
              {(professional.location_type === 'salon' || professional.location_type === 'both') && (
                <TouchableOpacity
                  style={[styles.locationCard, locationType === 'salon' && styles.locationCardSelected]}
                  onPress={() => { setLocationType('salon'); setShowLocationModal(false); }}
                >
                  <Building2 size={28} color={locationType === 'salon' ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.locationCardTitle, locationType === 'salon' && styles.locationCardTitleSelected]}>At Salon</Text>
                </TouchableOpacity>
              )}
              {(professional.location_type === 'home_service' || professional.location_type === 'both') && (
                <TouchableOpacity
                  style={[styles.locationCard, locationType === 'home' && styles.locationCardSelected]}
                  onPress={() => { setLocationType('home'); setShowLocationModal(false); }}
                >
                  <Home size={28} color={locationType === 'home' ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.locationCardTitle, locationType === 'home' && styles.locationCardTitleSelected]}>Home Service</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Payment Method Modal ── */}
      <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paymentModalSheet}
          >
            <LinearGradient
              colors={['#E91E8C', '#FF6B35']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.paymentModalHeader}
            >
              <Text style={styles.paymentModalTitle}>Payment Method</Text>
            </LinearGradient>
            <View style={styles.paymentMethodList}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodBtn,
                    selectedPaymentMethod === method && styles.paymentMethodBtnSelected,
                  ]}
                  onPress={() => { setSelectedPaymentMethod(method); setShowPaymentModal(false); }}
                >
                  <Text style={[
                    styles.paymentMethodText,
                    selectedPaymentMethod === method && styles.paymentMethodTextSelected,
                  ]}>
                    {method.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.paymentCancelBtn} onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.paymentCancelText}>Cancel</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* ── Interstitial Ad ── */}
      {showInterstitial && interstitialAd && confirmedBookingId && (
        <BookingInterstitialAd
          ad={interstitialAd}
          onClose={() => {
            setShowInterstitial(false);
            navigation.replace('BookingDetail', { bookingId: confirmedBookingId });
          }}
        />

      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  backBtn: {
    margin: SPACING.lg,
    marginBottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },

  // Logo
  logoRow: {
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  logoText: {
    fontSize: FONT_SIZES.xl,
    fontStyle: 'italic',
    color: COLORS.white,
    fontWeight: '400',
  },
  serviceName: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },

  // Fields
  fieldBlock: { marginBottom: SPACING.lg },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  pill: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  pillDisabled: { opacity: 0.5 },
  pillText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  pillPlaceholder: { color: COLORS.textSecondary },

  // Artist
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  artistAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artistAvatarImg: { width: 64, height: 64, borderRadius: 32 },
  artistInitials: { color: COLORS.white, fontWeight: '700', fontSize: 22 },
  artistName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },

  // Price
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  priceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZES.sm },
  priceValue: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: '600' },
  depositValue: { color: COLORS.warning, fontSize: FONT_SIZES.sm, fontWeight: '600' },

  // Confirm
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  checkboxChecked: {
    backgroundColor: COLORS.white,
  },
  checkmark: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.white,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  termsBody: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  confirmBtn: { marginTop: SPACING.xl },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmGradient: {
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.md + 2,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Calendar
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  monthText: { fontSize: FONT_SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  weekDays: { flexDirection: 'row', marginBottom: SPACING.sm },
  weekDayText: { flex: 1, textAlign: 'center', fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: '600' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDay: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: RADIUS.full },
  calDaySelected: { backgroundColor: COLORS.primary },
  calDayDisabled: { opacity: 0.3 },
  calDayText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  calDayTextSelected: { color: COLORS.white, fontWeight: '700' },
  calDayTextDisabled: { color: COLORS.textLight },

  // Time slots
  noSlots: { alignItems: 'center', padding: SPACING.xl },
  noSlotsText: { color: COLORS.textSecondary, fontSize: FONT_SIZES.md, marginBottom: SPACING.sm },
  selectAnotherText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT_SIZES.sm },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingBottom: SPACING.md },
  timeSlot: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeSlotSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeSlotText: { fontSize: FONT_SIZES.sm, color: COLORS.textPrimary },
  timeSlotTextSelected: { color: COLORS.white, fontWeight: '600' },

  // Payment method modal
  paymentModalSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    overflow: 'hidden',
    paddingBottom: SPACING.xl,
  },
  paymentModalHeader: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  paymentModalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  paymentMethodList: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  paymentMethodBtn: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  paymentMethodBtnSelected: {
    backgroundColor: COLORS.primary,
  },
  paymentMethodText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  paymentMethodTextSelected: {
    color: COLORS.white,
  },
  paymentCancelBtn: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  paymentCancelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZES.sm,
  },

  // Location
  locationOptions: { flexDirection: 'row', gap: SPACING.md, padding: SPACING.md },
  locationCard: {
    flex: 1, alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.lg, borderRadius: RADIUS.lg,
    borderWidth: 2, borderColor: COLORS.border,
  },
  locationCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  locationCardTitle: { fontSize: FONT_SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  locationCardTitleSelected: { color: COLORS.primary },
});
