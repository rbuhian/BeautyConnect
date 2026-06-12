import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  MapPin,
  Star,
  Heart,
} from 'lucide-react-native';
import { Loading, EmptyState, SkeletonList } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getFavoriteProfessionals,
  toggleFavorite,
  ProfessionalWithDetails,
} from '../../services/client';

export default function FavoritesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<ProfessionalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user?.id) return;

    try {
      const result = await getFavoriteProfessionals(user.id);
      if (result.data) {
        setFavorites(result.data);
      }
    } catch (err) {
      console.error('Error fetching favorites:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (professionalId: string) => {
    if (!user?.id) return;

    // Optimistically remove from list
    setFavorites((prev) => prev.filter((p) => p.id !== professionalId));

    // Remove from database
    await toggleFavorite(user.id, professionalId, false);
  };

  const renderFavoriteCard = ({ item }: { item: ProfessionalWithDetails }) => {
    const activeServices = item.services?.filter((s) => s.is_active) || [];
    const categoryLabels = item.categories
      ?.map((cat) => CATEGORIES.find((c) => c.value === cat)?.label)
      .filter(Boolean)
      .slice(0, 2);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ProfessionalProfile', { professionalId: item.id, initialData: item })}
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
            onPress={() => handleRemoveFavorite(item.id)}
          >
            <Heart size={20} color="#FF6B6B" fill="#FF6B6B" />
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Favorites</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.skeletonContainer}>
          <SkeletonList type="professional" count={4} />
        </View>
      ) : favorites.length === 0 ? (
        <EmptyState
          type="favorites"
          actionLabel="Discover Professionals"
          onAction={() => navigation.navigate('ClientTabs', { screen: 'Discover' })}
        />
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderFavoriteCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {favorites.length} saved professional{favorites.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultsCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  skeletonContainer: {
    padding: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
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
});
