import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  Clock,
  Package,
} from 'lucide-react-native';
import { GradientButton, Input, Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Service } from '../../types';
import { getServices } from '../../services/professional';
import { createPackage, getPackageById, updatePackage } from '../../services/packages';

export default function CreatePackageScreen({ navigation, route }: any) {
  const { professionalProfile } = useAuth();
  const packageId = route.params?.packageId;
  const isEditMode = !!packageId;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [packagePrice, setPackagePrice] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!professionalProfile?.id) return;

    try {
      // Fetch professional's services
      const servicesResult = await getServices(professionalProfile.id);
      if (servicesResult.data) {
        setServices(servicesResult.data.filter((s) => s.is_active));
      }

      // If editing, fetch existing package
      if (packageId) {
        const pkgResult = await getPackageById(packageId);
        if (pkgResult.data) {
          const pkg = pkgResult.data;
          setName(pkg.name);
          setDescription(pkg.description || '');
          setPackagePrice(pkg.total_price.toString());
          setSelectedServiceIds(
            (pkg.package_services || []).map((ps) => ps.service_id)
          );
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id)
  );

  const originalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration_minutes,
    0
  );
  const numericPrice = parseFloat(packagePrice) || 0;
  const discountPct =
    originalPrice > 0 && numericPrice > 0
      ? Math.round(((originalPrice - numericPrice) / originalPrice) * 100)
      : 0;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a package name.');
      return;
    }
    if (selectedServiceIds.length < 2) {
      Alert.alert('Required', 'Please select at least 2 services.');
      return;
    }
    if (!packagePrice || numericPrice <= 0) {
      Alert.alert('Required', 'Please enter a valid package price.');
      return;
    }
    if (!professionalProfile?.id) {
      Alert.alert('Error', 'Professional profile not found.');
      return;
    }

    setSaving(true);

    try {
      if (isEditMode) {
        const result = await updatePackage(packageId, {
          name: name.trim(),
          description: description.trim() || undefined,
          total_price: numericPrice,
          discount_pct: Math.max(0, discountPct),
          service_ids: selectedServiceIds,
        });

        if (result.error) {
          Alert.alert('Error', result.error.message);
        } else {
          Alert.alert('Success', 'Package updated successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } else {
        const result = await createPackage(professionalProfile.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          total_price: numericPrice,
          discount_pct: Math.max(0, discountPct),
          service_ids: selectedServiceIds,
        });

        if (result.error) {
          Alert.alert('Error', result.error.message);
        } else {
          Alert.alert('Success', 'Package created successfully!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      }
    } catch (err) {
      console.error('Save package error:', err);
      Alert.alert('Error', 'Failed to save package. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  if (loading) {
    return <Loading fullScreen message="Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? 'Edit Package' : 'Create Package'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Package Name */}
        <View style={styles.section}>
          <Input
            label="Package Name"
            placeholder='e.g., "Bridal Package", "Complete Glam"'
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Input
            label="Description (optional)"
            placeholder="Describe what's included in this package"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Select Services */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Select Services ({selectedServiceIds.length} selected)
          </Text>
          {services.length === 0 ? (
            <Text style={styles.noServicesText}>
              You need to create services first before building a package.
            </Text>
          ) : (
            <View style={styles.servicesList}>
              {services.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceItem,
                      isSelected && styles.serviceItemSelected,
                    ]}
                    onPress={() => toggleService(service.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serviceItemLeft}>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                        ]}
                      >
                        {isSelected && (
                          <Check size={14} color={COLORS.white} />
                        )}
                      </View>
                      <View style={styles.serviceItemInfo}>
                        <Text
                          style={[
                            styles.serviceItemName,
                            isSelected && styles.serviceItemNameSelected,
                          ]}
                        >
                          {service.name}
                        </Text>
                        <View style={styles.serviceItemMeta}>
                          <Clock size={12} color={COLORS.textSecondary} />
                          <Text style={styles.serviceItemMetaText}>
                            {service.duration_minutes} mins
                          </Text>
                          <View style={styles.categoryChip}>
                            <Text style={styles.categoryChipText}>
                              {getCategoryLabel(service.category)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.serviceItemPrice}>
                      ₱{service.price.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Pricing */}
        {selectedServiceIds.length >= 2 && (
          <View style={styles.section}>
            <Text style={styles.label}>Pricing</Text>

            <Card style={styles.pricingCard}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Original Price (sum)</Text>
                <Text style={styles.pricingOriginal}>
                  ₱{originalPrice.toLocaleString()}
                </Text>
              </View>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Total Duration</Text>
                <Text style={styles.pricingValue}>{totalDuration} mins</Text>
              </View>
            </Card>

            <View style={styles.packagePriceInput}>
              <Input
                label="Package Price (₱)"
                placeholder="0.00"
                value={packagePrice}
                onChangeText={(text) =>
                  setPackagePrice(text.replace(/[^0-9.]/g, ''))
                }
                keyboardType="numeric"
              />
            </View>

            {numericPrice > 0 && (
              <Card
                style={[
                  styles.discountPreview,
                  discountPct > 0
                    ? styles.discountPreviewPositive
                    : styles.discountPreviewWarning,
                ]}
              >
                {discountPct > 0 ? (
                  <Text style={styles.discountPreviewText}>
                    Clients save {discountPct}% (₱
                    {(originalPrice - numericPrice).toLocaleString()} off)
                  </Text>
                ) : (
                  <Text style={styles.discountPreviewWarningText}>
                    Package price is not less than the original price. Consider
                    offering a discount.
                  </Text>
                )}
              </Card>
            )}
          </View>
        )}

        {/* Preview */}
        {name && selectedServiceIds.length >= 2 && numericPrice > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Preview</Text>
            <Card style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Package size={20} color={COLORS.primary} />
                <Text style={styles.previewName}>{name}</Text>
                {discountPct > 0 && (
                  <View style={styles.previewDiscountBadge}>
                    <Text style={styles.previewDiscountText}>
                      {discountPct}% OFF
                    </Text>
                  </View>
                )}
              </View>
              {description ? (
                <Text style={styles.previewDescription}>{description}</Text>
              ) : null}
              <View style={styles.previewServices}>
                {selectedServices.map((s, index) => (
                  <Text key={s.id} style={styles.previewServiceItem}>
                    {index + 1}. {s.name} ({s.duration_minutes} mins)
                  </Text>
                ))}
              </View>
              <View style={styles.previewPriceRow}>
                {originalPrice > numericPrice && (
                  <Text style={styles.previewOriginalPrice}>
                    ₱{originalPrice.toLocaleString()}
                  </Text>
                )}
                <Text style={styles.previewPrice}>
                  ₱{numericPrice.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.previewDuration}>
                Total: {totalDuration} minutes
              </Text>
            </Card>
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveSection}>
          <GradientButton
            title={isEditMode ? 'Save Changes' : 'Create Package'}
            onPress={handleSave}
            loading={saving}
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
  noServicesText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
  servicesList: {
    gap: SPACING.sm,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  serviceItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F9F5FC',
  },
  serviceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  serviceItemNameSelected: {
    color: COLORS.primary,
  },
  serviceItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  serviceItemMetaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  categoryChip: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  categoryChipText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  serviceItemPrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pricingCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.chipBackground,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  pricingLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  pricingOriginal: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pricingValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  packagePriceInput: {
    marginTop: SPACING.md,
  },
  discountPreview: {
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  discountPreviewPositive: {
    backgroundColor: '#E8F5E9',
  },
  discountPreviewWarning: {
    backgroundColor: '#FFF8E1',
  },
  discountPreviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
    fontWeight: '500',
  },
  discountPreviewWarningText: {
    fontSize: FONT_SIZES.sm,
    color: '#F57F17',
  },
  previewCard: {
    padding: SPACING.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  previewName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  previewDiscountBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  previewDiscountText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  previewDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  previewServices: {
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  previewServiceItem: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  previewPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  previewOriginalPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  previewPrice: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  previewDuration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  saveSection: {
    marginTop: SPACING.md,
  },
});
