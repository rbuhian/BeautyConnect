import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ArrowLeft, Phone } from 'lucide-react-native';
import { AuthScreenProps } from '../../navigation/types';
import { GradientButton, Input } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

export default function PhoneInputScreen({ navigation }: AuthScreenProps<'PhoneInput'>) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOtp } = useAuth();

  const formatPhoneNumber = (number: string): string => {
    // Format: +63XXXXXXXXXX
    return `+63${number}`;
  };

  const handleContinue = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    const formattedPhone = formatPhoneNumber(phone);

    console.log('[PhoneInput] Sending OTP to:', formattedPhone);

    try {
      const result = await sendOtp(formattedPhone);

      console.log('[PhoneInput] OTP result:', JSON.stringify(result));

      setLoading(false);

      if (result.success) {
        console.log('[PhoneInput] Navigating to OTP screen');
        navigation.navigate('OtpVerification', { phone: formattedPhone });
      } else {
        console.log('[PhoneInput] OTP failed:', result.error);
        // For development/testing, allow bypass if Supabase isn't configured
        const errorLower = result.error?.toLowerCase() || '';
        // Allow bypass for development when phone auth or database isn't configured
        const isDevelopmentError =
          errorLower.includes('invalid api key') ||
          errorLower.includes('fetch') ||
          errorLower.includes('network') ||
          errorLower.includes('url') ||
          errorLower.includes('unsupported phone provider') ||
          errorLower.includes('phone provider') ||
          errorLower.includes('database') ||
          errorLower.includes('saving') ||
          errorLower.includes('user') ||
          !result.error;

        if (isDevelopmentError) {
          Alert.alert(
            'Development Mode',
            `Backend not fully configured. Proceeding to OTP screen for testing.\n\nTo fix:\n1. Run supabase/schema.sql in SQL Editor\n2. Enable Phone auth in Supabase\n\nError: ${result.error || 'Unknown'}`,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('OtpVerification', { phone: formattedPhone }),
              },
            ]
          );
        } else {
          setError(result.error || 'Failed to send verification code');
        }
      }
    } catch (err) {
      console.error('[PhoneInput] Exception:', err);
      setLoading(false);
      Alert.alert(
        'Development Mode',
        'An error occurred. Proceeding to OTP screen for testing.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('OtpVerification', { phone: formattedPhone }),
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Enter your phone number</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code to confirm your identity
        </Text>

        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+63</Text>
          </View>
          <View style={styles.phoneInput}>
            <Input
              placeholder="9XX XXX XXXX"
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/[^0-9]/g, ''));
                setError('');
              }}
              keyboardType="phone-pad"
              maxLength={10}
              leftIcon={<Phone size={20} color={COLORS.textSecondary} />}
              error={error}
              autoFocus
            />
          </View>
        </View>

        <GradientButton
          title="Continue"
          onPress={handleContinue}
          loading={loading}
          disabled={phone.length < 10}
          style={styles.continueButton}
        />

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText}>Terms of Service</Text> and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: SPACING.lg,
    width: 45,
    height: 45,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 140,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  countryCode: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
  },
  continueButton: {
    marginTop: SPACING.md,
  },
  termsText: {
    marginTop: SPACING.xl,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});
