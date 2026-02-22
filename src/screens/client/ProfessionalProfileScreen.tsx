import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Heart,
  Star,
  MapPin,
  Clock,
  Calendar,
  Home,
  Building2,
  Tag,
  ShieldCheck,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { GradientButton, Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES, DEPOSIT_PERCENTAGE } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Service, Review, ServicePackage, Promotion } from '../../types';
import {
  getProfessionalById,
  getProfessionalReviews,
  ProfessionalWithDetails,
  getFavorites,
  toggleFavorite,
} from '../../services/client';
import { getActivePackages } from '../../services/packages';
import { getActivePromotions } from '../../services/promotions';

const { width } = Dimensions.get('window');
const PORTFOLIO_IMAGE_SIZE = (width - SPACING.lg * 2 - SPACING.sm * 2) / 3;

export default function ProfessionalProfileScreen({ navigation, route }: any) {
  const { professionalId } = route.params;
  const { user } = useAuth();
  const [professional, setProfessional] = useState<ProfessionalWithDetails | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'services' | 'packages' | 'portfolio' | 'reviews'>('services');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [proResult, reviewsResult, favResult, pkgResult, promoResult] = await Promise.all([
        getProfessionalById(professionalId),
        getProfessionalReviews(professionalId),
        user?.id ? getFavorites(user.id) : Promise.resolve({ data: [] as string[] }),
        getActivePackages(professionalId),
        getActivePromotions(professionalId),
      ]);

      if (proResult.data) {
        setProfessional(proResult.data);
      }
      if (reviewsResult.data) {
        setReviews(reviewsResult.data);
      }
      if (favResult.data) {
        setIsFavorite(favResult.data.includes(professionalId));
      }
      if (pkgResult.data) {
        setPackages(pkgResult.data);
      }
      if (promoResult.data) {
        setPromotions(promoResult.data);
      }
    } catch (err) {
      console.error('Error fetching professional:', err);
    } finally {
      setLoading(false);
    }
  }, [professionalId, user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleFavorite = async () => {
    if (!user?.id) return;
    setIsFavorite(!isFavorite);
    await toggleFavorite(user.id, professionalId, !isFavorite);
  };

  const handleBookService = (service: Service) => {
    navigation.navigate('BookingFlow', {
      professionalId,
      serviceId: service.id,
      professional,
      service,
    });
  };

  const handleBookPackage = (pkg: ServicePackage) => {
    // MVP: Book with the first service for time slot calculation,
    // but use the package price
    const firstService = pkg.package_services?.[0]?.service;
    if (!firstService) {
      return;
    }
    // Create a modified service with the package price for BookingFlow
    const packageService: Service = {
      ...firstService,
      name: pkg.name,
      price: pkg.total_price,
      deposit_amount: pkg.total_price * DEPOSIT_PERCENTAGE,
      // Use the longest service duration for time slot calculation
      duration_minutes: (pkg.package_services || []).reduce(
        (sum, ps) => sum + (ps.service?.duration_minutes || 0),
        0
      ),
    };
    navigation.navigate('BookingFlow', {
      professionalId,
      serviceId: firstService.id,
      professional,
      service: packageService,
    });
  };

  const getLocationLabel = () => {
    if (!professional) return '';
    switch (professional.location_type) {
      case 'home_service':
        return 'Home Service Only';
      case 'salon':
        return 'Salon Only';
      case 'both':
        return 'Home Service & Salon';
      default:
        return '';
    }
  };

  const activeServices = professional?.services?.filter((s) => s.is_active) || [];

  const renderServiceCard = (service: Service) => {
    const depositAmount = service.price * DEPOSIT_PERCENTAGE;

    return (
      <Card key={service.id} style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <View style={styles.serviceMeta}>
              <View style={styles.serviceMetaItem}>
                <Clock size={14} color={COLORS.textSecondary} />
                <Text style={styles.serviceMetaText}>{service.duration_minutes} mins</Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {CATEGORIES.find((c) => c.value === service.category)?.label}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.servicePricing}>
            <Text style={styles.servicePrice}>₱{service.price.toLocaleString()}</Text>
            <Text style={styles.depositText}>
              ₱{depositAmount.toLocaleString()} deposit
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => handleBookService(service)}
        >
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bookButtonGradient}
          >
            <Calendar size={16} color={COLORS.white} />
            <Text style={styles.bookButtonText}>Book Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Card>
    );
  };

  const renderPortfolio = () => (
    <View style={styles.portfolioGrid}>
      {professional?.portfolio_photos?.map((photo, index) => (
        <TouchableOpacity key={index} style={styles.portfolioItem}>
          <Image source={{ uri: photo }} style={styles.portfolioImage} />
        </TouchableOpacity>
      ))}
      {(!professional?.portfolio_photos || professional.portfolio_photos.length === 0) && (
        <Text style={styles.emptyText}>No portfolio photos yet</Text>
      )}
    </View>
  );

  const renderReview = (review: Review) => (
    <Card key={review.id} style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View style={styles.reviewerInfo}>
          {review.reviewer?.avatar ? (
            <Image source={{ uri: review.reviewer.avatar }} style={styles.reviewerAvatar} />
          ) : (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.reviewerAvatar}
            >
              <Text style={styles.reviewerInitial}>
                {review.reviewer?.name?.[0]?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          )}
          <View>
            <Text style={styles.reviewerName}>{review.reviewer?.name || 'Anonymous'}</Text>
            <Text style={styles.reviewService}>{review.service_name}</Text>
          </View>
        </View>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              color="#FFB800"
              fill={star <= review.rating ? '#FFB800' : 'transparent'}
            />
          ))}
        </View>
      </View>
      <Text style={styles.reviewText}>{review.text}</Text>
      <Text style={styles.reviewDate}>
        {new Date(review.created_at).toLocaleDateString('en-PH', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </Text>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen message="Loading profile..." />;
  }

  if (!professional) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Professional not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {professional.portfolio_photos?.[0] ? (
            <Image
              source={{ uri: professional.portfolio_photos[0] }}
              style={styles.heroImage}
            />
          ) : (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.heroImage}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.heroOverlay}
          />

          {/* Header Actions */}
          <SafeAreaView style={styles.headerActions} edges={['top']}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleToggleFavorite}
            >
              <Heart
                size={22}
                color={isFavorite ? '#FF6B6B' : COLORS.white}
                fill={isFavorite ? '#FF6B6B' : 'transparent'}
              />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Profile Info Overlay */}
          <View style={styles.profileOverlay}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
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
              <View style={styles.profileInfo}>
                <View style={styles.proNameRow}>
                  <Text style={styles.proName} numberOfLines={1}>
                    {professional.user?.name || 'Beauty Professional'}
                  </Text>
                  {professional.is_verified && (
                    <View style={styles.verifiedBadge}>
                      <ShieldCheck size={12} color={COLORS.success} />
                      <Text style={styles.verifiedBadgeText}>Verified</Text>
                    </View>
                  )}
                </View>
                <View style={styles.ratingRow}>
                  <Star size={16} color="#FFB800" fill="#FFB800" />
                  <Text style={styles.ratingText}>
                    {professional.avg_rating?.toFixed(1) || '5.0'}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({professional.total_reviews || 0} reviews)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Location & Categories */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MapPin size={16} color={COLORS.primary} />
              <Text style={styles.infoText}>{professional.service_area || 'Metro Manila'}</Text>
            </View>
            <View style={styles.infoRow}>
              {professional.location_type === 'home_service' && (
                <Home size={16} color={COLORS.primary} />
              )}
              {professional.location_type === 'salon' && (
                <Building2 size={16} color={COLORS.primary} />
              )}
              {professional.location_type === 'both' && (
                <>
                  <Home size={16} color={COLORS.primary} />
                  <Text style={styles.infoText}>&</Text>
                  <Building2 size={16} color={COLORS.primary} />
                </>
              )}
              <Text style={styles.infoText}>{getLocationLabel()}</Text>
            </View>

            <View style={styles.categoryChips}>
              {professional.categories?.map((cat) => (
                <View key={cat} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>
                    {CATEGORIES.find((c) => c.value === cat)?.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bio */}
          {professional.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>{professional.bio}</Text>
            </View>
          )}

          {/* Promotions Banner */}
          {promotions.length > 0 && (
            <View style={styles.promotionsBanner}>
              {promotions.map((promo) => {
                const isCopied = copiedCode === promo.code;
                return (
                  <TouchableOpacity
                    key={promo.id}
                    style={styles.promotionBannerCard}
                    onPress={() => handleCopyCode(promo.code)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.promotionBannerLeft}>
                      <Tag size={16} color={COLORS.primary} />
                      <View style={styles.promotionBannerInfo}>
                        <Text style={styles.promotionBannerTitle}>{promo.title}</Text>
                        <Text style={styles.promotionBannerDiscount}>
                          {promo.discount_type === 'percentage'
                            ? `${promo.discount_value}% off`
                            : `₱${promo.discount_value} off`}
                          {promo.min_order_value > 0
                            ? ` on orders ₱${promo.min_order_value}+`
                            : ''}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.promotionCodeBadge,
                        isCopied && styles.promotionCodeBadgeCopied,
                      ]}
                    >
                      <Text
                        style={[
                          styles.promotionCode,
                          isCopied && styles.promotionCodeCopied,
                        ]}
                      >
                        {isCopied ? 'Copied!' : promo.code}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <Text style={styles.promotionHint}>Tap a code to copy it</Text>
            </View>
          )}

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabsScroll}
            contentContainerStyle={styles.tabs}
          >
            <TouchableOpacity
              style={[styles.tab, activeTab === 'services' && styles.tabActive]}
              onPress={() => setActiveTab('services')}
            >
              <Text
                style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}
                numberOfLines={1}
              >
                Services ({activeServices.length})
              </Text>
            </TouchableOpacity>
            {packages.length > 0 && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'packages' && styles.tabActive]}
                onPress={() => setActiveTab('packages')}
              >
                <Text
                  style={[styles.tabText, activeTab === 'packages' && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  Packages ({packages.length})
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.tab, activeTab === 'portfolio' && styles.tabActive]}
              onPress={() => setActiveTab('portfolio')}
            >
              <Text
                style={[styles.tabText, activeTab === 'portfolio' && styles.tabTextActive]}
                numberOfLines={1}
              >
                Portfolio
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'reviews' && styles.tabActive]}
              onPress={() => setActiveTab('reviews')}
            >
              <Text
                style={[styles.tabText, activeTab === 'reviews' && styles.tabTextActive]}
                numberOfLines={1}
              >
                Reviews ({reviews.length})
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'services' && (
              <>
                {activeServices.length === 0 ? (
                  <Text style={styles.emptyText}>No services available</Text>
                ) : (
                  activeServices.map(renderServiceCard)
                )}
              </>
            )}
            {activeTab === 'packages' && (
              <>
                {packages.map((pkg) => {
                  const originalPrice = (pkg.package_services || []).reduce(
                    (sum, ps) => sum + (ps.service?.price || 0),
                    0
                  );
                  const totalDuration = (pkg.package_services || []).reduce(
                    (sum, ps) => sum + (ps.service?.duration_minutes || 0),
                    0
                  );

                  return (
                    <Card key={pkg.id} style={styles.serviceCard}>
                      <View style={styles.serviceHeader}>
                        <View style={styles.serviceInfo}>
                          <Text style={styles.serviceName}>{pkg.name}</Text>
                          {pkg.discount_pct > 0 && (
                            <View style={styles.packageDiscountBadge}>
                              <Text style={styles.packageDiscountText}>
                                {pkg.discount_pct}% OFF
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.servicePricing}>
                          {originalPrice > pkg.total_price && (
                            <Text style={styles.packageOriginalPrice}>
                              ₱{originalPrice.toLocaleString()}
                            </Text>
                          )}
                          <Text style={styles.servicePrice}>
                            ₱{pkg.total_price.toLocaleString()}
                          </Text>
                          <Text style={styles.depositText}>
                            ₱{(pkg.total_price * DEPOSIT_PERCENTAGE).toLocaleString()} deposit
                          </Text>
                        </View>
                      </View>

                      {pkg.description && (
                        <Text style={styles.packageDescriptionText}>
                          {pkg.description}
                        </Text>
                      )}

                      <View style={styles.packageServicesList}>
                        {(pkg.package_services || []).map((ps) => (
                          <View key={ps.id} style={styles.packageServiceItem}>
                            <View style={styles.packageServiceDot} />
                            <Text style={styles.packageServiceName}>
                              {ps.service?.name || 'Service'}
                            </Text>
                            <Text style={styles.packageServiceDuration}>
                              {ps.service?.duration_minutes || 0} mins
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.serviceMeta}>
                        <View style={styles.serviceMetaItem}>
                          <Clock size={14} color={COLORS.textSecondary} />
                          <Text style={styles.serviceMetaText}>
                            {totalDuration} mins total
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.bookButton}
                        onPress={() => handleBookPackage(pkg)}
                      >
                        <LinearGradient
                          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.bookButtonGradient}
                        >
                          <Calendar size={16} color={COLORS.white} />
                          <Text style={styles.bookButtonText}>Book Package</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </Card>
                  );
                })}
              </>
            )}
            {activeTab === 'portfolio' && renderPortfolio()}
            {activeTab === 'reviews' && (
              <>
                {reviews.length === 0 ? (
                  <Text style={styles.emptyText}>No reviews yet</Text>
                ) : (
                  reviews.map(renderReview)
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  heroSection: {
    height: 280,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  avatarWrapper: {
    marginRight: SPACING.md,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  proNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
    flexWrap: 'wrap',
  },
  proName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.white,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.round,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  verifiedBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  reviewCount: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: SPACING.lg,
  },
  infoSection: {
    marginBottom: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  categoryChip: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xl,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  bioSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  bioText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  tabsScroll: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabContent: {
    minHeight: 200,
  },
  serviceCard: {
    marginBottom: SPACING.md,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  serviceMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  serviceMetaText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  categoryBadge: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  categoryBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textPrimary,
  },
  servicePricing: {
    alignItems: 'flex-end',
  },
  servicePrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  depositText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  bookButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  bookButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  portfolioItem: {
    width: PORTFOLIO_IMAGE_SIZE,
    height: PORTFOLIO_IMAGE_SIZE,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  portfolioImage: {
    width: '100%',
    height: '100%',
  },
  reviewCard: {
    marginBottom: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewerInitial: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  reviewerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewService: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  reviewDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  packageDiscountBadge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xs,
    alignSelf: 'flex-start',
  },
  packageDiscountText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  packageOriginalPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textDecorationLine: 'line-through',
  },
  packageDescriptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  packageServicesList: {
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  packageServiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: 3,
  },
  packageServiceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  packageServiceName: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  packageServiceDuration: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  promotionsBanner: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  promotionBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  promotionBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  promotionBannerInfo: {
    flex: 1,
  },
  promotionBannerTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  promotionBannerDiscount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '500',
  },
  promotionCodeBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    minWidth: 70,
    alignItems: 'center',
  },
  promotionCodeBadgeCopied: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  promotionCode: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  promotionCodeCopied: {
    color: COLORS.white,
    letterSpacing: 0,
  },
  promotionHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
