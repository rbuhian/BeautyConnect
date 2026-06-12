import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

// Single skeleton element with shimmer animation
export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = RADIUS.sm,
  style,
}: SkeletonLoaderProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

// Professional card skeleton
export function ProfessionalCardSkeleton() {
  return (
    <View style={styles.professionalCard}>
      <SkeletonLoader height={160} borderRadius={RADIUS.md} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <View style={styles.cardInfo}>
            <SkeletonLoader width={120} height={16} />
            <SkeletonLoader width={80} height={12} style={{ marginTop: 4 }} />
          </View>
        </View>
        <View style={styles.cardCategories}>
          <SkeletonLoader width={60} height={24} borderRadius={12} />
          <SkeletonLoader width={50} height={24} borderRadius={12} />
          <SkeletonLoader width={70} height={24} borderRadius={12} />
        </View>
        <SkeletonLoader width="60%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

// Booking card skeleton
export function BookingCardSkeleton() {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <SkeletonLoader width={60} height={60} borderRadius={30} />
        <View style={styles.bookingInfo}>
          <SkeletonLoader width={140} height={18} />
          <SkeletonLoader width={100} height={14} style={{ marginTop: 4 }} />
          <SkeletonLoader width={80} height={12} style={{ marginTop: 4 }} />
        </View>
        <SkeletonLoader width={70} height={24} borderRadius={12} />
      </View>
      <View style={styles.bookingDetails}>
        <SkeletonLoader width="100%" height={14} />
        <SkeletonLoader width="70%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

// Message/conversation skeleton
export function MessageCardSkeleton() {
  return (
    <View style={styles.messageCard}>
      <SkeletonLoader width={50} height={50} borderRadius={25} />
      <View style={styles.messageInfo}>
        <SkeletonLoader width={120} height={16} />
        <SkeletonLoader width="80%" height={14} style={{ marginTop: 4 }} />
      </View>
      <SkeletonLoader width={40} height={12} />
    </View>
  );
}

// Service list skeleton
export function ServiceCardSkeleton() {
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceInfo}>
        <SkeletonLoader width={150} height={18} />
        <SkeletonLoader width={100} height={14} style={{ marginTop: 4 }} />
        <SkeletonLoader width={80} height={12} style={{ marginTop: 4 }} />
      </View>
      <SkeletonLoader width={70} height={20} />
    </View>
  );
}

// List of skeletons
interface SkeletonListProps {
  count?: number;
  type: 'professional' | 'booking' | 'message' | 'service';
}

export function SkeletonList({ count = 3, type }: SkeletonListProps) {
  const SkeletonComponent = {
    professional: ProfessionalCardSkeleton,
    booking: BookingCardSkeleton,
    message: MessageCardSkeleton,
    service: ServiceCardSkeleton,
  }[type];

  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.border,
  },
  list: {
    gap: SPACING.md,
  },
  professionalCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  cardInfo: {
    flex: 1,
  },
  cardCategories: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  bookingCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  messageInfo: {
    flex: 1,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  serviceInfo: {
    flex: 1,
  },
});

export default SkeletonLoader;
