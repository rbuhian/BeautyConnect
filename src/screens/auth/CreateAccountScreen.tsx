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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { FileText, Upload, CheckCircle, X } from 'lucide-react-native';
import { AuthScreenProps } from '../../navigation/types';
import { Input, GradientButton } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { uploadVerificationDoc } from '../../services/storage';
import { supabase } from '../../services/supabase';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAccountScreen({ navigation, route }: AuthScreenProps<'CreateAccount'>) {
  const { role } = route.params;
  const { signUp } = useAuth();

  // Step 1 fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2 fields (professional only)
  const [step, setStep] = useState(1);
  const [docType, setDocType] = useState<'id' | 'certificate' | null>(null);
  const [docUri, setDocUri] = useState<string | null>(null);
  const [docError, setDocError] = useState('');

  const isProfessional = role === 'professional';

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!EMAIL_REGEX.test(email)) newErrors.email = 'Enter a valid email address';
    if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (isProfessional) {
      setStep(2);
    } else {
      handleSignUp();
    }
  };

  const pickDocument = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      setDocUri(result.assets[0].uri);
      setDocError('');
    }
  };

  const handleSignUp = async () => {
    if (isProfessional && step === 2) {
      if (!docType) { setDocError('Please select a document type'); return; }
      if (!docUri) { setDocError('Please upload your document'); return; }
    }

    setLoading(true);
    const result = await signUp(name.trim(), email.trim().toLowerCase(), password, role);
    setLoading(false);

    if (result.success) {
      // Upload document for professionals
      if (isProfessional && docUri && docType) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser?.id) {
            const docPath = await uploadVerificationDoc(docUri, authUser.id, docType);
            await supabase
              .from('professional_profiles')
              .update({ id_document_path: docPath })
              .eq('user_id', authUser.id);
          }
        } catch (err) {
          console.error('Document upload failed:', err);
        }
      }

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
        {/* Progress dots for professional */}
        {isProfessional && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
          </View>
        )}

        {step === 1 ? (
          <>
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
                title={isProfessional ? 'Next' : (loading ? 'Creating account...' : 'Sign up')}
                onPress={handleNext}
                loading={loading}
                style={styles.signUpButton}
              />
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <X size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <Text style={styles.title}>Verify Your Identity</Text>
            <Text style={styles.docSubtitle}>
              Upload a government-issued ID or Birth Certificate. This helps build trust with clients.
            </Text>

            {/* Document type */}
            <Text style={styles.docTypeLabel}>Select Document Type</Text>
            <View style={styles.docTypeRow}>
              <TouchableOpacity
                style={[styles.docTypeBtn, docType === 'id' && styles.docTypeBtnSelected]}
                onPress={() => { setDocType('id'); setDocError(''); }}
                activeOpacity={0.8}
              >
                <FileText size={18} color={docType === 'id' ? COLORS.white : COLORS.primary} />
                <Text style={[styles.docTypeBtnText, docType === 'id' && styles.docTypeBtnTextSelected]}>
                  Gov't Issued ID
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.docTypeBtn, docType === 'certificate' && styles.docTypeBtnSelected]}
                onPress={() => { setDocType('certificate'); setDocError(''); }}
                activeOpacity={0.8}
              >
                <FileText size={18} color={docType === 'certificate' ? COLORS.white : COLORS.primary} />
                <Text style={[styles.docTypeBtnText, docType === 'certificate' && styles.docTypeBtnTextSelected]}>
                  Birth Certificate
                </Text>
              </TouchableOpacity>
            </View>

            {/* Upload area */}
            <TouchableOpacity style={styles.docUploadArea} onPress={pickDocument} activeOpacity={0.8}>
              {docUri ? (
                <View>
                  <Image source={{ uri: docUri }} style={styles.docImage} resizeMode="cover" />
                  <View style={styles.docSuccessBadge}>
                    <CheckCircle size={18} color={COLORS.success} />
                    <Text style={styles.docSuccessText}>Document uploaded</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.docUploadPlaceholder}>
                  <LinearGradient
                    colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.docUploadIcon}
                  >
                    <Upload size={26} color={COLORS.white} />
                  </LinearGradient>
                  <Text style={styles.docUploadText}>Tap to upload document</Text>
                  <Text style={styles.docUploadHint}>JPG or PNG</Text>
                </View>
              )}
            </TouchableOpacity>

            {docUri && (
              <TouchableOpacity onPress={pickDocument} style={styles.reuploadBtn}>
                <Text style={styles.reuploadText}>Choose a different file</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.docNote}>
              Your document is stored securely and only used for verification purposes.
            </Text>

            {docError ? <Text style={styles.errorText}>{docError}</Text> : null}

            <GradientButton
              title={loading ? 'Creating account...' : 'Create Account'}
              onPress={handleSignUp}
              loading={loading}
              disabled={!docType || !docUri}
              style={styles.signUpButton}
            />
          </>
        )}
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
    paddingTop: 60,
    paddingBottom: SPACING.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.inputBackground,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.inputBackground,
    marginHorizontal: SPACING.sm,
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
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
    padding: SPACING.xs,
  },
  docSubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  docTypeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  docTypeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  docTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  docTypeBtnSelected: {
    backgroundColor: COLORS.primary,
  },
  docTypeBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  docTypeBtnTextSelected: {
    color: COLORS.white,
  },
  docUploadArea: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    minHeight: 180,
    justifyContent: 'center',
  },
  docUploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  docUploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docUploadText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  docUploadHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  docImage: {
    width: '100%',
    height: 200,
  },
  docSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    backgroundColor: '#E8F5E9',
  },
  docSuccessText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
  },
  reuploadBtn: {
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  reuploadText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  docNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
});
