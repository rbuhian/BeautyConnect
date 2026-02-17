import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
} from 'lucide-react-native';
import { Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getClientPaymentSummary,
  getClientPaymentHistory,
  ClientPaymentSummary,
  ClientPaymentItem,
} from '../../services/payments-analytics';
import { format, parseISO } from 'date-fns';

export default function PaymentsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ClientPaymentSummary | null>(null);
  const [history, setHistory] = useState<ClientPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [summaryRes, historyRes] = await Promise.all([
        getClientPaymentSummary(user.id),
        getClientPaymentHistory(user.id),
      ]);
      if (summaryRes.data) setSummary(summaryRes.data);
      if (historyRes.data) setHistory(historyRes.data);
    } catch (err) {
      console.error('Error fetching payment data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusBadge = (item: ClientPaymentItem) => {
    if (item.status === 'cancelled') {
      return { label: 'Cancelled', color: COLORS.textSecondary, bg: '#F5F5F5' };
    }
    if (item.depositPaid) {
      return { label: 'Paid', color: COLORS.success, bg: '#E8F5E9' };
    }
    return { label: 'Pending', color: COLORS.warning, bg: '#FFF8E1' };
  };

  if (loading) {
    return <Loading fullScreen message="Loading payments..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Payments</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#BBDEFB' }]}>
              <TrendingUp size={20} color="#1976D2" />
            </View>
            <Text style={styles.summaryValue}>
              ₱{(summary?.totalSpent || 0).toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </Card>

          <Card style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
            <View style={[styles.summaryIcon, { backgroundColor: '#C8E6C9' }]}>
              <Wallet size={20} color={COLORS.success} />
            </View>
            <Text style={styles.summaryValue}>
              ₱{(summary?.depositsTotal || 0).toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>
              Deposits Paid ({summary?.depositsCount || 0})
            </Text>
          </Card>
        </View>

        {/* Payment History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>

          {history.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Wallet size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No payments yet</Text>
              <Text style={styles.emptySubtext}>
                Your booking payments will appear here
              </Text>
            </Card>
          ) : (
            history.map((item) => {
              const badge = getStatusBadge(item);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
                >
                  <Card style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyService}>{item.serviceName}</Text>
                        <Text style={styles.historyPro}>{item.professionalName}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        {item.status === 'cancelled' ? (
                          <XCircle size={12} color={badge.color} />
                        ) : item.depositPaid ? (
                          <CheckCircle size={12} color={badge.color} />
                        ) : (
                          <Clock size={12} color={badge.color} />
                        )}
                        <Text style={[styles.statusText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.historyFooter}>
                      <Text style={styles.historyDate}>
                        {format(parseISO(item.date), 'MMM d, yyyy')}
                      </Text>
                      <View style={styles.historyAmounts}>
                        <Text style={styles.historyTotal}>
                          ₱{item.totalPrice.toLocaleString()}
                        </Text>
                        {item.depositAmount > 0 && (
                          <Text style={styles.historyDeposit}>
                            Deposit: ₱{item.depositAmount.toLocaleString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
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
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    flex: 1,
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
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  // History cards
  historyCard: {
    marginBottom: SPACING.sm,
    padding: SPACING.md,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  historyInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  historyService: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyPro: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  historyDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  historyAmounts: {
    alignItems: 'flex-end',
  },
  historyTotal: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  historyDeposit: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
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
