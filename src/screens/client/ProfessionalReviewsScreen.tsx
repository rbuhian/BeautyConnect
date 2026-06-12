import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { ClientScreenProps } from '../../navigation/types';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import StarRating from '../../components/StarRating';

export default function ProfessionalReviewsScreen({
  navigation,
  route,
}: ClientScreenProps<'ProfessionalReviews'>) {
  const { reviews, professionalName, avgRating, totalReviews } = route.params;

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.reviewerRow}>
        {item.reviewer?.avatar ? (
          <Image source={{ uri: item.reviewer.avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {item.reviewer?.name?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
        )}
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.reviewer?.name || 'Anonymous'}</Text>
          <StarRating
            rating={item.rating}
            size={16}
            activeColor={COLORS.warning}
            inactiveColor="rgba(255,255,255,0.3)"
            spacing={2}
          />
        </View>
        <Text style={styles.reviewDate}>
          {new Date(item.created_at).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </Text>
      </View>
      {item.service_name ? (
        <Text style={styles.serviceName}>{item.service_name}</Text>
      ) : null}
      <Text style={styles.reviewText}>{item.text}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{professionalName}</Text>
            <Text style={styles.headerSub}>Ratings & Reviews</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <Text style={styles.avgRating}>{avgRating.toFixed(1)}</Text>
          <View style={styles.summaryMid}>
            <StarRating
              rating={avgRating}
              size={22}
              activeColor={COLORS.warning}
              inactiveColor="rgba(255,255,255,0.3)"
              spacing={3}
            />
            <Text style={styles.totalReviews}>{totalReviews} reviews</Text>
          </View>
        </View>

        {/* List */}
        {reviews.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No reviews yet.</Text>
          </View>
        ) : (
          <FlatList
            data={reviews}
            renderItem={renderReview}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSub: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.7)',
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  avgRating: {
    fontSize: 48,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 56,
  },
  summaryMid: { gap: SPACING.xs },
  totalReviews: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
  },

  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  reviewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  reviewerInfo: { flex: 1, gap: 2 },
  reviewerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  reviewDate: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.55)',
  },
  serviceName: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
  },
  reviewText: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZES.md },
});
