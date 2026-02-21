import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Clock,
  Edit2,
  Trash2,
  Package,
  Percent,
} from 'lucide-react-native';
import { Card, Loading, GradientButton } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { ServicePackage } from '../../types';
import { getPackages, deletePackage } from '../../services/packages';

export default function ManagePackagesScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPackages = useCallback(async () => {
    if (!professionalProfile?.id) return;

    try {
      const result = await getPackages(professionalProfile.id);
      if (result.data) {
        setPackages(result.data);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professionalProfile?.id]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPackages();
    });
    return unsubscribe;
  }, [navigation, fetchPackages]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPackages();
  };

  const handleDeletePackage = (pkg: ServicePackage) => {
    Alert.alert(
      'Delete Package',
      `Are you sure you want to delete "${pkg.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePackage(pkg.id);
            if (result.error) {
              Alert.alert('Error', 'Failed to delete package.');
            } else {
              setPackages(packages.filter((p) => p.id !== pkg.id));
            }
          },
        },
      ]
    );
  };

  const getServiceNames = (pkg: ServicePackage): string => {
    return (pkg.package_services || [])
      .map((ps) => ps.service?.name || 'Unknown')
      .join(', ');
  };

  const getTotalDuration = (pkg: ServicePackage): number => {
    return (pkg.package_services || []).reduce(
      (sum, ps) => sum + (ps.service?.duration_minutes || 0),
      0
    );
  };

  const getOriginalPrice = (pkg: ServicePackage): number => {
    return (pkg.package_services || []).reduce(
      (sum, ps) => sum + (ps.service?.price || 0),
      0
    );
  };

  if (loading) {
    return <Loading fullScreen message="Loading packages..." />;
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
        <Text style={styles.headerTitle}>My Packages</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreatePackage')}
        >
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        {packages.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Package size={48} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No packages yet</Text>
            <Text style={styles.emptySubtitle}>
              Bundle your services into discounted packages to attract more clients
            </Text>
            <GradientButton
              title="Create Package"
              onPress={() => navigation.navigate('CreatePackage')}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <>
            <Text style={styles.packagesCount}>
              {packages.length} package{packages.length !== 1 ? 's' : ''}
            </Text>

            {packages.map((pkg) => {
              const originalPrice = getOriginalPrice(pkg);
              const totalDuration = getTotalDuration(pkg);
              const serviceNames = getServiceNames(pkg);

              return (
                <Card key={pkg.id} style={styles.packageCard}>
                  <View style={styles.packageHeader}>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{pkg.name}</Text>
                      {pkg.discount_pct > 0 && (
                        <View style={styles.discountBadge}>
                          <Percent size={10} color={COLORS.white} />
                          <Text style={styles.discountText}>
                            {pkg.discount_pct}% OFF
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {pkg.description && (
                    <Text style={styles.packageDescription} numberOfLines={2}>
                      {pkg.description}
                    </Text>
                  )}

                  <View style={styles.servicesListContainer}>
                    <Text style={styles.servicesLabel}>Includes:</Text>
                    <Text style={styles.servicesList}>{serviceNames}</Text>
                  </View>

                  <View style={styles.packageDetails}>
                    <View style={styles.packageDetail}>
                      <Clock size={14} color={COLORS.textSecondary} />
                      <Text style={styles.packageDetailText}>
                        {totalDuration} mins total
                      </Text>
                    </View>
                    <View style={styles.packageDetail}>
                      <Package size={14} color={COLORS.textSecondary} />
                      <Text style={styles.packageDetailText}>
                        {(pkg.package_services || []).length} services
                      </Text>
                    </View>
                  </View>

                  <View style={styles.priceRow}>
                    {originalPrice > pkg.total_price && (
                      <Text style={styles.originalPrice}>
                        ₱{originalPrice.toLocaleString()}
                      </Text>
                    )}
                    <Text style={styles.packagePrice}>
                      ₱{pkg.total_price.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.packageActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        navigation.navigate('CreatePackage', { packageId: pkg.id })
                      }
                    >
                      <Edit2 size={18} color={COLORS.primary} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeletePackage(pkg)}
                    >
                      <Trash2 size={18} color={COLORS.error} />
                      <Text style={[styles.actionText, { color: COLORS.error }]}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!pkg.is_active && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveText}>Inactive</Text>
                    </View>
                  )}
                </Card>
              );
            })}

            <TouchableOpacity
              style={styles.addPackageCard}
              onPress={() => navigation.navigate('CreatePackage')}
            >
              <Plus size={24} color={COLORS.primary} />
              <Text style={styles.addPackageText}>Add another package</Text>
            </TouchableOpacity>
          </>
        )}

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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.lg,
  },
  packagesCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  packageCard: {
    marginBottom: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  packageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  packageName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  discountText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  packageDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  servicesListContainer: {
    marginBottom: SPACING.sm,
  },
  servicesLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  servicesList: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  packageDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  packageDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  packageDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  originalPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  packageActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  inactiveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.textLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomLeftRadius: RADIUS.md,
  },
  inactiveText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '500',
  },
  addPackageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  addPackageText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  emptyButton: {
    width: 200,
  },
});
