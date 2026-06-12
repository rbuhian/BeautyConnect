import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { AuthScreenProps } from '../../navigation/types';
import { Input, GradientButton } from '../../components';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen({ navigation }: AuthScreenProps<'SignIn'>) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!EMAIL_REGEX.test(email)) newErrors.email = 'Enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Sign In Failed', result.error || 'Invalid email or password.');
    }
    // On success, RootNavigator auto-redirects based on auth state
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
        <Text style={styles.title}>Sign In</Text>

        <TouchableOpacity onPress={() => navigation.navigate('RoleSelection')}>
          <Text style={styles.registerLink}>Don't have an account? Sign up here.</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL</Text>
            <Input
              placeholder="Enter your email address"
              value={email}
              onChangeText={(t) => { setEmail(t.trim()); setErrors(e => ({ ...e, email: '' })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <Input
              placeholder="Password"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
              secureTextEntry
              error={errors.password}
            />
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordWrapper}
          >
            <Text style={styles.forgotPasswordLink}>Forgot password?</Text>
          </TouchableOpacity>

          <GradientButton
            title={loading ? 'Signing in...' : 'Sign in'}
            onPress={handleSignIn}
            loading={loading}
            style={styles.signInButton}
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
  registerLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginBottom: SPACING.xl,
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
  signInButton: {
    marginTop: SPACING.md,
  },
  forgotPasswordWrapper: {
    alignSelf: 'flex-end',
  },
  forgotPasswordLink: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
