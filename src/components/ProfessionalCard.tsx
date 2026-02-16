import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, MapPin, Star } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES } from '../constants';
import { ProfessionalWithDetails } from '../services/client';
import FeaturedBadge from './ads/FeaturedBadge';

interface ProfessionalCardProps {
  professional: ProfessionalWithDetails;
  isFavorite: boolean;
  isFeatured?: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
}

const ProfessionalCard = React.memo<ProfessionalCardProps>(({
  professional,
  isFavorite,
  isFeatured,
  onPress,
  onToggleFavorite,
}) => {
  const activeServices = professional.services?.filter((s) => s.is_active) || [];
  const categoryLabels = professional.categories
    ?.map((cat) => CATEGORIES.find((c) => c.value === cat)?.label)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <TouchableOpacity
      style={[styles.card, isFeatured && styles.featuredCard]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardImageContainer}>
        {isFeatured && <FeaturedBadge />}
        {professional.portfolio_photos?.[0] ? (
          <Image
            source={{ uri: professional.portfolio_photos[0] }}
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
          onPress={onToggleFavorite}
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
            {professional.avg_rating?.toFixed(1) || '5.0'}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {professional.user?.avatar ? (
              <Image source={{ uri: professional.user.avatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {professional.user?.name?.[0]?.toUpperCase() || '?'}
                </Text>
              </LinearGradient>
            )}
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.proName} numberOfLines={1}>
              {professional.user?.name || 'Beauty Professional'}
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={12} color={COLORS.textSecondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {professional.service_area || 'Metro Manila'}
                {professional.distance != null &&
                  ` · ${professional.distance < 1 ? `${Math.round(professional.distance * 1000)}m` : `${professional.distance.toFixed(1)} km`}`}
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
          {professional.location_type === 'home_service' && (
            <View style={[styles.categoryTag, styles.homeServiceTag]}>
              <Text style={styles.categoryTagText}>Home Service</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.servicesCount}>
            {activeServices.length} service{activeServices.length !== 1 ? 's' : ''}
          </Text>
          {professional.min_price !== undefined && professional.min_price > 0 && (
            <Text style={styles.priceRange}>
              From ₱{professional.min_price.toLocaleString()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

ProfessionalCard.displayName = 'ProfessionalCard';

export default ProfessionalCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredCard: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  cardImageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  ratingText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  categoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  categoryTag: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  homeServiceTag: {
    backgroundColor: COLORS.primaryLight,
  },
  categoryTagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  servicesCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  priceRange: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
