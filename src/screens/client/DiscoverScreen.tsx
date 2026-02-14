import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  FlatList,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  SlidersHorizontal,
  Heart,
  X,
  Check,
} from 'lucide-react-native';
import { Card, Loading, EmptyState, SkeletonList, ProfessionalCard } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES, LOCATION_TYPES, PRICE_RANGES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { ProfessionalFilters, Category, LocationType, PriceRange } from '../../types';
import {
  getDiscoverProfessionals,
  searchProfessionals,
  ProfessionalWithDetails,
  getFavorites,
  toggleFavorite,
} from '../../services/client';
import { getFeaturedProfessionals, getActiveAds } from '../../services/ads';
import { FeedAdCard, SponsoredContentCard } from '../../components/ads';
import { AdCreative, DiscoverFeedItem } from '../../types';
import { AD_CONFIG } from '../../constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.lg * 2;

export default function DiscoverScreen({ navigation }: any) {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<ProfessionalWithDetails[]>([]);
  const [feedItems, setFeedItems] = useState<DiscoverFeedItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProfessionalFilters>({});
  const [tempFilters, setTempFilters] = useState<ProfessionalFilters>({});

  const buildFeed = useCallback(
    (
      pros: ProfessionalWithDetails[],
      featured: ProfessionalWithDetails[],
      ads: AdCreative[],
      sponsoredContent: AdCreative[]
    ): DiscoverFeedItem[] => {
      const items: DiscoverFeedItem[] = [];
      const featuredIds = new Set(featured.map((p) => p.id));

      // 1. Featured professionals first (max 3)
      featured.slice(0, AD_CONFIG.FEATURED_MAX_POSITIONS).forEach((p) => {
        items.push({ item_type: 'professional', data: { ...p, is_featured: true } });
      });

      // 2. Regular professionals with ad injection
      const regularPros = pros.filter((p) => !featuredIds.has(p.id));
      let adIndex = 0;
      let scIndex = 0;
      regularPros.forEach((pro, i) => {
        items.push({ item_type: 'professional', data: pro });

        // Inject a feed ad every N cards
        if ((i + 1) % AD_CONFIG.FEED_AD_FREQUENCY === 0 && adIndex < ads.length) {
          items.push({ item_type: 'ad', data: ads[adIndex] });
          adIndex++;
        }

        // Inject sponsored content at positions 12 and 24
        if ((i + 1 === 12 || i + 1 === 24) && scIndex < sponsoredContent.length) {
          items.push({ item_type: 'sponsored_content', data: sponsoredContent[scIndex] });
          scIndex++;
        }
      });

      return items;
    },
    []
  );

  const fetchProfessionals = useCallback(async () => {
    try {
      let result;
      if (searchText.trim()) {
        result = await searchProfessionals(searchText.trim());
      } else {
        result = await getDiscoverProfessionals(filters);
      }

      // Fetch ads and featured listings in parallel
      const [featuredResult, feedAdsResult, sponsoredResult] = await Promise.all([
        getFeaturedProfessionals(),
        getActiveAds('feed_card', 'client'),
        getActiveAds('sponsored_content', 'client'),
      ]);

      const pros = result.data || [];
      setProfessionals(pros);
      setFeedItems(
        buildFeed(
          pros,
          featuredResult.data || [],
          feedAdsResult.data || [],
          sponsoredResult.data || []
        )
      );
    } catch (err) {
      console.error('Error fetching professionals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, searchText, buildFeed]);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return;
    const result = await getFavorites(user.id);
    if (result.data) {
      setFavorites(result.data);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfessionals();
    fetchFavorites();
  }, [fetchProfessionals, fetchFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfessionals();
    fetchFavorites();
  };

  const handleToggleFavorite = useCallback(async (professionalId: string) => {
    if (!user?.id) return;

    const isFavorite = favorites.includes(professionalId);
    const newFavorites = isFavorite
      ? favorites.filter((id) => id !== professionalId)
      : [...favorites, professionalId];

    setFavorites(newFavorites);
    await toggleFavorite(user.id, professionalId, !isFavorite);
  }, [user?.id, favorites]);

  const handlePressCard = useCallback((professionalId: string) => {
    navigation.navigate('ProfessionalProfile', { professionalId });
  }, [navigation]);

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setTempFilters({});
    setFilters({});
    setShowFilters(false);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const renderFeedItem = useCallback(({ item, index }: { item: DiscoverFeedItem; index: number }) => {
    if (item.item_type === 'ad') {
      return <FeedAdCard ad={item.data} position={index} />;
    }
    if (item.item_type === 'sponsored_content') {
      return <SponsoredContentCard ad={item.data} position={index} />;
    }
    const pro = item.data;
    const isFavorite = favorites.includes(pro.id);
    return (
      <ProfessionalCard
        professional={pro as ProfessionalWithDetails}
        isFavorite={isFavorite}
        isFeatured={pro.is_featured}
        onPress={() => handlePressCard(pro.id)}
        onToggleFavorite={() => handleToggleFavorite(pro.id)}
      />
    );
  }, [favorites, handlePressCard, handleToggleFavorite]);

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <X size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterOptions}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.filterChip,
                      tempFilters.category === cat.value && styles.filterChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((prev) => ({
                        ...prev,
                        category: prev.category === cat.value ? undefined : cat.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempFilters.category === cat.value && styles.filterChipTextSelected,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location Type Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Service Location</Text>
              <View style={styles.filterOptions}>
                {LOCATION_TYPES.map((loc) => (
                  <TouchableOpacity
                    key={loc.value}
                    style={[
                      styles.filterChip,
                      tempFilters.location_type === loc.value && styles.filterChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((prev) => ({
                        ...prev,
                        location_type: prev.location_type === loc.value ? undefined : loc.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempFilters.location_type === loc.value && styles.filterChipTextSelected,
                      ]}
                    >
                      {loc.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range</Text>
              <View style={styles.filterOptions}>
                {PRICE_RANGES.map((price) => (
                  <TouchableOpacity
                    key={price.value}
                    style={[
                      styles.filterChip,
                      styles.priceChip,
                      tempFilters.price_range === price.value && styles.filterChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((prev) => ({
                        ...prev,
                        price_range: prev.price_range === price.value ? undefined : price.value,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempFilters.price_range === price.value && styles.filterChipTextSelected,
                      ]}
                    >
                      {price.label}
                    </Text>
                    <Text
                      style={[
                        styles.priceChipDesc,
                        tempFilters.price_range === price.value && styles.filterChipTextSelected,
                      ]}
                    >
                      {price.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyButtonGradient}
              >
                <Check size={18} color={COLORS.white} />
                <Text style={styles.applyButtonText}>Apply</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderSkeletonLoading = () => (
    <View style={styles.skeletonContainer}>
      <SkeletonList type="professional" count={4} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hi, {user?.name?.split(' ')[0] || 'there'}!
          </Text>
          <Text style={styles.subtitle}>Find your perfect beauty pro</Text>
        </View>
        <TouchableOpacity
          style={styles.favoritesButton}
          onPress={() => navigation.navigate('Favorites')}
        >
          <Heart size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or location..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={fetchProfessionals}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <X size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilterCount > 0 && styles.filterButtonActive,
          ]}
          onPress={() => {
            setTempFilters(filters);
            setShowFilters(true);
          }}
        >
          <SlidersHorizontal
            size={20}
            color={activeFilterCount > 0 ? COLORS.white : COLORS.primary}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
        <TouchableOpacity
          style={[
            styles.categoryPill,
            !filters.category && styles.categoryPillActive,
          ]}
          onPress={() => setFilters((prev) => ({ ...prev, category: undefined }))}
        >
          <Text
            style={[
              styles.categoryPillText,
              !filters.category && styles.categoryPillTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryPill,
              filters.category === cat.value && styles.categoryPillActive,
            ]}
            onPress={() =>
              setFilters((prev) => ({
                ...prev,
                category: prev.category === cat.value ? undefined : cat.value,
              }))
            }
          >
            <Text
              style={[
                styles.categoryPillText,
                filters.category === cat.value && styles.categoryPillTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
        </ScrollView>
      </View>

      {/* Results */}
      <View style={styles.resultsContainer}>
        {loading ? (
          renderSkeletonLoading()
        ) : professionals.length === 0 ? (
          <EmptyState
            type={searchText || activeFilterCount > 0 ? 'search' : 'professionals'}
            actionLabel={activeFilterCount > 0 ? 'Clear Filters' : undefined}
            onAction={activeFilterCount > 0 ? clearFilters : undefined}
          />
        ) : (
        <FlatList
          data={feedItems}
          renderItem={renderFeedItem}
          keyExtractor={(item, index) =>
            item.item_type === 'professional'
              ? item.data.id
              : `${item.item_type}-${item.data.id}-${index}`
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      </View>

      {renderFilterModal()}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  greeting: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  favoritesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    height: 44,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.white,
  },
  categoryWrapper: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  categoryScrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: SPACING.md,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
  },
  categoryPillText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  categoryPillTextActive: {
    color: COLORS.white,
  },
  resultsContainer: {
    flex: 1,
  },
  skeletonContainer: {
    padding: SPACING.md,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '80%',
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  filterSection: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.chipBackground,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  filterChipTextSelected: {
    color: COLORS.white,
  },
  priceChip: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    minWidth: 100,
  },
  priceChipDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  clearButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  applyButton: {
    flex: 1,
  },
  applyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  applyButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
});
