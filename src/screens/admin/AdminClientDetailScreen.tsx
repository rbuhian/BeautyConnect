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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  User,
  Phone,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CURRENCY } from '../../constants';
import { AdminStackParamList } from '../../navigation/types';
import { AdminClientDetail } from '../../types';
import { getClientAdminDetail, toggleClientSuspension } from '../../services/admin';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminClientDetail'>;

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  completed: '#4CAF50',
  cancelled: COLORS.error,
};

export default function AdminClientDetailScreen({ navigation, route }: Props) {
  const { clientId } = route.params;
  const [detail, setDetail] = useState<AdminClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchDetail = useCallback(async () => {
    const result = await getClientAdminDetail(clientId);
    if (result.data) {
      setDetail(result.data);
    } else {
      Alert.alert('Error', result.error?.message || 'Failed to load client');
    }
    setLoading(false);
    setRefreshing(false);
  }, [clientId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  const handleToggleSuspension = (value: boolean) => {
    Alert.alert(
      value ? 'Suspend Client' : 'Reactivate Client',
      value
        ? `Suspend ${detail?.name || 'this client'}? They will not be able to make new bookings.`
        : `Reactivate ${detail?.name || 'this client'}? They will regain full access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: value ? 'Suspend' : 'Reactivate',
          style: value ? 'destructive' : 'default',
          onPress: async () => {
            setToggling(true);
            const result = await toggleClientSuspension(clientId, value);
            setToggling(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              setDetail((prev) => (prev ? { ...prev, is_suspended: value } : prev));
            }
          },
        },
      ]
    );
  };

  const handleCallPhone = () => {
    if (detail?.phone) {
      Linking.openURL(`tel:${detail.phone}`);
    }
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
          <Text style={styles.headerTitle}>Client Detail</Text>
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
        <Text style={styles.headerTitle}>Client Detail</Text>
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
          <Text style={styles.name}>{detail.name || 'Unnamed Client'}</Text>

          <TouchableOpacity style={styles.phoneRow} onPress={handleCallPhone}>
            <Phone size={14} color={COLORS.primary} />
            <Text style={styles.phone}>{detail.phone}</Text>
          </TouchableOpacity>

          <Text style={styles.memberSince}>
            Member since {formatDate(detail.created_at)}
          </Text>
        </View>

        {/* Suspension Toggle */}
        <View style={styles.card}>
          <View style={styles.statusCardLeft}>
            {detail.is_suspended ? (
              <AlertTriangle size={20} color={COLORS.error} />
            ) : (
              <CheckCircle size={20} color={COLORS.success} />
            )}
            <View>
              <Text style={styles.statusCardTitle}>Account Status</Text>
              <Text style={styles.statusCardSub}>
                {detail.is_suspended
                  ? 'Suspended — cannot make new bookings'
                  : 'Active — full access'}
              </Text>
            </View>
          </View>
          <Switch
            value={detail.is_suspended}
            onValueChange={handleToggleSuspension}
            disabled={toggling}
            trackColor={{ false: COLORS.border, true: COLORS.error }}
            thumbColor={COLORS.white}
          />
        </View>
        <Text style={styles.adminNote}>
          Suspension prevents new bookings. Existing confirmed bookings are not affected.
        </Text>

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
              {CURRENCY.symbol}{detail.total_spent.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
        </View>

        {/* Booking History */}
        {detail.bookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Booking History{' '}
              <Text style={styles.sectionCount}>(Last {detail.bookings.length})</Text>
            </Text>
            <View style={styles.card}>
              {detail.bookings.map((booking: any, index) => (
                <View
                  key={booking.id}
                  style={[
                    styles.bookingRow,
                    index < detail.bookings.length - 1 && styles.bookingRowBorder,
                  ]}
                >
                  <View style={styles.bookingLeft}>
                    <Text style={styles.bookingDate}>{booking.date}</Text>
                    <Text style={styles.bookingService} numberOfLines={1}>
                      {booking.service?.name || 'Service'}
                    </Text>
                    {booking.professional?.user?.name && (
                      <Text style={styles.bookingProfessional}>
                        with {booking.professional.user.name}
                      </Text>
                    )}
                  </View>
                  <View style={styles.bookingRight}>
                    {booking.total_price > 0 && (
                      <Text style={styles.bookingPrice}>
                        {CURRENCY.symbol}{booking.total_price.toLocaleString()}
                      </Text>
                    )}
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
                </View>
              ))}
            </View>
          </>
        )}

        {detail.bookings.length === 0 && (
          <View style={styles.emptyBookings}>
            <Text style={styles.emptyBookingsText}>No bookings yet</Text>
          </View>
        )}
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
    marginBottom: SPACING.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  phone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  memberSince: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingRight: SPACING.sm,
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
  bookingProfessional: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  bookingRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bookingPrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  emptyBookings: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyBookingsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
