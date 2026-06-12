import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Tag, Plus, Trash2, Edit2, Clock, Users, Globe } from 'lucide-react-native';
import { Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import {
  getPlatformPromotions,
  deletePromotion,
  togglePromotionActive,
} from '../../services/promotions';
import { Promotion } from '../../types';

export default function AdminManagePromotionsScreen({ navigation }: any) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPromotions = async () => {
    const result = await getPlatformPromotions();
    if (result.data) setPromotions(result.data);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchPromotions();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPromotions();
  };

  const handleToggleActive = async (promotion: Promotion) => {
    const result = await togglePromotionActive(promotion.id, !promotion.is_active);
    if (result.error) {
      Alert.alert('Error', result.error.message);
    } else {
      setPromotions(prev =>
        prev.map(p => (p.id === promotion.id ? { ...p, is_active: !promotion.is_active } : p))
      );
    }
  };

  const handleDelete = (promotion: Promotion) => {
    Alert.alert(
      'Delete Platform Promotion',
      `Delete "${promotion.title}"? This will remove it for all users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deletePromotion(promotion.id);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              setPromotions(prev => prev.filter(p => p.id !== promotion.id));
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (promotion: Promotion) => {
    const now = new Date();
    if (!promotion.is_active) return { label: 'Inactive', color: COLORS.textSecondary };
    if (now > new Date(promotion.ends_at)) return { label: 'Expired', color: COLORS.error };
    if (now < new Date(promotion.starts_at)) return { label: 'Scheduled', color: COLORS.warning };
    return { label: 'Active', color: COLORS.success };
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatDiscount = (p: Promotion) =>
    p.discount_type === 'percentage' ? `${p.discount_value}% off` : `₱${p.discount_value} off`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Platform Promotions</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AdminCreatePromotion', {})}
        >
          <Plus size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoBanner}>
          <Globe size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Platform-wide promotions apply to all professionals. Clients can use these codes at any checkout.
          </Text>
        </View>

        {!loading && promotions.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Tag size={48} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Platform Promotions</Text>
            <Text style={styles.emptySubtitle}>
              Create platform-wide discount codes for all users.
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={() => navigation.navigate('AdminCreatePromotion', {})}
            >
              <Plus size={18} color={COLORS.white} />
              <Text style={styles.emptyCreateButtonText}>Create Promotion</Text>
            </TouchableOpacity>
          </View>
        )}

        {promotions.map(promotion => {
          const status = getStatusInfo(promotion);
          return (
            <Card key={promotion.id} style={styles.promotionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.codeBadge}>
                  <Tag size={14} color={COLORS.primary} />
                  <Text style={styles.codeText}>{promotion.code}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${status.color}20` }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>

              <Text style={styles.promotionTitle}>{promotion.title}</Text>
              <Text style={styles.discountValue}>{formatDiscount(promotion)}</Text>
              {promotion.description ? (
                <Text style={styles.descriptionText}>{promotion.description}</Text>
              ) : null}

              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Clock size={13} color={COLORS.textSecondary} />
                  <Text style={styles.detailText}>
                    {formatDate(promotion.starts_at)} – {formatDate(promotion.ends_at)}
                  </Text>
                </View>
                {promotion.max_uses !== null && (
                  <View style={styles.detailItem}>
                    <Users size={13} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>
                      {promotion.uses_count}/{promotion.max_uses} uses
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardActions}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>
                    {promotion.is_active ? 'Active' : 'Inactive'}
                  </Text>
                  <Switch
                    value={promotion.is_active}
                    onValueChange={() => handleToggleActive(promotion)}
                    trackColor={{ false: COLORS.border, true: COLORS.success }}
                    thumbColor={COLORS.white}
                  />
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                      navigation.navigate('AdminCreatePromotion', { promotionId: promotion.id })
                    }
                  >
                    <Edit2 size={16} color={COLORS.primary} />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(promotion)}
                  >
                    <Trash2 size={16} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  emptyCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.round,
  },
  emptyCreateButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  promotionCard: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  codeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  promotionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  discountValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  descriptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  deleteButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
});
