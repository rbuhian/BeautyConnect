import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  FlatList,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Star,
  Heart,
  X,
  Check,
} from 'lucide-react-native';
import { Card, Loading, EmptyState, SkeletonList } from '../../components';
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

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - SPACING.lg * 2;

export default function DiscoverScreen({ navigation }: any) {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<ProfessionalWithDetails[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProfessionalFilters>({});
  const [tempFilters, setTempFilters] = useState<ProfessionalFilters>({});

  const fetchProfessionals = useCallback(async () => {
    try {
      let result;
      if (searchText.trim()) {
        result = await searchProfessionals(searchText.trim());
      } else {
        result = await getDiscoverProfessionals(filters);
      }

      if (result.data) {
        setProfessionals(result.data);
      }
    } catch (err) {
      console.error('Error fetching professionals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, searchText]);

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

  const handleToggleFavorite = async (professionalId: string) => {
    if (!user?.id) return;

    const isFavorite = favorites.includes(professionalId);
    const newFavorites = isFavorite
      ? favorites.filter((id) => id !== professionalId)
      : [...favorites, professionalId];

    setFavorites(newFavorites);
    await toggleFavorite(user.id, professionalId, !isFavorite);
  };

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

  const renderProfessionalCard = ({ item }: { item: ProfessionalWithDetails }) => {
    const isFavorite = favorites.includes(item.id);
    const activeServices = item.services?.filter((s) => s.is_active) || [];
    const categoryLabels = item.categories
      ?.map((cat) => CATEGORIES.find((c) => c.value === cat)?.label)
      .filter(Boolean)
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProfessionalProfile', { professionalId: item.id })}
        activeOpacity={0.9}
      >
        <View style={styles.cardImageContainer}>
          {item.portfolio_photos?.[0] ? (
            <Image
              source={{ uri: item.portfolio_photos[0] }}
              style={styles.cardImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.cardImage}
            />
          )}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => handleToggleFavorite(item.id)}
          >
            <Heart
              size={20}
              color={isFavorite ? '#FF6B6B' : COLORS.white}
              fill={isFavorite ? '#FF6B6B' : 'transparent'}
            />
          </TouchableOpacity>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#FFB800" fill="#FFB800" />
            <Text style={styles.ratingText}>
              {item.avg_rating?.toFixed(1) || '5.0'}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              {item.user?.avatar ? (
                <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>
                    {item.user?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.proName} numberOfLines={1}>
                {item.user?.name || 'Beauty Professional'}
              </Text>
              <View style={styles.locationRow}>
                <MapPin size={12} color={COLORS.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {item.service_area || 'Metro Manila'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.categoryTags}>
            {categoryLabels?.map((label, idx) => (
              <View key={idx} style={styles.categoryTag}>
                <Text style={styles.categoryTagText}>{label}</Text>
              </View>
            ))}
            {item.location_type === 'home_service' && (
              <View style={[styles.categoryTag, styles.homeServiceTag]}>
                <Text style={styles.categoryTagText}>Home Service</Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.servicesCount}>
              {activeServices.length} service{activeServices.length !== 1 ? 's' : ''}
            </Text>
            {item.min_price !== undefined && item.min_price > 0 && (
              <Text style={styles.priceRange}>
                From ₱{item.min_price.toLocaleString()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          data={professionals}
          renderItem={renderProfessionalCard}
          keyExtractor={(item) => item.id}
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImageContainer: {
    height: 140,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardContent: {
    padding: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatarContainer: {
    width: 36,
    height: 36,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  proName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  categoryTag: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  homeServiceTag: {
    backgroundColor: '#E8F5E9',
  },
  categoryTagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textPrimary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  servicesCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  priceRange: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
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
