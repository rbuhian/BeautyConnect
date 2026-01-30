import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Star } from 'lucide-react-native';
import { Card, Loading, EmptyState } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { getReviewsReceived, getRatingStats } from '../../services/review';
import { ReviewWithDetails } from '../../services/review';

export default function ClientReviewsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [stats, setStats] = useState({
    avgRating: 0,
    totalReviews: 0,
    ratingBreakdown: [
      { rating: 5, count: 0 },
      { rating: 4, count: 0 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async () => {
    if (!user?.id) return;

    try {
      const [reviewsResult, statsResult] = await Promise.all([
        getReviewsReceived(user.id),
        getRatingStats(user.id),
      ]);

      if (reviewsResult.data) {
        setReviews(reviewsResult.data);
      }

      if (statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderRatingBar = (rating: number, count: number) => {
    const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

    return (
      <View key={rating} style={styles.ratingBarRow}>
        <Text style={styles.ratingBarLabel}>{rating}</Text>
        <Star size={12} color="#FFB800" fill="#FFB800" />
        <View style={styles.ratingBarTrack}>
          <View
            style={[
              styles.ratingBarFill,
              { width: `${percentage}%` },
            ]}
          />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  const renderReview = (review: ReviewWithDetails) => (
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
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>{review.reviewer?.name || 'Professional'}</Text>
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
      {review.text && <Text style={styles.reviewText}>{review.text}</Text>}
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
    return <Loading fullScreen message="Loading reviews..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reviews</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        {/* Stats Card */}
        {stats.totalReviews > 0 && (
          <Card style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <View style={styles.avgRatingContainer}>
                <Text style={styles.avgRating}>{stats.avgRating.toFixed(1)}</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      color="#FFB800"
                      fill={star <= Math.round(stats.avgRating) ? '#FFB800' : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.totalReviewsText}>
                  {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
                </Text>
              </View>
              <View style={styles.ratingBarsContainer}>
                {stats.ratingBreakdown.map((item) =>
                  renderRatingBar(item.rating, item.count)
                )}
              </View>
            </View>
          </Card>
        )}

        {/* Reviews List */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>
            Reviews from Professionals ({reviews.length})
          </Text>

          {reviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No Reviews Yet"
              description="Reviews from professionals will appear here after your bookings are completed"
            />
          ) : (
            reviews.map(renderReview)
          )}
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.chipBackground,
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
  statsCard: {
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statsHeader: {
    flexDirection: 'row',
    gap: SPACING.xl,
  },
  avgRatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  avgRating: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 56,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: SPACING.xs,
  },
  totalReviewsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  ratingBarsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingBarLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: '500',
    width: 12,
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: '#FFB800',
    borderRadius: RADIUS.sm,
  },
  ratingBarCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    width: 24,
    textAlign: 'right',
  },
  reviewsSection: {
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  reviewCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
    flex: 1,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  reviewerInitial: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
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
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  reviewDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
