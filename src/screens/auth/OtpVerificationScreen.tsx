import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { AuthScreenProps } from '../../navigation/types';
import { GradientButton } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const OTP_LENGTH = 6;

export default function OtpVerificationScreen({
  navigation,
  route,
}: AuthScreenProps<'OtpVerification'>) {
  const { email, role } = route.params;
  const maskedEmail = email.replace(/^(.{1,2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, '*') + c);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { verifyOtp, sendOtp, setRole } = useAuth();

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((digit, i) => {
        if (index + i < OTP_LENGTH) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(index + pastedOtp.length, OTP_LENGTH - 1)]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/[^0-9]/g, '');
      setOtp(newOtp);
      setError('');

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      setError('Please enter the complete verification code');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOtp(email, otpCode);

    setLoading(false);

    if (result.success) {
      if (result.isNewUser) {
        const selectedRole = role || 'client';
        await setRole(selectedRole);
        if (selectedRole === 'professional') {
          navigation.navigate('ProfessionalOnboarding');
        } else {
          navigation.navigate('ClientOnboarding');
        }
      }
      // Existing user: RootNavigator handles redirect via auth state change
    } else {
      const errorLower = result.error?.toLowerCase() || '';
      if (errorLower.includes('network') || errorLower.includes('fetch')) {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(result.error || 'Invalid verification code. Please try again.');
      }
    }
  };

  const handleResend = async () => {
    if (resendTimer === 0) {
      setResendTimer(30);
      setError('');
      const result = await sendOtp(email);
      if (!result.success) {
        setError(result.error || 'Failed to resend code');
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <ArrowLeft size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.phone}>{maskedEmail}</Text>
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : undefined,
                error ? styles.otpInputError : undefined,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <GradientButton
          title="Verify"
          onPress={handleVerify}
          loading={loading}
          disabled={otp.join('').length !== OTP_LENGTH}
          style={styles.verifyButton}
        />

        <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}>
          <Text style={styles.resendText}>
            {resendTimer > 0 ? (
              `Resend code in ${resendTimer}s`
            ) : (
              <Text style={styles.resendActive}>Resend code</Text>
            )}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    alignItems: 'center',
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
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  phone: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  otpContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
    textAlign: 'center',
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  otpInputFilled: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  otpInputError: {
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  verifyButton: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  resendText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  resendActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
