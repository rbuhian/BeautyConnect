import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Search,
  Users,
  DollarSign,
  Repeat,
  User,
  ChevronDown,
  ChevronUp,
  Calendar,
  Star,
  Briefcase,
  UserX,
  UserCheck,
} from 'lucide-react-native';
import { Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getClientList,
  getClientBookingHistory,
  getClientStats,
  ClientSummary,
  ClientDetailStats,
} from '../../services/client-management';
import { Booking } from '../../types';
import { format, parseISO } from 'date-fns';
import { blockUser, unblockUser, isUserBlocked } from '../../services/reports';

const STATUS_COLORS: Record<string, string> = {
  completed: COLORS.success,
  confirmed: '#1976D2',
  pending: COLORS.warning,
  cancelled: COLORS.error,
};

export default function ClientManagementScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientDetails, setClientDetails] = useState<{
    stats: ClientDetailStats | null;
    bookings: Booking[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [blockedClients, setBlockedClients] = useState<Record<string, boolean>>({});

  const fetchClients = useCallback(async () => {
    if (!professionalProfile?.id) return;
    try {
      const result = await getClientList(professionalProfile.id);
      if (result.data) setClients(result.data);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professionalProfile?.id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const handleToggleExpand = async (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      setClientDetails(null);
      return;
    }

    setExpandedClientId(clientId);
    setLoadingDetails(true);

    if (!professionalProfile?.id) return;

    try {
      const [statsRes, historyRes, blockRes] = await Promise.all([
        getClientStats(professionalProfile.id, clientId),
        getClientBookingHistory(professionalProfile.id, clientId),
        isUserBlocked(clientId),
      ]);

      if (blockRes.data !== undefined) {
        setBlockedClients((prev) => ({ ...prev, [clientId]: !!blockRes.data }));
      }

      setClientDetails({
        stats: statsRes.data,
        bookings: historyRes.data || [],
      });
    } catch (err) {
      console.error('Error fetching client details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBlockClient = (client: ClientSummary) => {
    const isBlocked = blockedClients[client.clientId];
    if (isBlocked) {
      Alert.alert('Unblock Client', `Unblock ${client.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            await unblockUser(client.clientId);
            setBlockedClients((prev) => ({ ...prev, [client.clientId]: false }));
          },
        },
      ]);
    } else {
      Alert.alert('Block Client', `Block ${client.name}? They will be prevented from contacting you.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            await blockUser(client.clientId);
            setBlockedClients((prev) => ({ ...prev, [client.clientId]: true }));
          },
        },
      ]);
    }
  };

  const filteredClients = searchQuery
    ? clients.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clients;

  // Summary stats
  const totalRevenue = clients.reduce((sum, c) => sum + c.totalRevenue, 0);
  const repeatClients = clients.filter((c) => c.totalBookings > 1).length;
  const repeatRate = clients.length > 0 ? Math.round((repeatClients / clients.length) * 100) : 0;

  if (loading) {
    return <Loading fullScreen message="Loading clients..." />;
  }

  const renderClientItem = ({ item }: { item: ClientSummary }) => {
    const isExpanded = expandedClientId === item.clientId;

    return (
      <View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleToggleExpand(item.clientId)}
        >
          <Card style={styles.clientCard}>
            <View style={styles.clientRow}>
              {/* Avatar */}
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.avatar}
                >
                  <User size={20} color={COLORS.white} />
                </LinearGradient>
              )}

              {/* Info */}
              <View style={styles.clientInfo}>
                <Text style={styles.clientName}>{item.name}</Text>
                <Text style={styles.clientMeta}>
                  {item.totalBookings} booking{item.totalBookings !== 1 ? 's' : ''} | ₱{item.totalRevenue.toLocaleString()}
                </Text>
                {item.lastBookingDate && (
                  <Text style={styles.lastVisit}>
                    Last visit: {format(parseISO(item.lastBookingDate), 'MMM d, yyyy')}
                  </Text>
                )}
              </View>

              {/* Expand arrow */}
              {isExpanded ? (
                <ChevronUp size={20} color={COLORS.textSecondary} />
              ) : (
                <ChevronDown size={20} color={COLORS.textSecondary} />
              )}
            </View>

            {/* Favorite service badge */}
            {item.favoriteService && (
              <View style={styles.favServiceBadge}>
                <Briefcase size={12} color={COLORS.primary} />
                <Text style={styles.favServiceText}>{item.favoriteService}</Text>
              </View>
            )}
          </Card>
        </TouchableOpacity>

        {/* Expanded details */}
        {isExpanded && (
          <Card style={styles.detailsCard}>
            {loadingDetails ? (
              <View style={styles.detailsLoading}>
                <Text style={styles.loadingText}>Loading details...</Text>
              </View>
            ) : clientDetails ? (
              <>
                {/* Stats Row */}
                {clientDetails.stats && (
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{clientDetails.stats.completedBookings}</Text>
                      <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{clientDetails.stats.cancelledBookings}</Text>
                      <Text style={styles.statLabel}>Cancelled</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>
                        ₱{Math.round(clientDetails.stats.avgBookingValue).toLocaleString()}
                      </Text>
                      <Text style={styles.statLabel}>Avg Value</Text>
                    </View>
                    {clientDetails.stats.avgRatingGiven !== null && (
                      <View style={styles.statItem}>
                        <View style={styles.ratingRow}>
                          <Star size={12} color="#FFB800" />
                          <Text style={styles.statValue}>
                            {clientDetails.stats.avgRatingGiven.toFixed(1)}
                          </Text>
                        </View>
                        <Text style={styles.statLabel}>Avg Rating</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Block/Unblock */}
                <TouchableOpacity
                  style={styles.blockRow}
                  onPress={() => handleBlockClient(item)}
                >
                  {blockedClients[item.clientId] ? (
                    <>
                      <UserCheck size={16} color={COLORS.textSecondary} />
                      <Text style={styles.unblockText}>Unblock Client</Text>
                    </>
                  ) : (
                    <>
                      <UserX size={16} color={COLORS.error} />
                      <Text style={styles.blockText}>Block Client</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Recent Bookings */}
                <Text style={styles.detailSectionTitle}>Recent Bookings</Text>
                {clientDetails.bookings.length === 0 ? (
                  <Text style={styles.noBookingsText}>No bookings found</Text>
                ) : (
                  clientDetails.bookings.slice(0, 5).map((booking) => (
                    <TouchableOpacity
                      key={booking.id}
                      style={styles.bookingItem}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('BookingDetail', { booking })}
                    >
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingService}>
                          {booking.service?.name || 'Service'}
                        </Text>
                        <Text style={styles.bookingDate}>
                          {format(parseISO(booking.date), 'MMM d, yyyy')} at {booking.time_slot}
                        </Text>
                      </View>
                      <View style={styles.bookingRight}>
                        <Text style={styles.bookingPrice}>
                          ₱{(booking.total_price || 0).toLocaleString()}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: `${STATUS_COLORS[booking.status] || COLORS.textSecondary}20` }
                        ]}>
                          <Text style={[
                            styles.statusText,
                            { color: STATUS_COLORS[booking.status] || COLORS.textSecondary }
                          ]}>
                            {booking.status}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </>
            ) : null}
          </Card>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Clients</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{clients.length}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search clients..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Card style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
          <Users size={20} color="#1976D2" />
          <Text style={styles.summaryValue}>{clients.length}</Text>
          <Text style={styles.summaryLabel}>Total Clients</Text>
        </Card>
        <Card style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
          <DollarSign size={20} color={COLORS.success} />
          <Text style={styles.summaryValue}>₱{totalRevenue.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total Revenue</Text>
        </Card>
        <Card style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
          <Repeat size={20} color={COLORS.primary} />
          <Text style={styles.summaryValue}>{repeatRate}%</Text>
          <Text style={styles.summaryLabel}>Repeat Rate</Text>
        </Card>
      </View>

      {/* Client List */}
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.clientId}
        renderItem={renderClientItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Card style={styles.emptyCard}>
            <Users size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No clients yet</Text>
            <Text style={styles.emptySubtext}>
              Clients will appear here after their first booking
            </Text>
          </Card>
        }
      />
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  clientCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clientMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  lastVisit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  favServiceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.full,
    marginTop: SPACING.sm,
    marginLeft: 56,
    gap: 4,
  },
  favServiceText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.primary,
  },
  // Expanded details
  detailsCard: {
    marginBottom: SPACING.sm,
    marginTop: -SPACING.xs,
    padding: SPACING.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  detailsLoading: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  noBookingsText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
  bookingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  bookingDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bookingRight: {
    alignItems: 'flex-end',
  },
  bookingPrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  blockText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.error,
  },
  unblockText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
