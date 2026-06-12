import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS, CATEGORIES } from '../../constants';
import {
  AdType,
  AdStatus,
  AdTargetRole,
  AdCreative,
  Category,
} from '../../types';
import { createAdCreative, updateAdCreative } from '../../services/admin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdForm'>;

const AD_TYPES: { value: AdType; label: string }[] = [
  { value: 'feed_card', label: 'Feed Card' },
  { value: 'interstitial', label: 'Interstitial' },
  { value: 'banner', label: 'Banner' },
  { value: 'affiliate_card', label: 'Affiliate Card' },
  { value: 'sponsored_content', label: 'Sponsored Content' },
];

const TARGET_ROLES: { value: AdTargetRole; label: string }[] = [
  { value: 'client', label: 'Clients' },
  { value: 'professional', label: 'Professionals' },
  { value: 'both', label: 'Both' },
];

const STATUSES: { value: AdStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

export default function AdFormScreen({ navigation, route }: Props) {
  const existingAd = route.params?.ad as AdCreative | undefined;
  const isEditing = !!existingAd;

  const [type, setType] = useState<AdType>(existingAd?.type || 'feed_card');
  const [advertiserName, setAdvertiserName] = useState(existingAd?.advertiser_name || '');
  const [headline, setHeadline] = useState(existingAd?.headline || '');
  const [subtext, setSubtext] = useState(existingAd?.subtext || '');
  const [imageUrl, setImageUrl] = useState(existingAd?.image_url || '');
  const [ctaLabel, setCtaLabel] = useState(existingAd?.cta_label || '');
  const [ctaUrl, setCtaUrl] = useState(existingAd?.cta_url || '');
  const [targetRole, setTargetRole] = useState<AdTargetRole>(
    existingAd?.target_user_role || 'both'
  );
  const [targetCategories, setTargetCategories] = useState<Category[]>(
    existingAd?.target_categories || []
  );
  const [status, setStatus] = useState<AdStatus>(existingAd?.status || 'paused');
  const [startDate, setStartDate] = useState(
    existingAd?.start_date
      ? new Date(existingAd.start_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    existingAd?.end_date
      ? new Date(existingAd.end_date).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: Category) => {
    setTargetCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    if (!advertiserName.trim() || !headline.trim() || !ctaLabel.trim() || !ctaUrl.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields (advertiser, headline, CTA label, CTA URL).');
      return;
    }

    setSaving(true);

    const adData = {
      type,
      advertiser_name: advertiserName.trim(),
      headline: headline.trim(),
      subtext: subtext.trim(),
      image_url: imageUrl.trim() || null,
      cta_label: ctaLabel.trim(),
      cta_url: ctaUrl.trim(),
      target_categories: targetCategories,
      target_user_role: targetRole,
      status,
      start_date: new Date(startDate).toISOString(),
      end_date: new Date(endDate).toISOString(),
    };

    const result = isEditing
      ? await updateAdCreative(existingAd!.id, adData)
      : await createAdCreative(adData);

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      Alert.alert('Success', isEditing ? 'Ad updated successfully' : 'Ad created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Ad' : 'Create Ad'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Check size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Ad Type */}
        <Text style={styles.label}>Ad Type *</Text>
        <View style={styles.chipRow}>
          {AD_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, type === t.value && styles.chipActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Advertiser Name */}
        <Text style={styles.label}>Advertiser Name *</Text>
        <TextInput
          style={styles.input}
          value={advertiserName}
          onChangeText={setAdvertiserName}
          placeholder="e.g. L'Oreal Philippines"
          placeholderTextColor={COLORS.textLight}
        />

        {/* Headline */}
        <Text style={styles.label}>Headline *</Text>
        <TextInput
          style={styles.input}
          value={headline}
          onChangeText={setHeadline}
          placeholder="e.g. Get 20% Off on All Products"
          placeholderTextColor={COLORS.textLight}
        />

        {/* Subtext */}
        <Text style={styles.label}>Subtext</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={subtext}
          onChangeText={setSubtext}
          placeholder="Short description or body text"
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={3}
        />

        {/* Image URL */}
        <Text style={styles.label}>Image URL</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://example.com/image.jpg"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* CTA Label */}
        <Text style={styles.label}>CTA Label *</Text>
        <TextInput
          style={styles.input}
          value={ctaLabel}
          onChangeText={setCtaLabel}
          placeholder="e.g. Shop Now"
          placeholderTextColor={COLORS.textLight}
        />

        {/* CTA URL */}
        <Text style={styles.label}>CTA URL *</Text>
        <TextInput
          style={styles.input}
          value={ctaUrl}
          onChangeText={setCtaUrl}
          placeholder="https://example.com/offer"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Target Role */}
        <Text style={styles.label}>Target Audience</Text>
        <View style={styles.chipRow}>
          {TARGET_ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.chip, targetRole === r.value && styles.chipActive]}
              onPress={() => setTargetRole(r.value)}
            >
              <Text style={[styles.chipText, targetRole === r.value && styles.chipTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Target Categories */}
        <Text style={styles.label}>Target Categories (optional)</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.chip,
                targetCategories.includes(c.value) && styles.chipActive,
              ]}
              onPress={() => toggleCategory(c.value)}
            >
              <Text
                style={[
                  styles.chipText,
                  targetCategories.includes(c.value) && styles.chipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.chip, status === s.value && styles.chipActive]}
              onPress={() => setStatus(s.value)}
            >
              <Text style={[styles.chipText, status === s.value && styles.chipTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dates */}
        <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-02-14"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="2026-03-14"
          placeholderTextColor={COLORS.textLight}
        />
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl * 2,
    gap: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.chipBackground,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
