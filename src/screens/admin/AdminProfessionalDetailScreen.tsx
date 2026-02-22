import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  User,
  MapPin,
  Building2,
  ShieldCheck,
  ShieldOff,
  Star,
  Scissors,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CURRENCY } from '../../constants';
import { AdminStackParamList } from '../../navigation/types';
import { AdminProfessionalDetail, Category } from '../../types';
import { getProfessionalAdminDetail, toggleProfessionalLive } from '../../services/admin';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminProfessionalDetail'>;

const CATEGORY_LABELS: Record<string, string> = {
  makeup: 'Makeup',
  hair: 'Hair',
  nails: 'Nails',
  lash: 'Lash',
  brow: 'Brow',
};

const LOCATION_LABELS: Record<string, string> = {
  home_service: 'Home Service',
  salon: 'Salon',
  both: 'Home & Salon',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  completed: '#4CAF50',
  cancelled: COLORS.error,
};

export default function AdminProfessionalDetailScreen({ navigation, route }: Props) {
  const { professionalId } = route.params;
  const [detail, setDetail] = useState<AdminProfessionalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchDetail = useCallback(async () => {
    const result = await getProfessionalAdminDetail(professionalId);
    if (result.data) {
      setDetail(result.data);
    } else {
      Alert.alert('Error', result.error?.message || 'Failed to load professional');
    }
    setLoading(false);
    setRefreshing(false);
  }, [professionalId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  const handleToggleLive = (value: boolean) => {
    Alert.alert(
      value ? 'Activate Professional' : 'Deactivate Professional',
      value
        ? `Make ${detail?.name || 'this professional'} visible to clients?`
        : `Hide ${detail?.name || 'this professional'} from Discover? They will no longer receive bookings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: value ? 'Activate' : 'Deactivate',
          style: value ? 'default' : 'destructive',
          onPress: async () => {
            setToggling(true);
            const result = await toggleProfessionalLive(professionalId, value);
            setToggling(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              setDetail((prev) => (prev ? { ...prev, is_live: value } : prev));
            }
          },
        },
      ]
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Professional Detail</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Professional Detail</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Identity */}
        <View style={styles.identitySection}>
          {detail.avatar ? (
            <Image source={{ uri: detail.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <User size={36} color={COLORS.textSecondary} />
            </View>
          )}
          <Text style={styles.name}>{detail.name || 'Unnamed Professional'}</Text>
          <Text style={styles.phone}>{detail.phone}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.locationBadge}>
              <MapPin size={12} color={COLORS.primary} />
              <Text style={styles.locationBadgeText}>
                {LOCATION_LABELS[detail.location_type] || detail.location_type}
              </Text>
            </View>
            {detail.avg_rating > 0 && (
              <View style={styles.ratingBadge}>
                <Star size={12} color="#FFB800" fill="#FFB800" />
                <Text style={styles.ratingBadgeText}>
                  {detail.avg_rating.toFixed(1)} ({detail.total_reviews})
                </Text>
              </View>
            )}
          </View>

          {detail.categories.length > 0 && (
            <View style={styles.categoryRow}>
              {detail.categories.map((cat: Category) => (
                <View key={cat} style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{CATEGORY_LABELS[cat] || cat}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Status Toggle */}
        <View style={styles.card}>
          <View style={styles.statusCardLeft}>
            {detail.is_live ? (
              <ShieldCheck size={20} color={COLORS.success} />
            ) : (
              <ShieldOff size={20} color={COLORS.textSecondary} />
            )}
            <View>
              <Text style={styles.statusCardTitle}>Profile Status</Text>
              <Text style={styles.statusCardSub}>
                {detail.is_live
                  ? 'Live — visible to clients'
                  : 'Offline — hidden from Discover'}
              </Text>
            </View>
          </View>
          <Switch
            value={detail.is_live}
            onValueChange={handleToggleLive}
            disabled={toggling}
            trackColor={{ false: COLORS.border, true: COLORS.success }}
            thumbColor={COLORS.white}
          />
        </View>
        <Text style={styles.adminNote}>Admin override — changes take effect immediately</Text>

        {/* Business Card */}
        {detail.business && (
          <View style={[styles.card, styles.businessCard]}>
            <Building2 size={18} color={COLORS.primary} />
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{detail.business.business_name}</Text>
              <View style={styles.businessTypeBadge}>
                <Text style={styles.businessTypeText}>
                  {detail.business.business_type.charAt(0).toUpperCase() +
                    detail.business.business_type.slice(1)}
                </Text>
              </View>
              {detail.salon_address && (
                <Text style={styles.salonAddress}>{detail.salon_address}</Text>
              )}
            </View>
          </View>
        )}

        {/* Stats */}
        <Text style={styles.sectionTitle}>Statistics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{detail.total_bookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{detail.completed_bookings}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {CURRENCY.symbol}{detail.total_revenue.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

        {/* Services */}
        {detail.services.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Active Services{' '}
              <Text style={styles.sectionCount}>({detail.services.length})</Text>
            </Text>
            <View style={styles.card}>
              {detail.services.map((svc, index) => (
                <View
                  key={svc.id}
                  style={[
                    styles.serviceRow,
                    index < detail.services.length - 1 && styles.serviceRowBorder,
                  ]}
                >
                  <View style={styles.serviceLeft}>
                    <Scissors size={14} color={COLORS.primary} />
                    <View>
                      <Text style={styles.serviceName}>{svc.name}</Text>
                      <View style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>
                          {CATEGORY_LABELS[svc.category] || svc.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.servicePrice}>
                    {CURRENCY.symbol}{svc.price} · {svc.duration_minutes}min
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Recent Bookings */}
        {detail.recent_bookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Recent Bookings{' '}
              <Text style={styles.sectionCount}>(Last {detail.recent_bookings.length})</Text>
            </Text>
            <View style={styles.card}>
              {detail.recent_bookings.map((booking: any, index) => (
                <View
                  key={booking.id}
                  style={[
                    styles.bookingRow,
                    index < detail.recent_bookings.length - 1 && styles.bookingRowBorder,
                  ]}
                >
                  <View style={styles.bookingLeft}>
                    <Text style={styles.bookingDate}>{booking.date}</Text>
                    <Text style={styles.bookingService} numberOfLines={1}>
                      {booking.service?.name || 'Service'}
                    </Text>
                    {booking.client?.name && (
                      <Text style={styles.bookingClient}>{booking.client.name}</Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${STATUS_COLORS[booking.status] || COLORS.textSecondary}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: STATUS_COLORS[booking.status] || COLORS.textSecondary },
                      ]}
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.memberSince}>
          Member since {formatDate(detail.created_at)}
        </Text>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  identitySection: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: SPACING.md,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  phone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  locationBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  ratingBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: '#F57F17',
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  categoryChip: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statusCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusCardTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusCardSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  adminNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    paddingHorizontal: 4,
  },
  businessCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  businessInfo: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  businessTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  businessTypeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
  },
  salonAddress: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  sectionCount: {
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  serviceRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    flex: 1,
  },
  serviceName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  servicePrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  bookingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bookingLeft: {
    flex: 1,
  },
  bookingDate: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bookingService: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  bookingClient: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  statusBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  memberSince: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
