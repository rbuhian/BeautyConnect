import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, User, ChevronRight, Calendar } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ProfessionalScreenProps } from '../../navigation/types';
import { GradientButton, Card, Loading, EmptyState } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CATEGORIES } from '../../constants';
import { StaffMember } from '../../types';
import { getStaffMembers, deleteStaffMember } from '../../services/business';
import { useAuthStore } from '../../stores/authStore';

export default function StaffListScreen({ navigation }: ProfessionalScreenProps<'StaffList'>) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const professionalProfile = useAuthStore((state) => state.professionalProfile);
  const business = professionalProfile?.business;

  const fetchStaff = useCallback(async () => {
    if (!business?.id) return;

    try {
      const data = await getStaffMembers(business.id);
      setStaffMembers(data);
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStaff();
    });
    return unsubscribe;
  }, [navigation, fetchStaff]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    Alert.alert(
      'Delete Staff Member',
      `Are you sure you want to remove ${staff.name} from your team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStaffMember(staff.id);
              setStaffMembers((prev) => prev.filter((s) => s.id !== staff.id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete staff member');
            }
          },
        },
      ]
    );
  };

  const getCategoryLabels = (specialties: string[]) => {
    return specialties
      .map((s) => CATEGORIES.find((c) => c.value === s)?.label || s)
      .join(', ');
  };

  const renderStaffItem = ({ item }: { item: StaffMember }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('EditStaff', { staffId: item.id })}
      onLongPress={() => handleDeleteStaff(item)}
    >
      <Card style={styles.staffCard}>
        <View style={styles.staffInfo}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.staffAvatar} />
          ) : (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.staffAvatarPlaceholder}
            >
              <User size={24} color={COLORS.white} />
            </LinearGradient>
          )}
          <View style={styles.staffDetails}>
            <View style={styles.staffHeader}>
              <Text style={styles.staffName}>{item.name}</Text>
              {!item.is_active && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveBadgeText}>Inactive</Text>
                </View>
              )}
            </View>
            <Text style={styles.staffSpecialties}>
              {getCategoryLabels(item.specialties)}
            </Text>
          </View>
        </View>
        <View style={styles.staffActions}>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => navigation.navigate('StaffAvailability', { staffId: item.id })}
          >
            <Calendar size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <ChevronRight size={20} color={COLORS.textSecondary} />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (!business) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState
          type="professionals"
          title="Not a Business"
          message="Staff management is only available for salon and business accounts."
        />
      </SafeAreaView>
    );
  }

  if (loading) {
    return <Loading message="Loading staff..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Team Members</Text>
          <Text style={styles.subtitle}>
            {staffMembers.length} staff member{staffMembers.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddStaff')}
        >
          <Plus size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Staff List */}
      <FlatList
        data={staffMembers}
        renderItem={renderStaffItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            type="professionals"
            title="No Staff Members"
            message="Add your first team member to get started."
            actionLabel="Add Staff"
            onAction={() => navigation.navigate('AddStaff')}
          />
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    flexGrow: 1,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  staffAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffDetails: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  staffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  staffName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inactiveBadge: {
    backgroundColor: COLORS.error + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  inactiveBadgeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.error,
    fontWeight: '500',
  },
  staffSpecialties: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  staffActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  scheduleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
