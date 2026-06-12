import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AuthScreenProps } from '../../navigation/types';
import { GradientButton, Input } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }: AuthScreenProps<'ForgotPassword'>) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { sendPasswordResetOtp } = useAuth();

  const isValidEmail = EMAIL_REGEX.test(email);

  const handleContinue = async () => {
    if (!isValidEmail) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await sendPasswordResetOtp(email.trim().toLowerCase());

      setLoading(false);

      if (result.success) {
        navigation.navigate('ResetPasswordOtp', { email: email.trim().toLowerCase() });
      } else {
        const errorLower = result.error?.toLowerCase() || '';
        if (errorLower.includes('network') || errorLower.includes('fetch')) {
          setError('Network error. Please check your internet connection and try again.');
        } else if (errorLower.includes('not found') || errorLower.includes('no user') || errorLower.includes('signups not allowed')) {
          setError('No account found with this email address.');
        } else {
          setError(result.error || 'Failed to send reset code. Please try again.');
        }
      }
    } catch (err) {
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
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>
          Enter your email address and we'll send you a verification code to reset your password.
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
          title="Send reset code"
          onPress={handleContinue}
          loading={loading}
          disabled={!isValidEmail}
          style={styles.continueButton}
        />
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
});
