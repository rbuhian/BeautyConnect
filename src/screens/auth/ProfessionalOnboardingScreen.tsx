import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Camera, User, Check, Building2, UserCircle, FileText, Upload, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthScreenProps } from '../../navigation/types';
import { GradientButton, Input, Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, APP_NAME, CATEGORIES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Category, BusinessType } from '../../types';
import { createBusiness } from '../../services/business';
import { useAuthStore } from '../../stores/authStore';
import { uploadImage, uploadVerificationDoc } from '../../services/storage';
import { supabase } from '../../services/supabase';

const BUSINESS_TYPES: { value: BusinessType; label: string; description: string }[] = [
  { value: 'salon', label: 'Salon', description: 'Hair salon, nail salon, beauty parlor' },
  { value: 'spa', label: 'Spa', description: 'Wellness spa, massage, facials' },
  { value: 'studio', label: 'Studio', description: 'Makeup studio, photography studio' },
];

export default function ProfessionalOnboardingScreen({ navigation }: AuthScreenProps<'ProfessionalOnboarding'>) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateProfile } = useAuth();

  // Document upload state
  const [docType, setDocType] = useState<'id' | 'certificate' | null>(null);
  const [docUri, setDocUri] = useState<string | null>(null);

  // Business-specific state
  const [isBusiness, setIsBusiness] = useState<boolean | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('salon');
  const professionalProfile = useAuthStore((state) => state.professionalProfile);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const toggleCategory = (category: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
    setError('');
  };

  const pickDocument = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
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
      setError('');
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      if (name.trim().length < 2) {
        setError('Name must be at least 2 characters');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      if (isBusiness === null) {
        setError('Please select an option');
        return;
      }
      if (isBusiness && !businessName.trim()) {
        setError('Please enter your business name');
        return;
      }
      setError('');
      setStep(3);
    } else if (step === 3) {
      if (selectedCategories.length === 0) {
        setError('Please select at least one category');
        return;
      }
      setError('');
      setStep(4);
    }
  };

  const handleComplete = async () => {
    if (!docType) {
      setError('Please select a document type');
      return;
    }
    if (!docUri) {
      setError('Please upload your document');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let avatarUrl: string | undefined;
      if (avatar) {
        try {
          avatarUrl = await uploadImage(avatar, 'avatars');
        } catch (err) {
          console.error('Avatar upload failed:', err);
        }
      }

      const result = await updateProfile({
        name: name.trim(),
        avatar: avatarUrl || undefined,
      });

      if (!result.success) {
        if (result.error?.includes('Invalid API key') || result.error?.includes('fetch') || result.error?.includes('Not authenticated')) {
          Alert.alert('Development Mode', 'Supabase not configured. Profile would be saved in production.', [{ text: 'OK' }]);
          setLoading(false);
          return;
        } else {
          throw new Error(result.error || 'Failed to save profile');
        }
      }

      // Upload verification document
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id && docUri && docType) {
        try {
          const docPath = await uploadVerificationDoc(docUri, currentUser.id, docType);
          await supabase
            .from('professional_profiles')
            .update({ id_document_path: docPath })
            .eq('user_id', currentUser.id);
        } catch (err) {
          console.error('Document upload failed:', err);
        }
      }

      if (isBusiness && professionalProfile?.id) {
        await createBusiness(professionalProfile.id, {
          business_name: businessName.trim(),
          business_type: businessType,
        });
      }

      // Navigation will be handled by RootNavigator
    } catch (err: any) {
      setError(err.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, Professional!</Text>
        <Text style={styles.subtitle}>
          Let's set up your profile so clients can discover you on {APP_NAME}
        </Text>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarPlaceholder}
            >
              <User size={48} color={COLORS.white} />
            </LinearGradient>
          )}
          <View style={styles.cameraButton}>
            <Camera size={16} color={COLORS.white} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to add your professional photo</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Your Professional Name"
          placeholder="Enter your name or business name"
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError('');
          }}
          error={error}
          autoCapitalize="words"
          autoComplete="name"
        />
      </View>

      <GradientButton
        title="Continue"
        onPress={handleNextStep}
        disabled={!name.trim()}
      />
    </>
  );

  const renderStep2 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Are you a salon or business?</Text>
        <Text style={styles.subtitle}>
          If you run a salon, spa, or studio with multiple staff members, select "Yes" to set up your business profile.
        </Text>
      </View>

      <View style={styles.businessOptions}>
        {/* Individual Professional Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setIsBusiness(false);
            setError('');
          }}
        >
          <Card
            style={[
              styles.businessOptionCard,
              isBusiness === false && styles.businessOptionCardSelected,
            ]}
          >
            <LinearGradient
              colors={
                isBusiness === false
                  ? [COLORS.gradientStart, COLORS.gradientEnd]
                  : [COLORS.inputBackground, COLORS.inputBackground]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.businessOptionIcon}
            >
              <UserCircle size={32} color={isBusiness === false ? COLORS.white : COLORS.textSecondary} />
            </LinearGradient>
            <View style={styles.businessOptionText}>
              <Text style={[styles.businessOptionTitle, isBusiness === false && styles.businessOptionTitleSelected]}>
                Individual Professional
              </Text>
              <Text style={styles.businessOptionDescription}>
                I work independently as a freelancer
              </Text>
            </View>
            {isBusiness === false && (
              <View style={styles.checkCircle}>
                <Check size={16} color={COLORS.white} />
              </View>
            )}
          </Card>
        </TouchableOpacity>

        {/* Business Option */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setIsBusiness(true);
            setError('');
          }}
        >
          <Card
            style={[
              styles.businessOptionCard,
              isBusiness === true && styles.businessOptionCardSelected,
            ]}
          >
            <LinearGradient
              colors={
                isBusiness === true
                  ? [COLORS.gradientStart, COLORS.gradientEnd]
                  : [COLORS.inputBackground, COLORS.inputBackground]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.businessOptionIcon}
            >
              <Building2 size={32} color={isBusiness === true ? COLORS.white : COLORS.textSecondary} />
            </LinearGradient>
            <View style={styles.businessOptionText}>
              <Text style={[styles.businessOptionTitle, isBusiness === true && styles.businessOptionTitleSelected]}>
                Salon / Business
              </Text>
              <Text style={styles.businessOptionDescription}>
                I run a salon, spa, or studio with staff
              </Text>
            </View>
            {isBusiness === true && (
              <View style={styles.checkCircle}>
                <Check size={16} color={COLORS.white} />
              </View>
            )}
          </Card>
        </TouchableOpacity>
      </View>

      {/* Business Details (shown when business is selected) */}
      {isBusiness && (
        <View style={styles.businessDetails}>
          <Input
            label="Business Name"
            placeholder="Enter your business name"
            value={businessName}
            onChangeText={(text) => {
              setBusinessName(text);
              setError('');
            }}
            autoCapitalize="words"
          />

          <Text style={styles.businessTypeLabel}>Business Type</Text>
          <View style={styles.businessTypeOptions}>
            {BUSINESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                activeOpacity={0.8}
                onPress={() => setBusinessType(type.value)}
                style={[
                  styles.businessTypeOption,
                  businessType === type.value && styles.businessTypeOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.businessTypeText,
                    businessType === type.value && styles.businessTypeTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.stepActions}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.continueButton}>
          <GradientButton
            title="Continue"
            onPress={handleNextStep}
            disabled={isBusiness === null || (isBusiness && !businessName.trim())}
          />
        </View>
      </View>
    </>
  );

  const renderStep3 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>What do you specialize in?</Text>
        <Text style={styles.subtitle}>
          Select all the services you offer. You can add more details later.
        </Text>
      </View>

      <View style={styles.categoriesGrid}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategories.includes(cat.value);
          return (
            <TouchableOpacity
              key={cat.value}
              activeOpacity={0.8}
              onPress={() => toggleCategory(cat.value)}
            >
              <Card
                style={[
                  styles.categoryCard,
                  isSelected ? styles.categoryCardSelected : undefined,
                ]}
              >
                <LinearGradient
                  colors={
                    isSelected
                      ? [COLORS.gradientStart, COLORS.gradientEnd]
                      : [COLORS.inputBackground, COLORS.inputBackground]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryIcon}
                >
                  {isSelected && (
                    <Check size={24} color={COLORS.white} />
                  )}
                </LinearGradient>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.stepActions}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(2)}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.continueButton}>
          <GradientButton
            title="Continue"
            onPress={handleNextStep}
            disabled={selectedCategories.length === 0}
          />
        </View>
      </View>
    </>
  );

  const renderStep4 = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Verify Your Identity</Text>
        <Text style={styles.subtitle}>
          Upload a government-issued ID or Birth Certificate to verify your account. This helps build trust with clients.
        </Text>
      </View>

      {/* Document type selection */}
      <Text style={styles.docTypeLabel}>Select Document Type</Text>
      <View style={styles.docTypeRow}>
        <TouchableOpacity
          style={[styles.docTypeBtn, docType === 'id' && styles.docTypeBtnSelected]}
          onPress={() => { setDocType('id'); setError(''); }}
          activeOpacity={0.8}
        >
          <FileText size={20} color={docType === 'id' ? COLORS.white : COLORS.primary} />
          <Text style={[styles.docTypeBtnText, docType === 'id' && styles.docTypeBtnTextSelected]}>
            Gov't Issued ID
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.docTypeBtn, docType === 'certificate' && styles.docTypeBtnSelected]}
          onPress={() => { setDocType('certificate'); setError(''); }}
          activeOpacity={0.8}
        >
          <FileText size={20} color={docType === 'certificate' ? COLORS.white : COLORS.primary} />
          <Text style={[styles.docTypeBtnText, docType === 'certificate' && styles.docTypeBtnTextSelected]}>
            Birth Certificate
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document upload area */}
      <TouchableOpacity style={styles.docUploadArea} onPress={pickDocument} activeOpacity={0.8}>
        {docUri ? (
          <View style={styles.docPreview}>
            <Image source={{ uri: docUri }} style={styles.docImage} resizeMode="cover" />
            <View style={styles.docSuccessBadge}>
              <CheckCircle size={20} color={COLORS.success} />
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
              <Upload size={28} color={COLORS.white} />
            </LinearGradient>
            <Text style={styles.docUploadText}>Tap to upload document</Text>
            <Text style={styles.docUploadHint}>JPG or PNG • Max 10MB</Text>
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

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.stepActions}>
        <TouchableOpacity style={styles.backButton} onPress={() => setStep(3)}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.continueButton}>
          <GradientButton
            title="Complete Setup"
            onPress={handleComplete}
            loading={loading}
            disabled={!docType || !docUri}
          />
        </View>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
          <View style={styles.progressLine} />
          <View style={[styles.progressDot, step >= 4 && styles.progressDotActive]} />
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
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
    marginBottom: SPACING.xl,
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
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  avatarHint: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  form: {
    marginBottom: SPACING.xl,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  categoryCard: {
    width: 100,
    alignItems: 'center',
    padding: SPACING.md,
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  categoryLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  stepActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  backButton: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  continueButton: {
    flex: 2,
  },
  // Business option styles
  businessOptions: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  businessOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  businessOptionCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  businessOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessOptionText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  businessOptionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  businessOptionTitleSelected: {
    color: COLORS.primary,
  },
  businessOptionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessDetails: {
    marginBottom: SPACING.lg,
  },
  businessTypeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  businessTypeOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  businessTypeOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
    alignItems: 'center',
  },
  businessTypeOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  businessTypeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  businessTypeTextSelected: {
    color: COLORS.white,
  },
  // Step 4 — Document Upload
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
    width: 60,
    height: 60,
    borderRadius: 30,
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
  docPreview: {
    width: '100%',
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
});
