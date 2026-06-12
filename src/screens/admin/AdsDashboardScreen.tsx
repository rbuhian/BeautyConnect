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
import { Megaphone, Settings2 } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../../constants';
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

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `₱${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `₱${(num / 1000).toFixed(1)}K`;
    return `₱${num.toLocaleString()}`;
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
          <Text style={styles.appName}>Maquillage Ph</Text>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
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
        {/* Stats Pills */}
        <View style={styles.statsContainer}>
          <StatPill
            label="Total Users"
            value={String(stats?.total_users ?? 0)}
            colors={[COLORS.gradientStart, '#e091c4']}
          />
          <StatPill
            label="Total Bookings"
            value={String(stats?.total_bookings ?? 0)}
            colors={['#d886c0', COLORS.gradientEnd]}
          />
          <StatPill
            label="Total Earnings"
            value={formatCurrency(stats?.total_earnings ?? 0)}
            colors={[COLORS.gradientEnd, '#e8a898']}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('AdminAnnouncement')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Megaphone size={36} color={COLORS.white} strokeWidth={1.5} />
            </View>
            <Text style={styles.actionLabel}>Announcement</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => (navigation as any).navigate('AdminManageAccounts')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIconContainer}>
              <Settings2 size={36} color={COLORS.white} strokeWidth={1.5} />
            </View>
            <Text style={styles.actionLabel}>Manage{'\n'}Accounts</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: [string, string];
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.statPill}
    >
      <Text style={styles.statPillText}>
        {label} :  {value}
      </Text>
    </LinearGradient>
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
  appName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '300',
    color: COLORS.white,
    fontStyle: 'italic',
    marginBottom: 2,
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
  statsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  statPill: {
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statPillText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: SPACING.lg,
    justifyContent: 'center',
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(201,160,220,0.15)',
    borderWidth: 2,
    borderColor: COLORS.gradientStart,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});
