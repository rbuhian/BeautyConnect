import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { AuthScreenProps } from '../../navigation/types';
import { Input, GradientButton } from '../../components';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordScreen({ navigation }: AuthScreenProps<'ResetPassword'>) {
  const { updatePassword, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }
    if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await updatePassword(password);

    if (!result.success) {
      setLoading(false);
      Alert.alert('Reset Failed', result.error || 'Could not update your password. Please try again.');
      return;
    }

    // Sign out the temporary recovery session so the user logs in with the new password.
    await logout();
    setLoading(false);

    Alert.alert(
      'Password Updated',
      'Your password has been reset. Please sign in with your new password.',
      [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>
          Choose a new password for your account.
        </Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <Input
              placeholder="Enter new password"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
              secureTextEntry
              error={errors.password}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD</Text>
            <Input
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: '' })); }}
              secureTextEntry
              error={errors.confirmPassword}
            />
          </View>

          <GradientButton
            title={loading ? 'Updating...' : 'Update password'}
            onPress={handleResetPassword}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 100,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  form: {
    gap: SPACING.md,
  },
  fieldGroup: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  submitButton: {
    marginTop: SPACING.md,
  },
});
