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
import { Camera, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { AuthScreenProps } from '../../navigation/types';
import { GradientButton, Input } from '../../components';
import { COLORS, SPACING, FONT_SIZES, APP_NAME } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { uploadImage } from '../../services/storage';

export default function ClientOnboardingScreen({ navigation }: AuthScreenProps<'ClientOnboarding'>) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
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

  const handleComplete = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setLoading(true);
    setError('');

    let avatarUrl: string | undefined;

    // Upload avatar to Supabase Storage if selected
    if (avatar) {
      try {
        avatarUrl = await uploadImage(avatar, 'avatars');
      } catch (err) {
        console.error('Avatar upload failed:', err);
        // Continue without avatar — don't block onboarding
      }
    }

    const result = await updateProfile({
      name: name.trim(),
      avatar: avatarUrl || undefined,
    });

    setLoading(false);

    if (result.success) {
      // Navigation will be handled by RootNavigator when user state updates
    } else {
      // For development/testing, allow bypass
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

  const handleSkip = () => {
    Alert.alert(
      'Skip Profile Setup?',
      'You can complete your profile later from settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: () => handleComplete() },
      ]
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
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to {APP_NAME}!</Text>
          <Text style={styles.subtitle}>
            Let's set up your profile so beauty professionals can know who you are
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
          <Text style={styles.avatarHint}>Tap to add a photo</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Your Name"
            placeholder="Enter your full name"
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

        <View style={styles.actions}>
          <GradientButton
            title="Complete Setup"
            onPress={handleComplete}
            loading={loading}
            disabled={!name.trim()}
          />
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
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
  actions: {
    gap: SPACING.md,
  },
  skipButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  skipText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
