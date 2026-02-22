import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search, User, ChevronRight, Star } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { AdminStackParamList } from '../../navigation/types';
import { ProfessionalListItem, ClientListItem, LocationType } from '../../types';
import { getAllProfessionals, getAllClients } from '../../services/admin';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminTabs'>;

const CATEGORY_LABELS: Record<string, string> = {
  makeup: 'Makeup',
  hair: 'Hair',
  nails: 'Nails',
  lash: 'Lash',
  brow: 'Brow',
};

const LOCATION_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'home_service', label: 'Home Service' },
  { value: 'salon', label: 'Salon' },
  { value: 'both', label: 'Both' },
] as const;

export default function AdminUsersScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<'professionals' | 'clients'>('professionals');
  const [professionals, setProfessionals] = useState<ProfessionalListItem[]>([]);
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [proSearch, setProSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState<LocationType | 'all'>('all');
  const [liveOnly, setLiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    const [proRes, clientRes] = await Promise.all([
      getAllProfessionals(),
      getAllClients(),
    ]);
    if (proRes.data) setProfessionals(proRes.data);
    if (clientRes.data) setClients(clientRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const filteredProfessionals = useMemo(() => {
    let list = professionals;
    if (locationFilter !== 'all') {
      list = list.filter((p) => p.location_type === locationFilter);
    }
    if (liveOnly) {
      list = list.filter((p) => p.is_live);
    }
    if (proSearch.trim()) {
      const q = proSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.business_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [professionals, locationFilter, liveOnly, proSearch]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) => c.name?.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [clients, clientSearch]);

  const renderProfessionalItem = ({ item }: { item: ProfessionalListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => (navigation as any).navigate('AdminProfessionalDetail', { professionalId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <User size={20} color={COLORS.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name || 'Unnamed'}
          </Text>
          <View style={[styles.liveBadge, item.is_live ? styles.liveBadgeActive : styles.liveBadgeInactive]}>
            <Text style={[styles.liveBadgeText, item.is_live ? styles.liveBadgeTextActive : styles.liveBadgeTextInactive]}>
              {item.is_live ? 'Live' : 'Offline'}
            </Text>
          </View>
        </View>

        <Text style={styles.cardPhone}>{item.phone}</Text>

        {item.business_name && (
          <Text style={styles.cardBusiness} numberOfLines={1}>
            {item.business_name}
          </Text>
        )}

        <View style={styles.cardBottomRow}>
          <View style={styles.categoryChips}>
            {item.categories.slice(0, 3).map((cat) => (
              <View key={cat} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{CATEGORY_LABELS[cat] || cat}</Text>
              </View>
            ))}
          </View>
          {item.total_reviews > 0 && (
            <View style={styles.ratingRow}>
              <Star size={11} color="#FFB800" fill="#FFB800" />
              <Text style={styles.ratingText}>
                {item.avg_rating.toFixed(1)} ({item.total_reviews})
              </Text>
            </View>
          )}
        </View>
      </View>

      <ChevronRight size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  const renderClientItem = ({ item }: { item: ClientListItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => (navigation as any).navigate('AdminClientDetail', { clientId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardLeft}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <User size={20} color={COLORS.textSecondary} />
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name || 'Unnamed'}
          </Text>
          {item.is_suspended && (
            <View style={styles.suspendedBadge}>
              <Text style={styles.suspendedBadgeText}>Suspended</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardPhone}>{item.phone}</Text>
        <Text style={styles.bookingCount}>
          {item.booking_count} {item.booking_count === 1 ? 'booking' : 'bookings'}
        </Text>
      </View>

      <ChevronRight size={16} color={COLORS.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Users</Text>
      </View>

      {/* Segment Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'professionals' && styles.segmentTabActive]}
          onPress={() => setActiveTab('professionals')}
        >
          <Text style={[styles.segmentTabText, activeTab === 'professionals' && styles.segmentTabTextActive]}>
            Professionals ({professionals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'clients' && styles.segmentTabActive]}
          onPress={() => setActiveTab('clients')}
        >
          <Text style={[styles.segmentTabText, activeTab === 'clients' && styles.segmentTabTextActive]}>
            Clients ({clients.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'professionals' ? (
        <>
          {/* Search */}
          <View style={styles.searchContainer}>
            <Search size={16} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={COLORS.textSecondary}
              value={proSearch}
              onChangeText={setProSearch}
            />
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            {LOCATION_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, locationFilter === f.value && styles.filterChipActive]}
                onPress={() => setLocationFilter(f.value as LocationType | 'all')}
              >
                <Text style={[styles.filterChipText, locationFilter === f.value && styles.filterChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.filterChip, liveOnly && styles.filterChipActive]}
              onPress={() => setLiveOnly(!liveOnly)}
            >
              <Text style={[styles.filterChipText, liveOnly && styles.filterChipTextActive]}>
                Live Only
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <FlatList
            data={filteredProfessionals}
            keyExtractor={(item) => item.id}
            renderItem={renderProfessionalItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No Professionals Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {proSearch || locationFilter !== 'all' || liveOnly
                      ? 'Try adjusting your filters.'
                      : 'Professionals who register will appear here.'}
                  </Text>
                </View>
              ) : null
            }
          />
        </>
      ) : (
        <>
          {/* Client Search */}
          <View style={styles.searchContainer}>
            <Search size={16} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={COLORS.textSecondary}
              value={clientSearch}
              onChangeText={setClientSearch}
            />
          </View>

          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item.id}
            renderItem={renderClientItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No Clients Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {clientSearch
                      ? 'No clients match your search.'
                      : 'Clients who register will appear here.'}
                  </Text>
                </View>
              ) : null
            }
          />
        </>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: SPACING.sm,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    backgroundColor: COLORS.chipBackground,
  },
  segmentTabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  segmentTabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTabTextActive: {
    color: COLORS.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  filtersScroll: {
    flexGrow: 0,
    marginBottom: SPACING.xs,
  },
  filtersContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: {
    marginRight: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  cardName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  cardPhone: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  cardBusiness: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryChips: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  categoryChip: {
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  categoryChipText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  liveBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
  },
  liveBadgeActive: {
    backgroundColor: '#E8F5E9',
  },
  liveBadgeInactive: {
    backgroundColor: COLORS.chipBackground,
  },
  liveBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  liveBadgeTextActive: {
    color: '#2E7D32',
  },
  liveBadgeTextInactive: {
    color: COLORS.textSecondary,
  },
  suspendedBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
  },
  suspendedBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#C62828',
  },
  bookingCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
});
