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
import { Camera, User, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthScreenProps } from '../../navigation/types';
import { GradientButton, Input, Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, APP_NAME, CATEGORIES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Category } from '../../types';

export default function ProfessionalOnboardingScreen({ navigation }: AuthScreenProps<'ProfessionalOnboarding'>) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateProfile } = useAuth();

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
    }
  };

  const handleComplete = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one category');
      return;
    }

    setLoading(true);
    setError('');

    // Update user profile with name
    const result = await updateProfile({
      name: name.trim(),
      avatar: avatar || undefined,
    });

    setLoading(false);

    if (result.success) {
      // TODO: Also update professional_profiles with categories
      // Navigation will be handled by RootNavigator
    } else {
      // For development/testing
      if (result.error?.includes('Invalid API key') || result.error?.includes('fetch') || result.error?.includes('Not authenticated')) {
        Alert.alert(
          'Development Mode',
          'Supabase not configured. Profile would be saved in production.',
          [{ text: 'OK' }]
        );
      } else {
        setError(result.error || 'Failed to save profile');
      }
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep(1)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.continueButton}>
          <GradientButton
            title="Complete Setup"
            onPress={handleComplete}
            loading={loading}
            disabled={selectedCategories.length === 0}
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
        </View>

        {step === 1 ? renderStep1() : renderStep2()}
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
});
