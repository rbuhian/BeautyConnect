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
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AuthScreenProps } from '../../navigation/types';
import { GradientButton, Input } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailInputScreen({ navigation }: AuthScreenProps<'EmailInput'>) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendOtp } = useAuth();

  const isValidEmail = EMAIL_REGEX.test(email);

  const handleContinue = async () => {
    if (!isValidEmail) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    console.log('[EmailInput] Sending OTP to:', email);

    try {
      const result = await sendOtp(email);

      console.log('[EmailInput] OTP result:', JSON.stringify(result));

      setLoading(false);

      if (result.success) {
        console.log('[EmailInput] Navigating to OTP screen');
        navigation.navigate('OtpVerification', { email });
      } else {
        console.log('[EmailInput] OTP failed:', result.error);
        const errorLower = result.error?.toLowerCase() || '';
        if (errorLower.includes('network') || errorLower.includes('fetch')) {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError(result.error || 'Failed to send verification code. Please try again.');
        }
      }
    } catch (err) {
      console.error('[EmailInput] Exception:', err);
      setLoading(false);
      setError('Network error. Please check your internet connection and try again.');
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
        <Text style={styles.title}>Enter your email address</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code to confirm your identity
        </Text>

        <View style={styles.inputContainer}>
          <Input
            placeholder="your@email.com"
            value={email}
            onChangeText={(text) => {
              setEmail(text.trim());
              setError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon={<Mail size={20} color={COLORS.textSecondary} />}
            error={error}
            autoFocus
          />
        </View>

        <GradientButton
          title="Continue"
          onPress={handleContinue}
          loading={loading}
          disabled={!isValidEmail}
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
  inputContainer: {
    marginBottom: SPACING.lg,
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
