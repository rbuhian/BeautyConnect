import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  TrendingUp,
  Wallet,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react-native';
import { Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getProfessionalPaymentSummary,
  getMonthlyEarnings,
  getRecentTransactions,
  getPendingDeposits,
  PaymentSummary,
  MonthlyEarning,
  Transaction,
} from '../../services/payments-analytics';
import { Booking } from '../../types';
import { format, parseISO } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function PaymentsScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyEarning[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const fetchData = useCallback(async () => {
    if (!professionalProfile?.id) return;
    try {
      const [summaryRes, monthlyRes, transRes, depositsRes] = await Promise.all([
        getProfessionalPaymentSummary(professionalProfile.id),
        getMonthlyEarnings(professionalProfile.id),
        getRecentTransactions(professionalProfile.id, 20),
        getPendingDeposits(professionalProfile.id),
      ]);
      if (summaryRes.data) setSummary(summaryRes.data);
      if (monthlyRes.data) setMonthlyData(monthlyRes.data);
      if (transRes.data) setTransactions(transRes.data);
      if (depositsRes.data) setPendingDeposits(depositsRes.data);
    } catch (err) {
      console.error('Error fetching payments data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professionalProfile?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);
  const chartBarMaxWidth = SCREEN_WIDTH - SPACING.lg * 2 - 80; // space for labels
  const displayTransactions = showAllTransactions ? transactions : transactions.slice(0, 5);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments & Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryRow}
        >
          <Card style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#C8E6C9' }]}>
              <TrendingUp size={20} color={COLORS.success} />
            </View>
            <Text style={styles.summaryValue}>
              ₱{(summary?.totalEarnings || 0).toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
          </Card>

<Card style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#E1BEE7' }]}>
              <Sparkles size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.summaryValue}>
              ₱{(summary?.featuredSpend || 0).toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Featured Spend</Text>
          </Card>
        </ScrollView>

        {/* Monthly Earnings Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Earnings</Text>
          <Card style={styles.chartCard}>
            {monthlyData.every((m) => m.total === 0) ? (
              <View style={styles.emptyChart}>
                <TrendingUp size={32} color={COLORS.textLight} />
                <Text style={styles.emptyChartText}>No earnings data yet</Text>
              </View>
            ) : (
              monthlyData.map((item, index) => (
                <View key={index} style={styles.chartRow}>
                  <Text style={styles.chartLabel}>{item.label}</Text>
                  <View style={styles.chartBarContainer}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          width: Math.max(
                            (item.total / maxMonthly) * chartBarMaxWidth,
                            item.total > 0 ? 4 : 0
                          ),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartAmount}>
                    {item.total > 0 ? `₱${item.total.toLocaleString()}` : ''}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>


        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {transactions.length > 5 && (
              <TouchableOpacity onPress={() => setShowAllTransactions(!showAllTransactions)}>
                <Text style={styles.seeAllText}>
                  {showAllTransactions ? 'Show less' : 'See all'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {transactions.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Wallet size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Completed bookings and featured purchases will appear here
              </Text>
            </Card>
          ) : (
            displayTransactions.map((tx) => (
              <Card key={tx.id} style={styles.transactionCard}>
                <View style={styles.transactionRow}>
                  <View
                    style={[
                      styles.transactionIcon,
                      {
                        backgroundColor:
                          tx.type === 'booking_income' ? '#E8F5E9' : '#F3E5F5',
                      },
                    ]}
                  >
                    {tx.type === 'booking_income' ? (
                      <ArrowDownLeft size={18} color={COLORS.success} />
                    ) : (
                      <ArrowUpRight size={18} color={COLORS.primary} />
                    )}
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDesc}>{tx.description}</Text>
                    <Text style={styles.transactionMeta}>
                      {tx.type === 'booking_income'
                        ? tx.clientName || 'Client'
                        : 'Featured Listing'}
                      {'  '}
                      {format(parseISO(tx.date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.transactionAmount,
                      {
                        color:
                          tx.type === 'booking_income'
                            ? COLORS.success
                            : COLORS.primary,
                      },
                    ]}
                  >
                    {tx.type === 'booking_income' ? '+' : '-'}₱
                    {tx.amount.toLocaleString()}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryRow: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    width: 150,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  // Chart
  chartCard: {
    padding: SPACING.md,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  chartLabel: {
    width: 32,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: RADIUS.sm,
  },
  chartAmount: {
    width: 70,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyChartText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  // Pending deposits
  countBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    minWidth: 24,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  countBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  depositCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  depositIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  depositInfo: {
    flex: 1,
  },
  depositClient: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  depositService: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  depositRight: {
    alignItems: 'flex-end',
  },
  depositAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.warning,
  },
  depositDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Transactions
  transactionCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  transactionMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
  },
  // Empty state
  emptyCard: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
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
