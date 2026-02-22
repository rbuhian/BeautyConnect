import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Eye,
  MousePointerClick,
  TrendingUp,
  Star,
  Package,
  DollarSign,
  Megaphone,
  Tag,
  Users,
  UserCheck,
} from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS, CURRENCY } from '../../constants';
import { AdminDashboardStats } from '../../types';
import { getAdminDashboardStats } from '../../services/admin';
import { useAuth } from '../../hooks/useAuth';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminTabs'>;

export default function AdsDashboardScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    const result = await getAdminDashboardStats();
    if (result.data) {
      setStats(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerTitle}>Ad Management</Text>
          <Text style={styles.headerSubtitle}>
            Welcome, {user?.name || 'Admin'}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview Stats */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Megaphone size={20} color={COLORS.primary} />}
            label="Total Ads"
            value={formatNumber(stats?.total_ads || 0)}
            subValue={`${stats?.active_ads || 0} active`}
          />
          <StatCard
            icon={<Eye size={20} color="#4CAF50" />}
            label="Impressions"
            value={formatNumber(stats?.total_impressions || 0)}
          />
          <StatCard
            icon={<MousePointerClick size={20} color="#2196F3" />}
            label="Clicks"
            value={formatNumber(stats?.total_clicks || 0)}
          />
          <StatCard
            icon={<TrendingUp size={20} color="#FF9800" />}
            label="CTR"
            value={`${stats?.overall_ctr || 0}%`}
          />
        </View>

        {/* Revenue Stats */}
        <Text style={styles.sectionTitle}>Revenue</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<DollarSign size={20} color="#4CAF50" />}
            label="Featured Revenue"
            value={`${CURRENCY.symbol}${formatNumber(stats?.total_featured_revenue || 0)}`}
            wide
          />
          <StatCard
            icon={<Star size={20} color="#FFB800" />}
            label="Active Boosts"
            value={String(stats?.active_featured_listings || 0)}
            wide
          />
        </View>

        {/* Products Stats */}
        <Text style={styles.sectionTitle}>Affiliate Products</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Package size={20} color={COLORS.primary} />}
            label="Total Products"
            value={String(stats?.total_affiliate_products || 0)}
            subValue={`${stats?.active_affiliate_products || 0} active`}
            wide
          />
        </View>

        {/* Users Stats */}
        <Text style={styles.sectionTitle}>Users</Text>
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Users size={20} color={COLORS.primary} />}
            label="Professionals"
            value={String(stats?.total_professionals || 0)}
            subValue={`${stats?.active_professionals || 0} live`}
          />
          <StatCard
            icon={<UserCheck size={20} color="#4CAF50" />}
            label="Clients"
            value={String(stats?.total_clients || 0)}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('AdForm')}
          >
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Megaphone size={24} color={COLORS.white} />
              <Text style={styles.actionText}>Create New Ad</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('AffiliateForm')}
          >
            <View style={styles.actionOutline}>
              <Package size={24} color={COLORS.primary} />
              <Text style={styles.actionOutlineText}>Add Affiliate Product</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('AdminManagePromotions')}
          >
            <View style={styles.actionOutline}>
              <Tag size={24} color={COLORS.primary} />
              <Text style={styles.actionOutlineText}>Manage Platform Promotions</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  label,
  value,
  subValue,
  wide,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.statCard, wide && styles.statCardWide]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    width: '48%',
    flexGrow: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardWide: {
    width: '100%',
  },
  statIcon: {
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statSubValue: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    marginTop: 2,
  },
  actionsContainer: {
    gap: SPACING.sm,
  },
  actionCard: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  actionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  actionOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.md,
  },
  actionOutlineText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
