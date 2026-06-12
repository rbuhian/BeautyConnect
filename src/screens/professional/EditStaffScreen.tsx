import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, User, Check, ArrowLeft, Trash2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { ProfessionalScreenProps } from '../../navigation/types';
import { GradientButton, Input, Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES } from '../../constants';
import { Category, StaffMember } from '../../types';
import {
  getStaffMemberById,
  updateStaffMember,
  deleteStaffMember,
} from '../../services/business';
import { uploadImage, deleteImage } from '../../services/storage';

export default function EditStaffScreen({
  navigation,
  route,
}: ProfessionalScreenProps<'EditStaff'>) {
  const { staffId } = route.params;
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [staffId]);

  const fetchStaff = async () => {
    try {
      const data = await getStaffMemberById(staffId);
      if (data) {
        setStaff(data);
        setName(data.name);
        setAvatar(data.avatar);
        setBio(data.bio || '');
        setSelectedCategories(data.specialties as Category[]);
        setIsActive(data.is_active);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      Alert.alert('Error', 'Failed to load staff member');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewAvatarUri(result.assets[0].uri);
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

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter the staff member\'s name');
      return;
    }
    if (selectedCategories.length === 0) {
      setError('Please select at least one specialty');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Upload new avatar if changed
      let avatarUrl = avatar;
      if (newAvatarUri) {
        // Delete old avatar from storage
        if (avatar && avatar.includes('supabase')) {
          await deleteImage(avatar, 'avatars').catch(() => {});
        }
        avatarUrl = await uploadImage(newAvatarUri, 'avatars');
      }

      await updateStaffMember(staffId, {
        name: name.trim(),
        avatar: avatarUrl,
        specialties: selectedCategories,
        bio: bio.trim() || null,
        is_active: isActive,
      });

      navigation.goBack();
    } catch (err: any) {
      setError(err.message || 'Failed to update staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Staff Member',
      `Are you sure you want to remove ${name} from your team? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStaffMember(staffId);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete staff member');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading message="Loading staff member..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Staff</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Trash2 size={24} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              {newAvatarUri || avatar ? (
                <Image
                  source={{ uri: newAvatarUri || avatar! }}
                  style={styles.avatar}
                />
              ) : (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.avatarPlaceholder}
                >
                  <User size={40} color={COLORS.white} />
                </LinearGradient>
              )}
              <View style={styles.cameraButton}>
                <Camera size={16} color={COLORS.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Name *"
              placeholder="Enter staff member's name"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError('');
              }}
              autoCapitalize="words"
            />

            <Input
              label="Bio (Optional)"
              placeholder="Brief description or specialization"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              style={styles.bioInput}
            />
          </View>

          {/* Active Toggle */}
          <Card style={styles.toggleCard}>
            <View style={styles.toggleContent}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleTitle}>Active Status</Text>
                <Text style={styles.toggleDescription}>
                  Inactive staff won't appear in booking options
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
                thumbColor={isActive ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
          </Card>

          {/* Specialties */}
          <View style={styles.specialtiesSection}>
            <Text style={styles.sectionTitle}>Specialties *</Text>
            <Text style={styles.sectionSubtitle}>
              Select the services this staff member can perform
            </Text>

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
                        isSelected && styles.categoryCardSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={
                          isSelected
                            ? [COLORS.gradientStart, COLORS.gradientEnd]
                            : [COLORS.inputBackground, COLORS.inputBackground]
                        }
                        style={styles.categoryIcon}
                      >
                        {isSelected && <Check size={20} color={COLORS.white} />}
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
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <GradientButton
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={!name.trim() || selectedCategories.length === 0}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl + SPACING.xl, // Extra space for Android navigation
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    marginBottom: SPACING.lg,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  toggleCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  toggleTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  specialtiesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryCard: {
    width: 80,
    alignItems: 'center',
    padding: SPACING.sm,
  },
  categoryCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  categoryLabel: {
    fontSize: FONT_SIZES.xs,
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
  saveButton: {
    marginTop: SPACING.md,
  },
});
