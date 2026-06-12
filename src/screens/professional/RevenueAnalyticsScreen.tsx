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
  BarChart3,
  Clock,
  Users,
  DollarSign,
  Briefcase,
} from 'lucide-react-native';
import { Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getRevenueByCategory,
  getRevenueByService,
  getPeakHoursAnalysis,
  getRetentionMetrics,
  CategoryRevenue,
  ServiceRevenue,
  HourlyData,
  RetentionData,
} from '../../services/payments-analytics';

const SCREEN_WIDTH = Dimensions.get('window').width;

type TimePeriod = 'month' | '3months' | 'all';

const CATEGORY_COLORS: Record<string, string> = {
  makeup: '#E91E63',
  hair: '#9C27B0',
  nails: '#FF5722',
  lash: '#2196F3',
  brow: '#4CAF50',
  other: '#607D8B',
};

const CATEGORY_LABELS: Record<string, string> = {
  makeup: 'Makeup',
  hair: 'Hair',
  nails: 'Nails',
  lash: 'Lash',
  brow: 'Brow',
  other: 'Other',
};

function getSinceDate(period: TimePeriod): string | undefined {
  if (period === 'all') return undefined;
  const d = new Date();
  if (period === 'month') {
    d.setMonth(d.getMonth() - 1);
  } else {
    d.setMonth(d.getMonth() - 3);
  }
  return d.toISOString().split('T')[0];
}

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

