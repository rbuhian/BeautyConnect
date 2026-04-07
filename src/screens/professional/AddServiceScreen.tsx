import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, Zap, Calendar } from 'lucide-react-native';
import { GradientButton, Input, Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES, DEPOSIT_PERCENTAGE } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Category, BookingType } from '../../types';
import { createService } from '../../services/professional';

export default function AddServiceScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [price, setPrice] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('request');
  const [loading, setLoading] = useState(false);

  const depositAmount = price ? parseFloat(price) * DEPOSIT_PERCENTAGE : 0;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a service name.');
      return;
    }
    if (!category) {
      Alert.alert('Required', 'Please select a category.');
      return;
    }
    if (!durationMinutes || parseInt(durationMinutes) < 15) {
      Alert.alert('Required', 'Duration must be at least 15 minutes.');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Required', 'Please enter a valid price.');
      return;
    }

    if (!professionalProfile?.id) {
      Alert.alert('Error', 'Professional profile not found.');
      return;
    }

    setLoading(true);

    try {
      const result = await createService(professionalProfile.id, {
        name: name.trim(),
        category,
        duration_minutes: parseInt(durationMinutes),
        price: parseFloat(price),
        booking_type: bookingType,
      });

      if (result.error) {
        Alert.alert('Error', result.error.message);
      } else {
        Alert.alert('Success', 'Service created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      console.error('Create service error:', err);
      Alert.alert('Error', 'Failed to create service. Please try again.');
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
        <Text style={styles.headerTitle}>Add Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Service Name */}
        <View style={styles.section}>
          <Input
            label="Service Name"
            placeholder="e.g., Bridal Makeup, Haircut & Style"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoriesGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  category === cat.value && styles.categoryChipSelected,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat.value && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.durationOptions}>
            {['30', '45', '60', '90', '120'].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.durationChip,
                  durationMinutes === mins && styles.durationChipSelected,
                ]}
                onPress={() => setDurationMinutes(mins)}
              >
                <Clock
                  size={14}
                  color={
                    durationMinutes === mins
                      ? COLORS.white
                      : COLORS.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.durationChipText,
                    durationMinutes === mins && styles.durationChipTextSelected,
                  ]}
                >
                  {mins} mins
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Input
            label="Price (₱)"
            placeholder="0.00"
            value={price}
            onChangeText={(text) => setPrice(text.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
          />
        </View>

        {/* Booking Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Booking Type</Text>
          <View style={styles.bookingTypes}>
            <TouchableOpacity
              style={[
                styles.bookingTypeCard,
                bookingType === 'instant' && styles.bookingTypeCardSelected,
              ]}
              onPress={() => setBookingType('instant')}
            >
              <View style={styles.bookingTypeIcon}>
                <Zap
                  size={24}
                  color={
                    bookingType === 'instant' ? COLORS.primary : COLORS.textSecondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.bookingTypeTitle,
                  bookingType === 'instant' && styles.bookingTypeTitleSelected,
                ]}
              >
                Instant Book
              </Text>
              <Text style={styles.bookingTypeDesc}>
                Clients can book immediately without approval
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookingTypeCard,
                bookingType === 'request' && styles.bookingTypeCardSelected,
              ]}
              onPress={() => setBookingType('request')}
            >
              <View style={styles.bookingTypeIcon}>
                <Calendar
                  size={24}
                  color={
                    bookingType === 'request' ? COLORS.primary : COLORS.textSecondary
                  }
                />
              </View>
              <Text
                style={[
                  styles.bookingTypeTitle,
                  bookingType === 'request' && styles.bookingTypeTitleSelected,
                ]}
              >
                Request Only
              </Text>
              <Text style={styles.bookingTypeDesc}>
                You approve each booking before it's confirmed
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.saveSection}>
          <GradientButton
            title="Create Service"
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
  content: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
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
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.chipBackground,
  },
  durationChipSelected: {
    backgroundColor: COLORS.primary,
  },
  durationChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  durationChipTextSelected: {
    color: COLORS.white,
  },
  depositCard: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: '#F3E5F5',
  },
  depositLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  depositAmount: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  depositNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  bookingTypes: {
    gap: SPACING.md,
  },
  bookingTypeCard: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  bookingTypeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F9F5FC',
  },
  bookingTypeIcon: {
    marginBottom: SPACING.sm,
  },
  bookingTypeTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  bookingTypeTitleSelected: {
    color: COLORS.primary,
  },
  bookingTypeDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  saveSection: {
    marginTop: SPACING.md,
  },
});
