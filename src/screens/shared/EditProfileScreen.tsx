import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {
  ArrowLeft,
  Camera,
  Plus,
  X,
  MapPin,
  Check,
  Navigation,
} from 'lucide-react-native';
import { GradientButton, Input, Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES, LOCATION_TYPES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Category, LocationType } from '../../types';
import { updateProfessionalProfile, getProfessionalProfile } from '../../services/professional';
import { supabase } from '../../services/supabase';
import { deleteImage } from '../../services/storage';
import { useAuthStore } from '../../stores/authStore';
// import { optimizeAvatar, optimizePortfolioImage, formatBytes } from '../../utils/imageOptimization';

export default function EditProfileScreen({ navigation }: any) {
  const { user, professionalProfile } = useAuth();
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const refreshProfessionalProfile = useAuthStore((state) => state.refreshProfessionalProfile);
  const isProfessional = user?.role === 'professional';

  // User fields
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Professional fields
  const [bio, setBio] = useState(professionalProfile?.bio || '');
  const [categories, setCategories] = useState<Category[]>(
    professionalProfile?.categories || []
  );
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>(
    professionalProfile?.portfolio_photos || []
  );
  const [serviceArea, setServiceArea] = useState(
    professionalProfile?.service_area || ''
  );
  const [locationType, setLocationType] = useState<LocationType>(
    professionalProfile?.location_type || 'both'
  );
  const [salonAddress, setSalonAddress] = useState(
    professionalProfile?.salon_address || ''
  );
  const [isLive, setIsLive] = useState(professionalProfile?.is_live || false);
  const [latitude, setLatitude] = useState<number | null>(
    professionalProfile?.latitude ?? null
  );
  const [longitude, setLongitude] = useState<number | null>(
    professionalProfile?.longitude ?? null
  );

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);

  const pickImage = async (type: 'avatar' | 'portfolio') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: type === 'avatar',
      aspect: type === 'avatar' ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'avatar') {
        await uploadAvatar(result.assets[0].uri);
      } else {
        await uploadPortfolioPhoto(result.assets[0].uri);
      }
    }
  };

  const uploadAvatar = async (uri: string) => {
    setUploadingAvatar(true);
    try {
      // Delete old avatar from storage if it exists
      if (avatar && avatar.includes('supabase')) {
        await deleteImage(avatar, 'avatars').catch(() => {});
      }

      const fileName = `${user?.id}-${Date.now()}.jpg`;

      // Convert image to ArrayBuffer for React Native
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatar(publicUrl);
    } catch (err) {
      console.error('Avatar upload error:', err);
      Alert.alert('Upload Failed', 'Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const uploadPortfolioPhoto = async (uri: string) => {
    if (portfolioPhotos.length >= 10) {
      Alert.alert('Limit Reached', 'Maximum 10 portfolio photos allowed.');
      return;
    }

    setUploadingPortfolio(true);
    try {
      // Optimize image before upload (TEMPORARILY DISABLED - requires native modules)
      // const optimized = await optimizePortfolioImage(uri);
      // console.log(`Portfolio image optimized: ${formatBytes(optimized.size)} (${optimized.width}x${optimized.height})`);

      const fileName = `${professionalProfile?.id}-${Date.now()}.jpg`;

      // Convert image to ArrayBuffer for React Native
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('portfolios')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('portfolios')
        .getPublicUrl(fileName);

      setPortfolioPhotos([...portfolioPhotos, publicUrl]);
    } catch (err) {
      console.error('Portfolio upload error:', err);
      Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const removePortfolioPhoto = async (index: number) => {
    const photoUrl = portfolioPhotos[index];
    if (photoUrl && photoUrl.includes('supabase')) {
      await deleteImage(photoUrl, 'portfolios').catch(() => {});
    }
    const newPhotos = [...portfolioPhotos];
    newPhotos.splice(index, 1);
    setPortfolioPhotos(newPhotos);
  };

  const handleSetLocation = async () => {
    setSettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to set your location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      // Try reverse geocoding for confirmation
      try {
        const [address] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (address) {
          const parts = [address.street, address.city, address.region].filter(Boolean);
          Alert.alert('Location Set', parts.join(', ') || 'Location saved successfully.');
        }
      } catch {
        Alert.alert('Location Set', 'Your coordinates have been saved.');
      }
    } catch {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setSettingLocation(false);
    }
  };

  const toggleCategory = (category: Category) => {
    if (categories.includes(category)) {
      setCategories(categories.filter((c) => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  const canGoLive = () => {
    if (!isProfessional) return false;
    return (
      name.trim().length > 0 &&
      bio.trim().length >= 50 &&
      categories.length > 0 &&
      portfolioPhotos.length >= 3 &&
      serviceArea.trim().length > 0
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    if (isProfessional) {
      if (bio.trim().length < 50) {
        Alert.alert('Required', 'Bio must be at least 50 characters.');
        return;
      }
      if (categories.length === 0) {
        Alert.alert('Required', 'Please select at least one category.');
        return;
      }
      if (portfolioPhotos.length < 3) {
        Alert.alert('Required', 'Please add at least 3 portfolio photos.');
        return;
      }
      if (!serviceArea.trim()) {
        Alert.alert('Required', 'Please enter your service area.');
        return;
      }
      if ((locationType === 'salon' || locationType === 'both') && !salonAddress.trim()) {
        Alert.alert('Required', 'Please enter your salon address.');
        return;
      }
    }

    setLoading(true);

    try {
      // Update user profile through store (updates both DB and local state)
      const result = await updateProfile({ name, avatar });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update professional profile
      if (isProfessional && professionalProfile?.id) {
        const liveStatus = isLive && canGoLive();
        const proResult = await updateProfessionalProfile(professionalProfile.id, {
          bio,
          categories,
          portfolio_photos: portfolioPhotos,
          service_area: serviceArea,
          location_type: locationType,
          salon_address: salonAddress,
          latitude,
          longitude,
          is_live: liveStatus,
        });

        if (proResult.error) {
          throw new Error(proResult.error.message || 'Failed to update professional profile');
        }

        // Refresh professional profile in store
        await refreshProfessionalProfile();
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => pickImage('avatar')}
            disabled={uploadingAvatar}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera size={32} color={COLORS.textSecondary} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Camera size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          <Input
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Professional Sections */}
        {isProfessional && (
          <>
            {/* Bio */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About You</Text>
              <Input
                label="Bio"
                placeholder="Tell clients about yourself, your experience, and what makes you unique..."
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                style={styles.bioInput}
              />
              <Text style={styles.charCount}>
                {bio.length}/500 (min 50 characters)
              </Text>
            </View>

            {/* Categories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specialties</Text>
              <Text style={styles.sectionSubtitle}>
                Select the services you offer
              </Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      categories.includes(cat.value) && styles.categoryChipSelected,
                    ]}
                    onPress={() => toggleCategory(cat.value)}
                  >
                    {categories.includes(cat.value) && (
                      <Check size={16} color={COLORS.white} />
                    )}
                    <Text
                      style={[
                        styles.categoryChipText,
                        categories.includes(cat.value) &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Portfolio */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Portfolio</Text>
              <Text style={styles.sectionSubtitle}>
                Add at least 3 photos of your work (max 10)
              </Text>
              <View style={styles.portfolioGrid}>
                {portfolioPhotos.map((photo, index) => (
                  <View key={index} style={styles.portfolioItem}>
                    <Image source={{ uri: photo }} style={styles.portfolioImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePortfolioPhoto(index)}
                    >
                      <X size={14} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
                {portfolioPhotos.length < 10 && (
                  <TouchableOpacity
                    style={styles.addPhotoButton}
                    onPress={() => pickImage('portfolio')}
                    disabled={uploadingPortfolio}
                  >
                    <Plus size={24} color={COLORS.textSecondary} />
                    <Text style={styles.addPhotoText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Location</Text>
              <View style={styles.locationTypes}>
                {LOCATION_TYPES.map((loc) => (
                  <TouchableOpacity
                    key={loc.value}
                    style={[
                      styles.locationTypeButton,
                      locationType === loc.value && styles.locationTypeButtonSelected,
                    ]}
                    onPress={() => setLocationType(loc.value as LocationType)}
                  >
                    <Text
                      style={[
                        styles.locationTypeText,
                        locationType === loc.value &&
                          styles.locationTypeTextSelected,
                      ]}
                    >
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Service Area"
                placeholder="e.g., Makati, BGC, Pasig"
                value={serviceArea}
                onChangeText={setServiceArea}
                leftIcon={<MapPin size={20} color={COLORS.textSecondary} />}
              />

              {(locationType === 'salon' || locationType === 'both') && (
                <Input
                  label="Salon Address"
                  placeholder="Enter your salon's full address"
                  value={salonAddress}
                  onChangeText={setSalonAddress}
                  multiline
                  style={{ marginTop: SPACING.md }}
                />
              )}

              {/* GPS Location */}
              <View style={styles.gpsSection}>
                <Text style={styles.gpsLabel}>GPS Location</Text>
                <Text style={styles.gpsHint}>
                  Set your location so nearby clients can find you
                </Text>
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={handleSetLocation}
                  disabled={settingLocation}
                >
                  {settingLocation ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Navigation size={18} color={COLORS.primary} />
                  )}
                  <Text style={styles.gpsButtonText}>
                    {latitude != null ? 'Update My Location' : 'Set My Location'}
                  </Text>
                </TouchableOpacity>
                {latitude != null && (
                  <Text style={styles.gpsStatus}>
                    Location set ({latitude.toFixed(4)}, {longitude?.toFixed(4)})
                  </Text>
                )}
              </View>
            </View>

            {/* Go Live Toggle */}
            <View style={styles.section}>
              <Card style={styles.liveCard}>
                <View style={styles.liveCardContent}>
                  <View style={styles.liveInfo}>
                    <Text style={styles.liveTitle}>Profile Visibility</Text>
                    <Text style={styles.liveSubtitle}>
                      {isLive
                        ? 'Your profile is visible to clients'
                        : 'Your profile is hidden from clients'}
                    </Text>
                  </View>
                  <Switch
                    value={isLive}
                    onValueChange={(value) => {
                      if (value && !canGoLive()) {
                        Alert.alert(
                          'Cannot Go Live',
                          'Please complete all required fields:\n\n• Name\n• Bio (50+ chars)\n• At least 1 category\n• At least 3 portfolio photos\n• Service area'
                        );
                        return;
                      }
                      setIsLive(value);
                    }}
                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                    thumbColor={COLORS.white}
                  />
                </View>
                {!canGoLive() && (
                  <Text style={styles.liveWarning}>
                    Complete your profile to go live
                  </Text>
                )}
              </Card>
            </View>
          </>
        )}

        {/* Save Button */}
        <View style={styles.saveSection}>
          <GradientButton
            title="Save Changes"
            onPress={handleSave}
            loading={loading}
          />
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
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
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
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
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  bioInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.chipBackground,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  categoryChipTextSelected: {
    color: COLORS.white,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  portfolioItem: {
    position: 'relative',
  },
  portfolioImage: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  addPhotoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  locationTypes: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  locationTypeButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.chipBackground,
    alignItems: 'center',
  },
  locationTypeButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  locationTypeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  locationTypeTextSelected: {
    color: COLORS.white,
  },
  gpsSection: {
    marginTop: SPACING.lg,
  },
  gpsLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  gpsHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    alignSelf: 'flex-start',
  },
  gpsButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  gpsStatus: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    marginTop: SPACING.sm,
  },
  liveCard: {
    padding: SPACING.lg,
  },
  liveCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveInfo: {
    flex: 1,
  },
  liveTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  liveSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  liveWarning: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    marginTop: SPACING.sm,
  },
  saveSection: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
});
