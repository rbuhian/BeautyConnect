import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Wallet,
  TrendingUp,
  DollarSign,
  Sparkles,
  Users,
  ArrowRight,
  User,
  CheckCircle,
} from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS, CURRENCY } from '../../constants';
import {
  getAdminPaymentStats,
  getProfessionalPayables,
  getRecentDepositTransactions,
  AdminPaymentStats,
  ProfessionalPayable,
  DepositTransaction,
} from '../../services/admin';
import { format, parseISO } from 'date-fns';

type PeriodFilter = 'all' | 'this_month' | 'last_month';

export default function AdminPaymentsScreen() {
  const [stats, setStats] = useState<AdminPaymentStats | null>(null);
  const [payables, setPayables] = useState<ProfessionalPayable[]>([]);
  const [transactions, setTransactions] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('all');

  const fetchData = useCallback(async () => {
    const periodParam = period === 'all' ? undefined : period;
    const [statsRes, payablesRes, txRes] = await Promise.all([
      getAdminPaymentStats(periodParam),
      getProfessionalPayables(),
      getRecentDepositTransactions(20),
    ]);
    if (statsRes.data) setStats(statsRes.data);
    if (payablesRes.data) setPayables(payablesRes.data);
    if (txRes.data) setTransactions(txRes.data);
    setLoading(false);
    setRefreshing(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const formatAmount = (num: number) => `${CURRENCY.symbol}${num.toLocaleString()}`;

  const filters: { key: PeriodFilter; label: string }[] = [
    { key: 'all', label: 'All Time' },
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Filters */}
        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, period === f.key && styles.filterChipActive]}
              onPress={() => setPeriod(f.key)}
            >
              <Text
                style={[styles.filterText, period === f.key && styles.filterTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Wallet size={20} color="#1976D2" />
            </View>
            <Text style={styles.statValue}>
              {formatAmount(stats?.totalDepositsCollected || 0)}
            </Text>
            <Text style={styles.statLabel}>Deposits Collected</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <TrendingUp size={20} color={COLORS.success} />
            </View>
            <Text style={styles.statValue}>
              {formatAmount(stats?.totalBookingValue || 0)}
            </Text>
            <Text style={styles.statLabel}>Booking Value</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Sparkles size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statValue}>
              {formatAmount(stats?.featuredRevenue || 0)}
            </Text>
            <Text style={styles.statLabel}>Featured Revenue</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <DollarSign size={20} color="#F57C00" />
            </View>
            <Text style={styles.statValue}>
              {formatAmount(stats?.totalPayable || 0)}
            </Text>
            <Text style={styles.statLabel}>Payable to Pros</Text>
          </View>
        </View>

        {/* Professional Payables */}
        <Text style={styles.sectionTitle}>Professional Payables</Text>
        {payables.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={32} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No payable data yet</Text>
          </View>
        ) : (
          payables.map((pro) => (
            <View key={pro.professionalId} style={styles.proCard}>
              <View style={styles.proHeader}>
                {pro.avatar ? (
                  <Image source={{ uri: pro.avatar }} style={styles.proAvatar} />
                ) : (
                  <View style={styles.proAvatarPlaceholder}>
                    <User size={16} color={COLORS.textSecondary} />
                  </View>
                )}
                <View style={styles.proInfo}>
                  <Text style={styles.proName}>{pro.name}</Text>
                  <Text style={styles.proSub}>
                    {pro.completedCount} completed booking{pro.completedCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.proAmounts}>
                  <Text style={styles.proEarned}>{formatAmount(pro.totalEarned)}</Text>
                  <Text style={styles.proDeposit}>
                    Deposits: {formatAmount(pro.depositsCollected)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Recent Deposit Transactions */}
        <Text style={styles.sectionTitle}>Recent Deposits</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Wallet size={32} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No deposit transactions yet</Text>
          </View>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txRow}>
                <View style={styles.txIconWrap}>
                  <CheckCircle size={16} color={COLORS.success} />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txService}>{tx.serviceName}</Text>
                  <Text style={styles.txMeta}>
                    {tx.clientName} <ArrowRight size={10} color={COLORS.textSecondary} />{' '}
                    {tx.professionalName}
                  </Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={styles.txAmount}>{formatAmount(tx.depositAmount)}</Text>
                  <Text style={styles.txDate}>
                    {format(parseISO(tx.date), 'MMM d, yyyy')}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
    paddingTop: 0,
  },
  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.chipBackground,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
  statIcon: {
    marginBottom: SPACING.sm,
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
  },
  // Section
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  // Professional cards
  proCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  proHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  proAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  proInfo: {
    flex: 1,
  },
  proName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  proSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  proAmounts: {
    alignItems: 'flex-end',
  },
  proEarned: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.success,
  },
  proDeposit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Transaction cards
  txCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  txInfo: {
    flex: 1,
  },
  txService: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  txMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.success,
  },
  txDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Empty
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
});
