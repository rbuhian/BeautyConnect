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
import { AffiliateProduct, Category } from '../../types';
import { createAffiliateProduct, updateAffiliateProduct } from '../../services/admin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AffiliateForm'>;

export default function AffiliateFormScreen({ navigation, route }: Props) {
  const existingProduct = route.params?.product as AffiliateProduct | undefined;
  const isEditing = !!existingProduct;

  const [name, setName] = useState(existingProduct?.name || '');
  const [brand, setBrand] = useState(existingProduct?.brand || '');
  const [imageUrl, setImageUrl] = useState(existingProduct?.image_url || '');
  const [price, setPrice] = useState(existingProduct?.price?.toString() || '');
  const [affiliateUrl, setAffiliateUrl] = useState(existingProduct?.affiliate_url || '');
  const [commissionRate, setCommissionRate] = useState(
    existingProduct?.commission_rate?.toString() || ''
  );
  const [targetCategories, setTargetCategories] = useState<Category[]>(
    existingProduct?.target_categories || []
  );
  const [isActive, setIsActive] = useState(existingProduct?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: Category) => {
    setTargetCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !brand.trim() || !price.trim() || !affiliateUrl.trim()) {
      Alert.alert('Validation', 'Please fill in all required fields (name, brand, price, affiliate URL).');
      return;
    }

    const priceNum = parseFloat(price);
    const commissionNum = parseFloat(commissionRate) || 0;

    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Validation', 'Please enter a valid price.');
      return;
    }

    setSaving(true);

    const productData = {
      name: name.trim(),
      brand: brand.trim(),
      image_url: imageUrl.trim() || '',
      price: priceNum,
      affiliate_url: affiliateUrl.trim(),
      commission_rate: commissionNum,
      target_categories: targetCategories,
      is_active: isActive,
    };

    const result = isEditing
      ? await updateAffiliateProduct(existingProduct!.id, productData)
      : await createAffiliateProduct(productData);

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      Alert.alert(
        'Success',
        isEditing ? 'Product updated successfully' : 'Product created successfully',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Product' : 'Add Product'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Check size={20} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. MAC Lipstick Matte"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Brand *</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g. MAC Cosmetics"
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>Image URL</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://example.com/product.jpg"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Price (PHP) *</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="999"
          placeholderTextColor={COLORS.textLight}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Affiliate URL *</Text>
        <TextInput
          style={styles.input}
          value={affiliateUrl}
          onChangeText={setAffiliateUrl}
          placeholder="https://affiliate.example.com/product"
          placeholderTextColor={COLORS.textLight}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={styles.label}>Commission Rate (%)</Text>
        <TextInput
          style={styles.input}
          value={commissionRate}
          onChangeText={setCommissionRate}
          placeholder="10"
          placeholderTextColor={COLORS.textLight}
          keyboardType="numeric"
        />

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

        <Text style={styles.label}>Status</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => setIsActive(true)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, !isActive && styles.chipActive]}
            onPress={() => setIsActive(false)}
          >
            <Text style={[styles.chipText, !isActive && styles.chipTextActive]}>Inactive</Text>
          </TouchableOpacity>
        </View>
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