export default function RevenueAnalyticsScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [categoryData, setCategoryData] = useState<CategoryRevenue[]>([]);
  const [serviceData, setServiceData] = useState<ServiceRevenue[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [retention, setRetention] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!professionalProfile?.id) return;
    const sinceDate = getSinceDate(period);

    try {
      const [catRes, svcRes, hourRes, retRes] = await Promise.all([
        getRevenueByCategory(professionalProfile.id, sinceDate),
        getRevenueByService(professionalProfile.id, sinceDate),
        getPeakHoursAnalysis(professionalProfile.id, sinceDate),
        getRetentionMetrics(professionalProfile.id, sinceDate),
      ]);

      if (catRes.data) setCategoryData(catRes.data);
      if (svcRes.data) setServiceData(svcRes.data);
      if (hourRes.data) setHourlyData(hourRes.data);
      if (retRes.data) setRetention(retRes.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professionalProfile?.id, period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return <Loading fullScreen message="Loading analytics..." />;
  }

  // Summary calculations
  const totalRevenue = categoryData.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalBookings = categoryData.reduce((sum, c) => sum + c.bookingCount, 0);
  const avgPerBooking = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

  // Chart calculations
  const maxCategoryRevenue = Math.max(...categoryData.map((c) => c.totalRevenue), 1);
  const maxServiceRevenue = Math.max(...serviceData.map((s) => s.totalRevenue), 1);
  const maxHourlyCount = Math.max(...hourlyData.map((h) => h.bookingCount), 1);
  const chartBarMaxWidth = SCREEN_WIDTH - SPACING.lg * 2 - 120;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Revenue Analytics</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Time Period Tabs */}
        <View style={styles.periodRow}>
          {([
            { key: 'month' as TimePeriod, label: 'This Month' },
            { key: '3months' as TimePeriod, label: 'Last 3 Months' },
            { key: 'all' as TimePeriod, label: 'All Time' },
          ]).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.periodTab, period === tab.key && styles.periodTabActive]}
              onPress={() => setPeriod(tab.key)}
            >
              <Text style={[styles.periodText, period === tab.key && styles.periodTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <Card style={[styles.summaryCard, { backgroundColor: '#E8F5E9' }]}>
            <DollarSign size={20} color={COLORS.success} />
            <Text style={styles.summaryValue}>₱{totalRevenue.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: '#E3F2FD' }]}>
            <BarChart3 size={20} color="#1976D2" />
            <Text style={styles.summaryValue}>₱{avgPerBooking.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Avg / Booking</Text>
          </Card>
          <Card style={[styles.summaryCard, { backgroundColor: '#F3E5F5' }]}>
            <Briefcase size={20} color={COLORS.primary} />
            <Text style={styles.summaryValue}>{totalBookings}</Text>
            <Text style={styles.summaryLabel}>Bookings</Text>
          </Card>
        </View>

        {/* Revenue by Category */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue by Category</Text>
          <Card style={styles.chartCard}>
            {categoryData.length === 0 ? (
              <View style={styles.emptyChart}>
                <TrendingUp size={32} color={COLORS.textLight} />
                <Text style={styles.emptyChartText}>No category data yet</Text>
              </View>
            ) : (
              categoryData.map((item, index) => (
                <View key={index} style={styles.chartRow}>
                  <Text style={[styles.chartLabel, { width: 55 }]}>
                    {CATEGORY_LABELS[item.category] || item.category}
                  </Text>
                  <View style={styles.chartBarContainer}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          width: Math.max(
                            (item.totalRevenue / maxCategoryRevenue) * chartBarMaxWidth,
                            item.totalRevenue > 0 ? 4 : 0
                          ),
                          backgroundColor: CATEGORY_COLORS[item.category] || '#607D8B',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartAmount}>
                    ₱{item.totalRevenue.toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </Card>
        </View>

        {/* Top Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Services</Text>
          <Card style={styles.chartCard}>
            {serviceData.length === 0 ? (
              <View style={styles.emptyChart}>
                <Briefcase size={32} color={COLORS.textLight} />
                <Text style={styles.emptyChartText}>No service data yet</Text>
              </View>
            ) : (
              serviceData.slice(0, 8).map((item, index) => (
                <View key={index} style={styles.serviceRow}>
                  <View style={styles.serviceRank}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName} numberOfLines={1}>{item.serviceName}</Text>
                    <Text style={styles.serviceMeta}>
                      {item.bookingCount} booking{item.bookingCount !== 1 ? 's' : ''} | Avg ₱{item.avgPrice.toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.serviceBarWrapper}>
                    <View
                      style={[
                        styles.serviceBar,
                        { width: `${Math.max((item.totalRevenue / maxServiceRevenue) * 100, 4)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.serviceRevenue}>₱{item.totalRevenue.toLocaleString()}</Text>
                </View>
              ))
            )}
          </Card>
        </View>

        {/* Peak Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Peak Hours</Text>
          <Card style={styles.chartCard}>
            {hourlyData.every((h) => h.bookingCount === 0) ? (
              <View style={styles.emptyChart}>
                <Clock size={32} color={COLORS.textLight} />
                <Text style={styles.emptyChartText}>No booking data yet</Text>
              </View>
            ) : (
              <View style={styles.peakHoursGrid}>
                {hourlyData.map((item, index) => {
                  const intensity = maxHourlyCount > 0 ? item.bookingCount / maxHourlyCount : 0;
                  return (
                    <View key={index} style={styles.hourColumn}>
                      <View style={styles.hourBarWrapper}>
                        <View
                          style={[
                            styles.hourBar,
                            {
                              height: `${Math.max(intensity * 100, item.bookingCount > 0 ? 5 : 0)}%`,
                              backgroundColor: intensity > 0.7
                                ? COLORS.success
                                : intensity > 0.3
                                ? COLORS.warning
                                : COLORS.primary,
                            },
                          ]}
                        />
                      </View>
                      {item.bookingCount > 0 && (
                        <Text style={styles.hourCount}>{item.bookingCount}</Text>
                      )}
                      <Text style={styles.hourLabel}>{formatHour(item.hour)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </View>

        {/* Client Retention */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client Retention</Text>
          <Card style={styles.retentionCard}>
            {!retention || retention.totalClients === 0 ? (
              <View style={styles.emptyChart}>
                <Users size={32} color={COLORS.textLight} />
                <Text style={styles.emptyChartText}>No client data yet</Text>
              </View>
            ) : (
              <View style={styles.retentionGrid}>
                <View style={styles.retentionMain}>
                  <Text style={styles.retentionPercent}>{retention.retentionRate}%</Text>
                  <Text style={styles.retentionLabel}>Retention Rate</Text>
                </View>
                <View style={styles.retentionStats}>
                  <View style={styles.retentionStatItem}>
                    <Text style={styles.retentionStatValue}>{retention.totalClients}</Text>
                    <Text style={styles.retentionStatLabel}>Total Clients</Text>
                  </View>
                  <View style={styles.retentionStatItem}>
                    <Text style={[styles.retentionStatValue, { color: COLORS.success }]}>
                      {retention.repeatClients}
                    </Text>
                    <Text style={styles.retentionStatLabel}>Repeat</Text>
                  </View>
                  <View style={styles.retentionStatItem}>
                    <Text style={styles.retentionStatValue}>
                      {retention.avgBookingsPerClient}x
                    </Text>
                    <Text style={styles.retentionStatLabel}>Avg Visits</Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
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
  // Period tabs
  periodRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: 3,
  },
  periodTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  periodTabActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  periodTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
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
  // Sections
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
  // Chart shared
  chartCard: {
    padding: SPACING.md,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  chartLabel: {
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
    borderRadius: RADIUS.sm,
  },
  chartAmount: {
    width: 75,
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
  // Top Services
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  serviceRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  rankText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  serviceInfo: {
    width: 100,
  },
  serviceName: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceMeta: {
    fontSize: 9,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  serviceBarWrapper: {
    flex: 1,
    height: 16,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.sm,
    marginHorizontal: SPACING.sm,
    overflow: 'hidden',
  },
  serviceBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  serviceRevenue: {
    width: 65,
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  // Peak Hours
  peakHoursGrid: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: SPACING.md,
  },
  hourColumn: {
    flex: 1,
    alignItems: 'center',
  },
  hourBarWrapper: {
    width: 14,
    height: 100,
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  hourBar: {
    width: '100%',
    borderRadius: 3,
    minHeight: 0,
  },
  hourCount: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 1,
  },
  hourLabel: {
    fontSize: 7,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Retention
  retentionCard: {
    padding: SPACING.lg,
  },
  retentionGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retentionMain: {
    flex: 1,
    alignItems: 'center',
    paddingRight: SPACING.lg,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  retentionPercent: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.success,
  },
  retentionLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  retentionStats: {
    flex: 1,
    paddingLeft: SPACING.lg,
    gap: SPACING.md,
  },
  retentionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  retentionStatValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  retentionStatLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
