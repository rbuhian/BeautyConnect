import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Star, ToggleLeft, ToggleRight, User } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS, CURRENCY, FEATURED_PACKAGES } from '../../constants';
import { FeaturedListingWithProfessional } from '../../types';
import { getAllFeaturedListings, toggleFeaturedListing } from '../../services/admin';

export default function FeaturedListingsScreen() {
  const [listings, setListings] = useState<FeaturedListingWithProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');

  const fetchListings = useCallback(async () => {
    const result = await getAllFeaturedListings();
    if (result.data) {
      setListings(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
  }, [fetchListings]);

  const handleToggle = async (listing: FeaturedListingWithProfessional) => {
    const action = listing.is_active ? 'deactivate' : 'activate';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Listing`,
      `Are you sure you want to ${action} this featured listing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            const result = await toggleFeaturedListing(listing.id, !listing.is_active);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              fetchListings();
            }
          },
        },
      ]
    );
  };

  const now = new Date().toISOString();
  const filteredListings = listings.filter((l) => {
    if (filter === 'active') return l.is_active && l.ends_at >= now;
    if (filter === 'expired') return !l.is_active || l.ends_at < now;
    return true;
  });

  const totalRevenue = listings.reduce((sum, l) => sum + l.price_paid, 0);
  const activeCount = listings.filter((l) => l.is_active && l.ends_at >= now).length;

  const getPackageLabel = (key: string) => {
    return FEATURED_PACKAGES.find((p) => p.key === key)?.label || key;
  };

  const renderListing = ({ item }: { item: FeaturedListingWithProfessional }) => {
    const isExpired = !item.is_active || item.ends_at < now;

    return (
      <View style={[styles.listingCard, isExpired && styles.listingCardExpired]}>
        <View style={styles.listingHeader}>
          <View style={styles.professionalInfo}>
            {item.professional_avatar ? (
              <Image
                source={{ uri: item.professional_avatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <User size={16} color={COLORS.textLight} />
              </View>
            )}
            <View>
              <Text style={styles.professionalName}>
                {item.professional_name || 'Unknown'}
              </Text>
              <Text style={styles.categoriesText}>
                {item.professional_categories.join(', ') || 'No categories'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => handleToggle(item)}
          >
            {item.is_active ? (
              <ToggleRight size={24} color={COLORS.success} />
            ) : (
              <ToggleLeft size={24} color={COLORS.textLight} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.listingDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Package</Text>
            <Text style={styles.detailValue}>{getPackageLabel(item.package)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price Paid</Text>
            <Text style={styles.detailValue}>
              {CURRENCY.symbol}{item.price_paid.toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Period</Text>
            <Text style={styles.detailValue}>
              {new Date(item.starts_at).toLocaleDateString()} — {new Date(item.ends_at).toLocaleDateString()}
            </Text>
          </View>
          {item.payment_ref && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Ref</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.payment_ref}
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.statusBar,
            { backgroundColor: isExpired ? COLORS.error + '20' : COLORS.success + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusBarText,
              { color: isExpired ? COLORS.error : COLORS.success },
            ]}
          >
            {isExpired ? 'Expired / Inactive' : 'Active'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Featured Listings</Text>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Star size={16} color={COLORS.warning} />
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {CURRENCY.symbol}{totalRevenue.toLocaleString()}
          </Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'expired'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredListings}
        keyExtractor={(item) => item.id}
        renderItem={renderListing}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No featured listings</Text>
            <Text style={styles.emptySubtext}>
              Professionals can purchase boosts from their dashboard
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.chipBackground,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  listingCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  listingCardExpired: {
    opacity: 0.7,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  professionalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  professionalName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoriesText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    marginTop: 2,
  },
  toggleButton: {
    padding: SPACING.xs,
  },
  listingDetails: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    maxWidth: '60%',
  },
  statusBar: {
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  statusBarText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
