import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Home,
  Building2,
  Tag,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GradientButton, Card, Loading, Input } from '../../components';
import { BookingInterstitialAd } from '../../components/ads';
import { COLORS, SPACING, FONT_SIZES, RADIUS, DEPOSIT_PERCENTAGE, AD_CONFIG } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Service, AdCreative, Promotion } from '../../types';
import {
  getAvailableTimeSlots,
  createBooking,
  ProfessionalWithDetails,
} from '../../services/client';
import { getActiveAds } from '../../services/ads';
import { validatePromoCode, recordPromotionUse } from '../../services/promotions';
import { sendNewBookingNotification } from '../../services/notifications';
import { sendEmailNotification, BookingEmailData } from '../../services/email';
import { createDepositCheckout, waitForDepositPayment } from '../../services/payment';
import PaymentWebView from '../../components/PaymentWebView';

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

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [locationType, setLocationType] = useState<'home' | 'salon'>('salon');
  const [clientAddress, setClientAddress] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialAd, setInterstitialAd] = useState<AdCreative | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoError, setPromoError] = useState('');

  const finalPrice = service.price - promoDiscount;
  const depositAmount = finalPrice * DEPOSIT_PERCENTAGE;

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const formatDate = (date: Date) => {
    // Use local date components to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (day: number) => {
    if (isDateDisabled(day)) return;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(formatDate(date));
    setSelectedTime(null);
  };

  const fetchTimeSlots = useCallback(async () => {
    if (!selectedDate) return;

    setLoadingSlots(true);
    try {
      const result = await getAvailableTimeSlots(
        professionalId,
        selectedDate,
        service.duration_minutes
      );
      if (result.data) {
        setAvailableSlots(result.data);
      }
    } catch (err) {
      console.error('Error fetching time slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  }, [professionalId, selectedDate, service.duration_minutes]);

  useEffect(() => {
    if (step === 2 && selectedDate) {
      fetchTimeSlots();
    }
  }, [step, selectedDate, fetchTimeSlots]);

  const showLocationStep =
    professional.location_type === 'both' ||
    professional.location_type === 'home_service';

  const totalSteps = showLocationStep ? 4 : 3;

  const handleNext = () => {
    if (step === 1 && !selectedDate) {
      Alert.alert('Required', 'Please select a date');
      return;
    }
    if (step === 2 && !selectedTime) {
      Alert.alert('Required', 'Please select a time slot');
      return;
    }
    if (step === 3 && showLocationStep && locationType === 'home' && !clientAddress.trim()) {
      Alert.alert('Required', 'Please enter your address');
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const navigateToBookingDetail = async (bookingId: string) => {
    // Check if we should show an interstitial ad
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

    navigation.replace('BookingDetail', { bookingId });
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    setPromoError('');

    const result = await validatePromoCode(
      promoCode.trim(),
      professionalId,
      service.price
    );

    setPromoValidating(false);

    if (result.error) {
      setPromoError(result.error.message);
    } else if (result.data) {
      setAppliedPromo(result.data.promotion);
      setPromoDiscount(result.data.discountAmount);
      setPromoError('');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscount(0);
    setPromoCode('');
    setPromoError('');
  };

  const handleConfirmBooking = async () => {
    if (!user?.id || !selectedDate || !selectedTime) return;

    setSubmitting(true);
    try {
      const result = await createBooking({
        client_id: user.id,
        professional_id: professionalId,
        service_id: service.id,
        date: selectedDate,
        time_slot: selectedTime,
        location_type: locationType,
        client_address: locationType === 'home' ? clientAddress : undefined,
        deposit_amount: depositAmount,
        total_price: finalPrice,
      });

      if (result.error) {
        Alert.alert('Error', result.error.message);
        return;
      }

      const bookingId = result.data?.id || '';

      // Record promo use if a promo was applied
      if (appliedPromo && user.id && promoDiscount > 0) {
        await recordPromotionUse(appliedPromo.id, bookingId, user.id, promoDiscount);
      }

      // Send notification to professional about new booking
      if (professional.user_id) {
        const [year, month, day] = selectedDate.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        const formattedDate = dateObj.toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
        });
        await sendNewBookingNotification(
          professional.user_id,
          user.name || 'Client',
          service.name,
          formattedDate,
          bookingId
        );

        // Send email notifications (fire-and-forget)
        const longDate = dateObj.toLocaleDateString('en-PH', {
          weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
        });
        const [h, m] = selectedTime.split(':');
        const hour = parseInt(h);
        const timeFormatted = `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
        const locationText = locationType === 'home'
          ? 'Home Service'
          : professional.salon_address || 'At Salon';
        const emailData: BookingEmailData = {
          bookingId,
          clientName: user.name || 'Client',
          professionalName: professional.user?.name || 'Beauty Professional',
          serviceName: service.name,
          date: longDate,
          time: timeFormatted,
          locationText,
          depositAmount,
          totalPrice: finalPrice,
        };
        sendEmailNotification(user.id, 'booking_new_client', emailData);
        sendEmailNotification(professional.user_id, 'booking_new_pro', emailData);
        // Schedule 24h reminder for both parties
        const bookingDateTime = new Date(`${selectedDate}T${selectedTime}`);
        const reminderAt = new Date(bookingDateTime.getTime() - 24 * 60 * 60 * 1000);
        if (reminderAt > new Date()) {
          sendEmailNotification(user.id, 'booking_reminder', emailData, reminderAt);
          sendEmailNotification(professional.user_id, 'booking_reminder', emailData, reminderAt);
        }
      }

      // Initiate deposit payment
      const checkoutResult = await createDepositCheckout(
        bookingId,
        depositAmount,
        service.name
      );

      if (checkoutResult.data) {
        setConfirmedBookingId(bookingId);
        setPaymentUrl(checkoutResult.data.checkoutUrl);
        setShowPayment(true);
      } else {
        // Payment creation failed — booking created but deposit unpaid
        Alert.alert(
          'Booking Created',
          'Your booking was created but we couldn\'t start the payment. You can pay the deposit from the booking details.',
          [{ text: 'View Booking', onPress: () => navigateToBookingDetail(bookingId) }]
        );
      }
    } catch (err) {
      console.error('Booking error:', err);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    if (!confirmedBookingId) return;

    // Poll for webhook to update deposit_paid
    const status = await waitForDepositPayment(confirmedBookingId);

    if (status === 'paid') {
      Alert.alert(
        'Deposit Paid!',
        'Your deposit has been received. Your booking is confirmed.',
        [{ text: 'View Booking', onPress: () => navigateToBookingDetail(confirmedBookingId) }]
      );
    } else {
      Alert.alert(
        'Payment Processing',
        'Your payment is being processed. It may take a moment to reflect.',
        [{ text: 'View Booking', onPress: () => navigateToBookingDetail(confirmedBookingId) }]
      );
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    if (!confirmedBookingId) return;

    Alert.alert(
      'Deposit Not Paid',
      'Your booking was created but the deposit is still pending. You can pay later from the booking details.',
      [{ text: 'View Booking', onPress: () => navigateToBookingDetail(confirmedBookingId) }]
    );
  };

  const formatDisplayDate = (dateStr: string) => {
    // Parse the date string manually to avoid timezone issues
    // "YYYY-MM-DD" -> create date in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
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

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Date</Text>
      <Text style={styles.stepSubtitle}>Choose your preferred date</Text>

      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
          }
        >
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>
          {currentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity
          onPress={() =>
            setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
          }
        >
          <ChevronRight size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekDays}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Text key={day} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {generateCalendarDays().map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.calendarDay} />;
          }

          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
          const dateStr = formatDate(date);
          const isSelected = selectedDate === dateStr;
          const isDisabled = isDateDisabled(day);

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.calendarDay,
                isSelected && styles.calendarDaySelected,
                isDisabled && styles.calendarDayDisabled,
              ]}
              onPress={() => handleDateSelect(day)}
              disabled={isDisabled}
            >
              <Text
                style={[
                  styles.calendarDayText,
                  isSelected && styles.calendarDayTextSelected,
                  isDisabled && styles.calendarDayTextDisabled,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Time</Text>
      <Text style={styles.stepSubtitle}>
        {selectedDate ? formatDisplayDate(selectedDate) : ''}
      </Text>

      {loadingSlots ? (
        <Loading message="Loading available times..." />
      ) : availableSlots.length === 0 ? (
        <View style={styles.noSlots}>
          <Text style={styles.noSlotsText}>No available times for this date</Text>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Text style={styles.selectAnotherText}>Select another date</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.timeGrid}>
          {availableSlots.map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[
                styles.timeSlot,
                selectedTime === slot && styles.timeSlotSelected,
              ]}
              onPress={() => setSelectedTime(slot)}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  selectedTime === slot && styles.timeSlotTextSelected,
                ]}
              >
                {formatTime(slot)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep3Location = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Service Location</Text>
      <Text style={styles.stepSubtitle}>Where would you like the service?</Text>

      <View style={styles.locationOptions}>
        {(professional.location_type === 'salon' ||
          professional.location_type === 'both') && (
          <TouchableOpacity
            style={[
              styles.locationCard,
              locationType === 'salon' && styles.locationCardSelected,
            ]}
            onPress={() => setLocationType('salon')}
          >
            <Building2
              size={32}
              color={locationType === 'salon' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.locationCardTitle,
                locationType === 'salon' && styles.locationCardTitleSelected,
              ]}
            >
              At Salon
            </Text>
            {professional.salon_address && (
              <Text style={styles.locationCardAddress}>{professional.salon_address}</Text>
            )}
            {locationType === 'salon' && (
              <View style={styles.checkMark}>
                <Check size={16} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
        )}

        {(professional.location_type === 'home_service' ||
          professional.location_type === 'both') && (
          <TouchableOpacity
            style={[
              styles.locationCard,
              locationType === 'home' && styles.locationCardSelected,
            ]}
            onPress={() => setLocationType('home')}
          >
            <Home
              size={32}
              color={locationType === 'home' ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.locationCardTitle,
                locationType === 'home' && styles.locationCardTitleSelected,
              ]}
            >
              Home Service
            </Text>
            <Text style={styles.locationCardAddress}>I'll provide my address</Text>
            {locationType === 'home' && (
              <View style={styles.checkMark}>
                <Check size={16} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {locationType === 'home' && (
        <View style={styles.addressInput}>
          <Input
            label="Your Address"
            placeholder="Enter your complete address"
            value={clientAddress}
            onChangeText={setClientAddress}
            multiline
            numberOfLines={3}
          />
        </View>
      )}
    </View>
  );

  const renderSummary = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Booking Summary</Text>
      <Text style={styles.stepSubtitle}>Review your booking details</Text>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service</Text>
          <Text style={styles.summaryValue}>{service.name}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Professional</Text>
          <Text style={styles.summaryValue}>
            {professional.user?.name || 'Beauty Professional'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date</Text>
          <Text style={styles.summaryValue}>
            {selectedDate ? formatDisplayDate(selectedDate) : ''}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time</Text>
          <Text style={styles.summaryValue}>
            {selectedTime ? formatTime(selectedTime) : ''}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>{service.duration_minutes} minutes</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Location</Text>
          <Text style={styles.summaryValue}>
            {locationType === 'salon' ? 'At Salon' : 'Home Service'}
          </Text>
        </View>
        {locationType === 'home' && clientAddress && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Address</Text>
            <Text style={[styles.summaryValue, styles.addressText]}>{clientAddress}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Promo Code Section */}
        {!appliedPromo ? (
          <View style={styles.promoSection}>
            <Text style={styles.summaryLabel}>Promo Code</Text>
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                value={promoCode}
                onChangeText={t => {
                  setPromoCode(t.toUpperCase());
                  setPromoError('');
                }}
                placeholder="Enter code"
                placeholderTextColor={COLORS.textLight}
                autoCapitalize="characters"
                editable={!promoValidating}
              />
              <TouchableOpacity
                style={[styles.promoApplyButton, promoValidating && { opacity: 0.6 }]}
                onPress={handleApplyPromo}
                disabled={promoValidating || !promoCode.trim()}
              >
                <Tag size={16} color={COLORS.white} />
                <Text style={styles.promoApplyText}>{promoValidating ? '…' : 'Apply'}</Text>
              </TouchableOpacity>
            </View>
            {promoError ? (
              <Text style={styles.promoError}>{promoError}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.promoAppliedBanner}>
            <Tag size={16} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.promoAppliedCode}>{appliedPromo.code}</Text>
              <Text style={styles.promoAppliedDiscount}>
                −₱{promoDiscount.toLocaleString()} saved!
              </Text>
            </View>
            <TouchableOpacity onPress={handleRemovePromo}>
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Price</Text>
          <Text style={styles.summaryValue}>₱{service.price.toLocaleString()}</Text>
        </View>
        {promoDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: COLORS.success }]}>Discount</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              −₱{promoDiscount.toLocaleString()}
            </Text>
          </View>
        )}
        {promoDiscount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Final Price</Text>
            <Text style={[styles.summaryValue, { fontWeight: '700' }]}>
              ₱{finalPrice.toLocaleString()}
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Deposit (30%)</Text>
          <Text style={[styles.summaryValue, styles.depositValue]}>
            ₱{depositAmount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.bookingTypeNotice}>
          <Text style={styles.noticeText}>
            {service.booking_type === 'instant'
              ? 'This is an instant booking. Your appointment will be confirmed immediately.'
              : 'This is a booking request. The professional will confirm within 12 hours.'}
          </Text>
        </View>
      </Card>
    </View>
  );

  const isLastStep = step === totalSteps;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isLastStep ? 'Confirm Booking' : 'Book Appointment'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.progressContainer}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, index) => (
          <React.Fragment key={s}>
            <View
              style={[
                styles.progressDot,
                step >= s && styles.progressDotActive,
              ]}
            >
              {step > s ? (
                <Check size={12} color={COLORS.white} />
              ) : (
                <Text
                  style={[
                    styles.progressDotText,
                    step >= s && styles.progressDotTextActive,
                  ]}
                >
                  {s}
                </Text>
              )}
            </View>
            {index < totalSteps - 1 && (
              <View
                style={[
                  styles.progressLine,
                  step > s && styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        style={styles.scrollView}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && showLocationStep && renderStep3Location()}
        {step === 3 && !showLocationStep && renderSummary()}
        {step === 4 && renderSummary()}
      </ScrollView>

      <View style={styles.bottomAction}>
        <GradientButton
          title={isLastStep ? 'Confirm Booking' : 'Continue'}
          onPress={isLastStep ? handleConfirmBooking : handleNext}
          loading={submitting}
        />
      </View>

      <PaymentWebView
        visible={showPayment}
        checkoutUrl={paymentUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />

      <BookingInterstitialAd
        visible={showInterstitial}
        ad={interstitialAd}
        onDismiss={async () => {
          setShowInterstitial(false);
          await AsyncStorage.setItem('last_interstitial_ts', Date.now().toString());
          if (confirmedBookingId) {
            navigation.replace('BookingDetail', { bookingId: confirmedBookingId });
          }
        }}
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressDotText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  progressDotTextActive: {
    color: COLORS.white,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.chipBackground,
    marginHorizontal: SPACING.sm,
  },
  progressLineActive: {
    backgroundColor: COLORS.primary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  stepSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  monthText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.round,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  calendarDayTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  calendarDayTextDisabled: {
    color: COLORS.textLight,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  timeSlot: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeSlotSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  timeSlotText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  timeSlotTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  noSlots: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noSlotsText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  selectAnotherText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '600',
  },
  locationOptions: {
    gap: SPACING.md,
  },
  locationCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    position: 'relative',
  },
  locationCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F9F5FC',
  },
  locationCardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  locationCardTitleSelected: {
    color: COLORS.primary,
  },
  locationCardAddress: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  checkMark: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressInput: {
    marginTop: SPACING.lg,
  },
  summaryCard: {
    padding: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.md,
  },
  summaryDateTimeContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginLeft: SPACING.md,
  },
  addressText: {
    fontSize: FONT_SIZES.xs,
  },
  depositValue: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  bookingTypeNotice: {
    backgroundColor: COLORS.chipBackground,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm,
  },
  noticeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  bottomAction: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  promoSection: {
    marginBottom: SPACING.sm,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  promoInput: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    letterSpacing: 1,
    fontWeight: '600',
  },
  promoApplyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  promoApplyText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  promoError: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  promoAppliedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: `${COLORS.success}15`,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  promoAppliedCode: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 1,
  },
  promoAppliedDiscount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
  },
});
