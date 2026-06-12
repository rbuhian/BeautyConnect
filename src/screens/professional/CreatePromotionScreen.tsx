import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Tag, Percent, DollarSign, Calendar, RefreshCw } from 'lucide-react-native';
import { Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getPromotionById,
  createPromotion,
  updatePromotion,
  CreatePromotionInput,
} from '../../services/promotions';

type DiscountType = 'percentage' | 'fixed';

function generateCode(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// Simple date formatting: returns YYYY-MM-DD from a Date
function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Return ISO string (midnight local time in UTC)
function toISOStartOf(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toISOString();
}
function toISOEndOf(dateStr: string): string {
  return new Date(dateStr + 'T23:59:59').toISOString();
}

export default function CreatePromotionScreen({ navigation, route }: any) {
  const { promotionId } = route.params || {};
  const isEditing = !!promotionId;
  const { professionalProfile } = useAuth();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [code, setCode] = useState(generateCode());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [startsAt, setStartsAt] = useState(toDateString(new Date()));
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateString(d);
  });

  useEffect(() => {
    if (isEditing) {
      loadPromotion();
    }
  }, [promotionId]);

  const loadPromotion = async () => {
    const result = await getPromotionById(promotionId);
    if (result.data) {
      const p = result.data;
      setCode(p.code);
      setTitle(p.title);
      setDescription(p.description || '');
      setDiscountType(p.discount_type);
      setDiscountValue(String(p.discount_value));
      setMinOrderValue(p.min_order_value > 0 ? String(p.min_order_value) : '');
      setMaxUses(p.max_uses !== null ? String(p.max_uses) : '');
      setStartsAt(toDateString(new Date(p.starts_at)));
      setEndsAt(toDateString(new Date(p.ends_at)));
    }
    setLoading(false);
  };

  const validate = (): string | null => {
    if (!code.trim()) return 'Promo code is required';
    if (!/^[A-Z0-9]+$/.test(code.trim())) return 'Code must be letters and numbers only';
    if (!title.trim()) return 'Title is required';
    const val = parseFloat(discountValue);
    if (isNaN(val) || val <= 0) return 'Enter a valid discount value';
    if (discountType === 'percentage' && val > 100) return 'Percentage cannot exceed 100%';
    if (minOrderValue && isNaN(parseFloat(minOrderValue))) return 'Enter a valid minimum order value';
    if (maxUses && (isNaN(parseInt(maxUses)) || parseInt(maxUses) < 1))
      return 'Enter a valid number of max uses';
    if (new Date(endsAt) <= new Date(startsAt)) return 'End date must be after start date';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Validation Error', err);
      return;
    }
    if (!professionalProfile?.id) return;

    setSaving(true);

    const input: CreatePromotionInput = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description.trim() || undefined,
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_order_value: minOrderValue ? parseFloat(minOrderValue) : 0,
      max_uses: maxUses ? parseInt(maxUses) : null,
      starts_at: toISOStartOf(startsAt),
      ends_at: toISOEndOf(endsAt),
    };

    let result;
    if (isEditing) {
      result = await updatePromotion(promotionId, input);
    } else {
      result = await createPromotion(professionalProfile.id, input);
    }

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      Alert.alert('Success', isEditing ? 'Promotion updated!' : 'Promotion created!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const discountPreview = () => {
    const val = parseFloat(discountValue);
    if (!val || val <= 0) return null;
    return discountType === 'percentage' ? `${val}% off` : `₱${val.toLocaleString()} off`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Promotion' : 'Create Promotion'}
        </Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Preview Card */}
        {(code || title || discountValue) ? (
          <Card style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={styles.previewRow}>
              <View style={styles.previewCodeBadge}>
                <Tag size={13} color={COLORS.primary} />
                <Text style={styles.previewCode}>{code || 'CODE'}</Text>
              </View>
              {discountPreview() && (
                <Text style={styles.previewDiscount}>{discountPreview()}</Text>
              )}
            </View>
            {title ? <Text style={styles.previewTitle}>{title}</Text> : null}
            {description ? <Text style={styles.previewDesc}>{description}</Text> : null}
          </Card>
        ) : null}

        {/* Promo Code */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Promo Code</Text>
          <View style={styles.codeRow}>
            <TextInput
              style={[styles.input, styles.codeInput]}
              value={code}
              onChangeText={t => setCode(t.toUpperCase())}
              placeholder="e.g. SUMMER20"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="characters"
              maxLength={20}
            />
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => setCode(generateCode())}
            >
              <RefreshCw size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Letters and numbers only. Clients enter this at checkout.</Text>
        </Card>

        {/* Basic Details */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.fieldLabel}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Summer Sale"
            placeholderTextColor={COLORS.textLight}
          />
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional note for clients"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Discount */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Discount</Text>
          <Text style={styles.fieldLabel}>Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeChip, discountType === 'percentage' && styles.typeChipActive]}
              onPress={() => setDiscountType('percentage')}
            >
              <Percent size={16} color={discountType === 'percentage' ? COLORS.white : COLORS.textSecondary} />
              <Text
                style={[
                  styles.typeChipText,
                  discountType === 'percentage' && styles.typeChipTextActive,
                ]}
              >
                Percentage
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeChip, discountType === 'fixed' && styles.typeChipActive]}
              onPress={() => setDiscountType('fixed')}
            >
              <DollarSign size={16} color={discountType === 'fixed' ? COLORS.white : COLORS.textSecondary} />
              <Text
                style={[
                  styles.typeChipText,
                  discountType === 'fixed' && styles.typeChipTextActive,
                ]}
              >
                Fixed Amount
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>
            {discountType === 'percentage' ? 'Percentage (%)' : 'Amount (₱)'} *
          </Text>
          <TextInput
            style={styles.input}
            value={discountValue}
            onChangeText={setDiscountValue}
            placeholder={discountType === 'percentage' ? '20' : '200'}
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />

          <Text style={styles.fieldLabel}>Minimum Order Value (₱)</Text>
          <TextInput
            style={styles.input}
            value={minOrderValue}
            onChangeText={setMinOrderValue}
            placeholder="0 (no minimum)"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </Card>

        {/* Usage Limits */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Limits</Text>
          <Text style={styles.fieldLabel}>Max Uses (leave blank for unlimited)</Text>
          <TextInput
            style={styles.input}
            value={maxUses}
            onChangeText={setMaxUses}
            placeholder="e.g. 50"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        </Card>

        {/* Duration */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Start Date *</Text>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.dateInput}
                  value={startsAt}
                  onChangeText={setStartsAt}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>End Date *</Text>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.dateInput}
                  value={endsAt}
                  onChangeText={setEndsAt}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
          </View>
          <Text style={styles.hint}>Format: YYYY-MM-DD (e.g. 2026-12-31)</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.round,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.white,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  previewCard: {
    backgroundColor: COLORS.primaryLight,
    marginBottom: SPACING.md,
  },
  previewLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  previewCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  previewCode: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  previewDiscount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.primary,
  },
  previewTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  previewDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: SPACING.sm,
  },
  codeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    letterSpacing: 2,
    fontWeight: '700',
  },
  generateButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  hint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.chipBackground,
  },
  typeChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  typeChipTextActive: {
    color: COLORS.white,
  },
  dateRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  dateField: {
    flex: 1,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
});
