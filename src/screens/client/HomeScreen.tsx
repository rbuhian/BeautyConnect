import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { getDiscoverProfessionals, ProfessionalWithDetails } from '../../services/client';
import StarRating from '../../components/StarRating';

// Avatar background colors cycling through options
const AVATAR_COLORS = ['#4DD9C0', '#E85D8A', '#F5C842', '#6B8EF5', '#E07B3A'];

function AvatarCircle({
  uri,
  name,
  index,
  size = 80,
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
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: size * 0.3 }]}>{initials}</Text>
      )}
    </View>
  );
}

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const [featured, setFeatured] = useState<ProfessionalWithDetails[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.name?.split(' ')[0] || 'there';

  const fetchFeatured = useCallback(async () => {
    const result = await getDiscoverProfessionals({}, undefined, []);
    const top = (result.data || [])
      .sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
      .slice(0, 6);
    setFeatured(top);
  }, []);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeatured();
    setRefreshing(false);
  };

  const renderArtistCard = ({ item, index }: { item: ProfessionalWithDetails; index: number }) => (
    <TouchableOpacity
      style={styles.artistCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ProfessionalProfile', { professionalId: item.id, initialData: item })}
    >
      <AvatarCircle uri={item.user?.avatar} name={item.user?.name} index={index} size={72} />
      <Text style={styles.artistName} numberOfLines={1}>
        {item.user?.name ? item.user.name.split(' ')[0] + (item.user.name.split(' ')[1] ? ' ' + item.user.name.split(' ')[1][0] + '.' : '') : 'Artist'}
      </Text>
      <StarRating
        rating={item.avg_rating ?? 0}
        size={14}
        activeColor={COLORS.warning}
        inactiveColor="rgba(255,255,255,0.3)"
        spacing={2}
      />
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.white} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>Ready for your{'\n'}glam session?</Text>
            <TouchableOpacity
              style={styles.avatarButton}
              onPress={() => navigation.navigate('Profile')}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.headerAvatar} />
              ) : (
                <View style={styles.headerAvatarPlaceholder}>
                  <User size={22} color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Book a Service Button */}
          <View style={styles.bookButtonContainer}>
            <TouchableOpacity
              style={styles.bookButton}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Book')}
            >
              <Text style={styles.bookButtonText}>Book a Service</Text>
            </TouchableOpacity>
          </View>

          {/* Featured Artists */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured Artists</Text>
            {featured.length > 0 ? (
              <FlatList
                data={featured}
                renderItem={renderArtistCard}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.artistList}
              />
            ) : (
              <Text style={styles.emptyText}>No artists available yet.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 32,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.md,
  },
  bellButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  avatarButton: {
    marginLeft: SPACING.xs,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  bookButtonContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  bookButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  bookButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  section: {
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  artistList: {
    gap: SPACING.md,
    paddingRight: SPACING.lg,
  },
  artistCard: {
    alignItems: 'center',
    width: 88,
    gap: SPACING.xs,
  },
  avatarCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    color: COLORS.white,
    fontWeight: '700',
  },
  artistName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FONT_SIZES.sm,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});
