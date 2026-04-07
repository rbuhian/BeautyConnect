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
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAccountScreen({ navigation, route }: AuthScreenProps<'CreateAccount'>) {
  const { role } = route.params;
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!EMAIL_REGEX.test(email)) newErrors.email = 'Enter a valid email address';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;

    setLoading(true);
    const result = await signUp(name.trim(), email.trim().toLowerCase(), password, role);
    setLoading(false);

    if (result.success) {
      if (role === 'professional') {
        navigation.navigate('ProfessionalOnboarding');
      } else {
        navigation.navigate('ClientOnboarding');
      }
    } else {
      Alert.alert('Sign Up Failed', result.error || 'Something went wrong. Please try again.');
    }
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
        <Text style={styles.title}>Create Account</Text>

        <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.loginLink}>Already Registered? Log in here.</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>NAME</Text>
            <Input
              placeholder=""
              value={name}
              onChangeText={(t) => { setName(t); setErrors(e => ({ ...e, name: '' })); }}
              autoCapitalize="words"
              error={errors.name}
            />
          </View>

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

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>REPEAT PASSWORD</Text>
            <Input
              placeholder="Repeat password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors(e => ({ ...e, confirmPassword: '' })); }}
              secureTextEntry
              error={errors.confirmPassword}
            />
          </View>

          <GradientButton
            title={loading ? 'Creating account...' : 'Sign up'}
            onPress={handleSignUp}
            loading={loading}
            style={styles.signUpButton}
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
    paddingTop: 80,
    paddingBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  loginLink: {
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
  signUpButton: {
    marginTop: SPACING.md,
  },
});
