import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus,
  Pause,
  Play,
  Trash2,
  Edit3,
  Eye,
  MousePointerClick,
} from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS, CURRENCY } from '../../constants';
import { AdCreativeWithStats, AdStatus } from '../../types';
import { getAllAdCreatives, updateAdStatus, deleteAdCreative } from '../../services/admin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminTabs'>;

export default function ManageAdsScreen({ navigation }: Props) {
  const [ads, setAds] = useState<AdCreativeWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AdStatus | 'all'>('all');

  const fetchAds = useCallback(async () => {
    const result = await getAllAdCreatives();
    if (result.data) {
      setAds(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('focus', () => {
      fetchAds();
    });
    return unsubscribe;
  }, [navigation, fetchAds]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAds();
    setRefreshing(false);
  }, [fetchAds]);

  const handleToggleStatus = async (ad: AdCreativeWithStats) => {
    const newStatus: AdStatus = ad.status === 'active' ? 'paused' : 'active';
    const result = await updateAdStatus(ad.id, newStatus);
    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      fetchAds();
    }
  };

  const handleDelete = (ad: AdCreativeWithStats) => {
    Alert.alert(
      'Delete Ad',
      `Are you sure you want to delete "${ad.headline}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAdCreative(ad.id);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              fetchAds();
            }
          },
        },
      ]
    );
  };

  const filteredAds = filter === 'all' ? ads : ads.filter((a) => a.status === filter);

  const getStatusColor = (status: AdStatus) => {
    switch (status) {
      case 'active':
        return COLORS.success;
      case 'paused':
        return COLORS.warning;
      case 'expired':
        return COLORS.error;
    }
  };

  const renderAdItem = ({ item }: { item: AdCreativeWithStats }) => (
    <View style={styles.adCard}>
      <View style={styles.adHeader}>
        <View style={styles.adHeaderLeft}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
          <Text style={styles.adType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.adHeadline} numberOfLines={1}>
        {item.headline}
      </Text>
      <Text style={styles.adAdvertiser}>{item.advertiser_name}</Text>
      <Text style={styles.adSubtext} numberOfLines={2}>
        {item.subtext}
      </Text>

      <View style={styles.adStats}>
        <View style={styles.adStat}>
          <Eye size={14} color={COLORS.textSecondary} />
          <Text style={styles.adStatText}>{item.impressions}</Text>
        </View>
        <View style={styles.adStat}>
          <MousePointerClick size={14} color={COLORS.textSecondary} />
          <Text style={styles.adStatText}>{item.clicks}</Text>
        </View>
        <Text style={styles.adCtr}>{item.ctr.toFixed(1)}% CTR</Text>
      </View>

      <View style={styles.adDates}>
        <Text style={styles.adDateText}>
          {new Date(item.start_date).toLocaleDateString()} — {new Date(item.end_date).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.adActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            (navigation as any).navigate('AdForm', { adId: item.id, ad: item })
          }
        >
          <Edit3 size={16} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleStatus(item)}
        >
          {item.status === 'active' ? (
            <Pause size={16} color={COLORS.warning} />
          ) : (
            <Play size={16} color={COLORS.success} />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
        >
          <Trash2 size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Ads</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => (navigation as any).navigate('AdForm')}
        >
          <Plus size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'paused', 'expired'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}
            >
              {f === 'all' ? `All (${ads.length})` : `${f} (${ads.filter((a) => a.status === f).length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredAds}
        keyExtractor={(item) => item.id}
        renderItem={renderAdItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No ads found</Text>
            <Text style={styles.emptySubtext}>
              Create your first ad to start monetizing
            </Text>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.chipBackground,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  adCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  adHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  adType: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  adHeadline: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  adAdvertiser: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    marginTop: 2,
  },
  adSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  adStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  adStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adStatText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  adCtr: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 'auto',
  },
  adDates: {
    marginTop: SPACING.xs,
  },
  adDateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  adActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
