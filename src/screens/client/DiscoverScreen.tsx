import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, X } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getDiscoverProfessionals,
  searchProfessionals,
  ProfessionalWithDetails,
} from '../../services/client';
import { getBlockedUserIds } from '../../services/reports';
import StarRating from '../../components/StarRating';
import { Loading } from '../../components';

const AVATAR_COLORS = ['#4DD9C0', '#E85D8A', '#F5C842', '#6B8EF5', '#E07B3A'];

function AvatarCircle({
  uri,
  name,
  index,
  size = 64,
}: {
  uri?: string | null;
  name?: string | null;
  index: number;
  size?: number;
}) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: size * 0.3 }}>{initials}</Text>
      )}
    </View>
  );
}

export default function DiscoverScreen({ navigation }: any) {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<ProfessionalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProfessionals = useCallback(async (query = '') => {
    try {
      let result;
      if (query.trim()) {
        result = await searchProfessionals(query.trim());
      } else {
        const { data: blockedIds } = await getBlockedUserIds();
        result = await getDiscoverProfessionals({}, undefined, blockedIds ?? []);
      }
      setProfessionals(result.data || []);
    } catch (err) {
      console.error('Error fetching professionals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfessionals();
  }, [fetchProfessionals]);

  const handleSearchChange = (text: string) => {
    setSearchText(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setLoading(true);
      fetchProfessionals(text);
    }, 400);
  };

  const handleClear = () => {
    setSearchText('');
    setLoading(true);
    fetchProfessionals('');
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfessionals(searchText);
  };

  const renderItem = ({ item, index }: { item: ProfessionalWithDetails; index: number }) => (
    <TouchableOpacity
      style={styles.providerRow}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ProfessionalProfile', { professionalId: item.id, initialData: item })}
    >
      <AvatarCircle uri={item.user?.avatar} name={item.user?.name} index={index} size={64} />
      <View style={styles.providerInfo}>
        <Text style={styles.providerName}>{item.user?.name || 'Artist'}</Text>
        <StarRating
          rating={item.avg_rating ?? 0}
          size={18}
          activeColor={COLORS.warning}
          inactiveColor="rgba(255,255,255,0.3)"
          spacing={2}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.searchBar}
          >
            <MapPin size={18} color={COLORS.white} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by location or name..."
              placeholderTextColor="rgba(255,255,255,0.65)"
              value={searchText}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (searchTimeout.current) clearTimeout(searchTimeout.current);
                setLoading(true);
                fetchProfessionals(searchText);
              }}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <X size={16} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Provider List */}
        {loading ? (
          <Loading fullScreen={false} />
        ) : professionals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchText ? `No results for "${searchText}"` : 'No service providers available.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={professionals}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  searchWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    padding: 0,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  providerInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  providerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
});
