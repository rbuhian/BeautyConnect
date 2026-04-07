import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  Clock,
  Edit2,
  Trash2,
  Zap,
  Calendar,
} from 'lucide-react-native';
import { Card, Loading, GradientButton } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Service } from '../../types';
import { getServices, deleteService } from '../../services/professional';

export default function ManageServicesScreen({ navigation }: any) {
  const { professionalProfile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchServices = useCallback(async () => {
    if (!professionalProfile?.id) return;

    try {
      const result = await getServices(professionalProfile.id);
      if (result.data) {
        setServices(result.data);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professionalProfile?.id]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchServices();
    });
    return unsubscribe;
  }, [navigation, fetchServices]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleDeleteService = (service: Service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteService(service.id);
            if (result.error) {
              Alert.alert('Error', 'Failed to delete service.');
            } else {
              setServices(services.filter((s) => s.id !== service.id));
            }
          },
        },
      ]
    );
  };

  const getCategoryLabel = (value: string) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  if (loading) {
    return <Loading fullScreen message="Loading services..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Services</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddService')}
        >
          <Plus size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Calendar size={48} color={COLORS.textLight} />
            </View>
            <Text style={styles.emptyTitle}>No services yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first service to start accepting bookings
            </Text>
            <GradientButton
              title="Add Service"
              onPress={() => navigation.navigate('AddService')}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <>
            <Text style={styles.servicesCount}>
              {services.length} service{services.length !== 1 ? 's' : ''}
            </Text>

            {services.map((service) => (
              <Card key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>
                        {getCategoryLabel(service.category)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.servicePrice}>
                    ₱{service.price.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.serviceDetails}>
                  <View style={styles.serviceDetail}>
                    <Clock size={14} color={COLORS.textSecondary} />
                    <Text style={styles.serviceDetailText}>
                      {service.duration_minutes} mins
                    </Text>
                  </View>
                  <View style={styles.serviceDetail}>
                    {service.booking_type === 'instant' ? (
                      <>
                        <Zap size={14} color={COLORS.success} />
                        <Text style={[styles.serviceDetailText, { color: COLORS.success }]}>
                          Instant Book
                        </Text>
                      </>
                    ) : (
                      <>
                        <Calendar size={14} color={COLORS.primary} />
                        <Text style={[styles.serviceDetailText, { color: COLORS.primary }]}>
                          Request Only
                        </Text>
                      </>
                    )}
                  </View>
                </View>

<View style={styles.serviceActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigation.navigate('EditService', { service })}
                  >
                    <Edit2 size={18} color={COLORS.primary} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteService(service)}
                  >
                    <Trash2 size={18} color={COLORS.error} />
                    <Text style={[styles.actionText, { color: COLORS.error }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>

                {!service.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveText}>Inactive</Text>
                  </View>
                )}
              </Card>
            ))}

            <TouchableOpacity
              style={styles.addServiceCard}
              onPress={() => navigation.navigate('AddService')}
            >
              <Plus size={24} color={COLORS.primary} />
              <Text style={styles.addServiceText}>Add another service</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 50 }} />
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.lg,
  },
  servicesCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  serviceCard: {
    marginBottom: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  categoryText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  servicePrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  serviceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  serviceDetailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  depositRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  depositLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  depositAmount: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  inactiveBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.textLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomLeftRadius: RADIUS.md,
  },
  inactiveText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: '500',
  },
  addServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  addServiceText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    width: 200,
  },
});
