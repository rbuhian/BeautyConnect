import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Star, MapPin, Clock, Calendar } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES, DEPOSIT_PERCENTAGE } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Service, Review } from '../../types';
import {
  getProfessionalById,
  getProfessionalReviews,
  ProfessionalWithDetails,
} from '../../services/client';
import StarRating from '../../components/StarRating';
import { Loading } from '../../components';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - SPACING.lg * 2 - SPACING.sm * 3) / 4;

const CATEGORY_ICONS: Record<string, string> = {
  makeup: '💄',
  hair: '✂️',
  bridal: '💍',
  wedding: '🎀',
  event: '🎉',
  glam: '⭐',
  aesthetic: '✨',
  prosthetic: '🎭',
  fantasy: '🪄',
  light: '☀️',
  modelling: '📸',
  pageant: '🏆',
  festival: '🎵',
  funeral: '🌸',
  others: '💫',
};

const AVATAR_COLORS = ['#4DD9C0', '#E85D8A', '#F5C842', '#6B8EF5', '#E07B3A'];

export default function ProfessionalProfileScreen({ navigation, route }: any) {
  const { professionalId, initialData } = route.params;
  const { user } = useAuth();

  const [professional, setProfessional] = useState<ProfessionalWithDetails | null>(
    initialData || null
  );
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(!initialData);

  const fetchData = useCallback(async () => {
    try {
      const [proResult, reviewsResult] = await Promise.all([
        getProfessionalById(professionalId),
        getProfessionalReviews(professionalId),
      ]);
      if (proResult.data) setProfessional(proResult.data);
      if (reviewsResult.data) setReviews(reviewsResult.data);
    } catch (err) {
      console.error('Error fetching professional:', err);
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBookService = (service: Service) => {
    navigation.navigate('BookingFlow', {
      professionalId,
      serviceId: service.id,
      professional,
      service,
    });
  };

  if (loading && !professional) {
    return <Loading fullScreen message="Loading profile..." />;
  }

  if (!professional) {
    return (
      <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.centered}>
            <Text style={styles.errorText}>Profile not available</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const validCategories = new Set(CATEGORIES.map((c) => c.value));
  const activeServices = professional.services?.filter((s: Service) => s.is_active && validCategories.has(s.category as any)) || [];
  const avatarBg = AVATAR_COLORS[0];
  const initials = professional.user?.name
    ? professional.user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const categories: string[] = (professional.categories || []).filter((c: string) => validCategories.has(c as any));
  const photos: string[] = professional.portfolio_photos || [];
  const totalReviews = reviews.length > 0 ? reviews.length : (professional.total_reviews ?? 0);
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: Review) => sum + r.rating, 0) / reviews.length
    : (professional.avg_rating ?? 0);

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.white} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ── Profile Header ── */}
          <View style={styles.profileHeader}>
            <View style={[styles.avatarCircle, { backgroundColor: avatarBg }]}>
              {professional.user?.avatar ? (
                <Image source={{ uri: professional.user.avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.proName}>{professional.user?.name || 'Beauty Artist'}</Text>
              <Text style={styles.proRole}>
                {categories.length > 0
                  ? categories.map((c: string) => CATEGORIES.find((cat) => cat.value === c)?.label).filter(Boolean).join(' and ') + ' Artist'
                  : 'Beauty Professional'}
              </Text>
              <StarRating rating={avgRating} size={18} activeColor={COLORS.warning} inactiveColor="rgba(255,255,255,0.3)" spacing={2} />
            </View>
          </View>

          {/* ── About Me ── */}
          {professional.bio ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>About Me</Text>
              <Text style={styles.cardBody}>{professional.bio}</Text>
            </View>
          ) : null}

          {/* ── Availability ── */}
          <View style={styles.availabilityRow}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.availabilityPill}
            >
              <Text style={styles.availabilityLabel}>Availability</Text>
              <View style={styles.availabilityDivider} />
              <Text style={styles.availabilityStatus}>
                {professional.is_live ? 'Online' : 'Offline'}
              </Text>
              <Switch
                value={!!professional.is_live}
                disabled
                trackColor={{ false: 'rgba(255,255,255,0.3)', true: '#4CAF50' }}
                thumbColor={COLORS.white}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </LinearGradient>
          </View>

          {/* ── Services Offered ── */}
          {categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services Offered</Text>
              <View style={styles.categoryTiles}>
                {categories.map((cat: string) => {
                  const catInfo = CATEGORIES.find((c) => c.value === cat);
                  return (
                    <LinearGradient
                      key={cat}
                      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                      style={styles.categoryTile}
                    >
                      <Text style={styles.categoryTileLabel}>{catInfo?.label || cat}</Text>
                      <Text style={styles.categoryTileIcon}>{CATEGORY_ICONS[cat] || '✨'}</Text>
                    </LinearGradient>
                  );
                })}
              </View>

              {/* Bookable services */}
              {activeServices.length > 0 && (
                <View style={styles.serviceList}>
                  {activeServices.map((service: Service) => (
                    <View key={service.id} style={styles.serviceRow}>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <View style={styles.serviceMeta}>
                          <Clock size={12} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.serviceMetaText}>{service.duration_minutes} mins</Text>
                          <Text style={styles.servicePrice}>₱{service.price.toLocaleString()}</Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => handleBookService(service)}
                      >
                        <Calendar size={14} color={COLORS.white} />
                        <Text style={styles.bookBtnText}>Book</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Photo Gallery ── */}
          {photos.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Photo Gallery</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Gallery', {
                    photos,
                    title: `${professional.user?.name || 'Artist'}'s Gallery`,
                  })}
                >
                  <Text style={styles.seeAll}>See all &gt;</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {photos.map((uri: string, i: number) => (
                  <Image key={i} source={{ uri }} style={styles.galleryPhoto} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* ── Ratings and Reviews ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ratings and Reviews</Text>

            {/* Summary card */}
            <View style={styles.ratingSummary}>
              <Text style={styles.ratingBig}>{avgRating.toFixed(1)}</Text>
              <StarRating rating={avgRating} size={18} activeColor={COLORS.warning} inactiveColor="rgba(255,255,255,0.3)" spacing={2} />
              <Text style={styles.ratingCount}>{totalReviews} reviews</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfessionalReviews', {
                  reviews,
                  professionalName: professional.user?.name || 'Artist',
                  avgRating,
                  totalReviews,
                })}
              >
                <Text style={styles.seeAll}>&gt;</Text>
              </TouchableOpacity>
            </View>

            {/* Individual reviews */}
            {reviews.slice(0, 5).map((review: Review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewerRow}>
                  {review.reviewer?.avatar ? (
                    <Image source={{ uri: review.reviewer.avatar }} style={styles.reviewerAvatar} />
                  ) : (
                    <View style={[styles.reviewerAvatar, styles.reviewerAvatarPlaceholder]}>
                      <Text style={styles.reviewerInitial}>
                        {review.reviewer?.name?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <View>
                    <Text style={styles.reviewerName}>{review.reviewer?.name || 'Anonymous'}</Text>
                    <StarRating rating={review.rating} size={14} activeColor={COLORS.warning} inactiveColor="rgba(255,255,255,0.3)" spacing={1} />
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}

            {reviews.length === 0 && (
              <Text style={styles.emptyText}>No reviews yet.</Text>
            )}
          </View>

          {/* Bottom spacer */}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl },
  backBtn: {
    marginLeft: SPACING.lg,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: COLORS.white, fontSize: FONT_SIZES.md },

  // Profile header
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarInitials: { color: COLORS.white, fontWeight: '700', fontSize: 28 },
  profileInfo: { flex: 1, gap: 4 },
  proName: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white },
  proRole: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.8)' },

  // About Me card
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardLabel: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.white, marginBottom: SPACING.xs },
  cardBody: { fontSize: FONT_SIZES.sm, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },

  // Availability
  availabilityRow: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  availabilityLabel: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZES.sm },
  availabilityDivider: { flex: 1 },
  availabilityStatus: { color: COLORS.white, fontSize: FONT_SIZES.sm },

  // Sections
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  seeAll: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZES.sm },

  // Category tiles
  categoryTiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  categoryTile: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    minWidth: 90,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryTileLabel: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: '600', textAlign: 'center' },
  categoryTileIcon: { fontSize: 24 },

  // Service list
  serviceList: { gap: SPACING.sm },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  serviceInfo: { flex: 1 },
  serviceName: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZES.sm, marginBottom: 4 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  serviceMetaText: { color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZES.xs },
  servicePrice: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.sm },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  bookBtnText: { color: COLORS.white, fontSize: FONT_SIZES.xs, fontWeight: '600' },

  // Photo gallery
  photoScroll: { marginTop: SPACING.xs },
  galleryPhoto: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    marginRight: SPACING.sm,
  },

  // Ratings
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  ratingBig: { fontSize: FONT_SIZES.xl, fontWeight: '700', color: COLORS.white },
  ratingCount: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZES.sm, flex: 1 },

  // Review cards
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerAvatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  reviewerInitial: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZES.sm },
  reviewerName: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZES.sm, marginBottom: 2 },
  reviewText: { color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZES.sm, lineHeight: 18 },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZES.sm, textAlign: 'center', paddingVertical: SPACING.md },
});
