import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Edit,
  Briefcase,
  Calendar,
  CalendarCheck,
  Settings,
  LogOut,
  Mail,
  ChevronRight,
  Star,
  CheckCircle,
  Eye,
  EyeOff,
  Users,
  Building2,
  Award,
  Wallet,
  TrendingUp,
  Clock,
  Package,
  Tag,
  ShieldCheck,
  ShieldAlert,
  Shield,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { updateProfessionalProfile } from '../../services/professional';
import { getStaffMemberByUserId } from '../../services/business';
import { supabase } from '../../services/supabase';
import { StaffMember } from '../../types';

export default function ProfileScreen({ navigation }: any) {
  const { user, professionalProfile, refreshProfessionalProfile, logout } = useAuth();
  const [isLiveLocal, setIsLiveLocal] = useState(professionalProfile?.is_live || false);
  const [toggling, setToggling] = useState(false);
  const [isStaffMember, setIsStaffMember] = useState(false);
  const [staffMemberInfo, setStaffMemberInfo] = useState<StaffMember | null>(null);
  const [avgRating, setAvgRating] = useState<number>(professionalProfile?.avg_rating || 0);
  const [totalReviews, setTotalReviews] = useState<number>(professionalProfile?.total_reviews || 0);

  const fetchReviewStats = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', user.id);
    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      setAvgRating(Math.round(avg * 10) / 10);
      setTotalReviews(data.length);
    } else {
      setAvgRating(0);
      setTotalReviews(0);
    }
  }, [user?.id]);

  // Refresh profile and review stats every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshProfessionalProfile();
      fetchReviewStats();
    }, [fetchReviewStats])
  );

  // Debug logging
  useEffect(() => {
    if (professionalProfile) {
      console.log('=== Professional Profile Debug ===');
      console.log('Profile ID:', professionalProfile.id);
      console.log('User ID:', professionalProfile.user_id);
      console.log('Has business?', !!professionalProfile.business);
      if (professionalProfile.business) {
        console.log('Business name:', professionalProfile.business.business_name);
        console.log('Business type:', professionalProfile.business.business_type);
      }
      console.log('Staff members count:', professionalProfile.staff_members?.length || 0);
      console.log('==================================');
    }
  }, [professionalProfile]);

  // Sync with professionalProfile changes
  useEffect(() => {
    setIsLiveLocal(professionalProfile?.is_live || false);
  }, [professionalProfile?.is_live]);

  // Check if user is a staff member of any business
  useEffect(() => {
    const checkStaffStatus = async () => {
      if (!user?.id) return;
      try {
        const staffMember = await getStaffMemberByUserId(user.id);
        if (staffMember) {
          setIsStaffMember(true);
          setStaffMemberInfo(staffMember);
        }
      } catch (err) {
        console.error('Error checking staff status:', err);
      }
    };
    checkStaffStatus();
  }, [user?.id]);

  const handleToggleLive = async (value: boolean) => {
    if (!professionalProfile?.id) return;

    setToggling(true);
    setIsLiveLocal(value);

    const result = await updateProfessionalProfile(professionalProfile.id, {
      is_live: value,
    });

    if (result.error) {
      // Revert on error
      setIsLiveLocal(!value);
      console.error('[handleToggleLive] error:', result.error);
      Alert.alert('Error', `Failed to update profile status: ${result.error.message}`);
    }

    setToggling(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const hasBusiness = !!professionalProfile?.business;

  const menuItems = [
    {
      icon: Edit,
      label: 'Edit Profile',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      icon: Briefcase,
      label: 'Manage Services',
      onPress: () => navigation.navigate('ManageServices'),
    },
    // Show Team Management only for business owners
    ...(hasBusiness
      ? [
          {
            icon: Users,
            label: 'Team Management',
            subtitle: professionalProfile?.business?.business_name,
            onPress: () => navigation.navigate('StaffList'),
          },
        ]
      : []),
    // Show My Assigned Bookings for staff members
    ...(isStaffMember
      ? [
          {
            icon: CalendarCheck,
            label: 'My Assigned Bookings',
            subtitle: (staffMemberInfo as any)?.business?.business_name || 'Staff',
            onPress: () => navigation.navigate('StaffBookings'),
          },
        ]
      : []),
    {
      icon: Wallet,
      label: 'Payments & Earnings',
      onPress: () => navigation.navigate('Payments'),
    },
    {
      icon: Users,
      label: 'My Clients',
      onPress: () => navigation.navigate('ClientManagement'),
    },
    {
      icon: Settings,
      label: 'Settings',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  const stats = [
    {
      icon: Star,
      label: 'Rating',
      value: avgRating > 0 ? avgRating.toFixed(1) : '0.0',
      color: '#FFB800',
    },
    {
      icon: CheckCircle,
      label: 'Reviews',
      value: totalReviews,
      color: COLORS.success,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileSection}>
          <Card style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.avatar}
                >
                  <User size={40} color={COLORS.white} />
                </LinearGradient>
              )}
            </View>

            {/* User Info */}
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user?.name || 'Professional'}</Text>
              {professionalProfile?.is_verified && (
                <ShieldCheck size={20} color={COLORS.success} />
              )}
            </View>
            <View style={styles.phoneRow}>
              <Mail size={14} color={COLORS.textSecondary} />
              <Text style={styles.phoneText}>{user?.email || ''}</Text>
            </View>

            {/* Account Type Badge */}
            {hasBusiness ? (
              <View style={styles.accountBadge}>
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.accountBadgeGradient}
                >
                  <Building2 size={14} color={COLORS.white} />
                  <Text style={styles.accountBadgeText}>Business Owner</Text>
                </LinearGradient>
              </View>
            ) : isStaffMember ? (
              <View style={styles.accountBadge}>
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.accountBadgeGradient}
                >
                  <Award size={14} color={COLORS.white} />
                  <Text style={styles.accountBadgeText}>Staff Member</Text>
                </LinearGradient>
              </View>
            ) : (
              <View style={styles.accountBadge}>
                <View style={styles.accountBadgeIndividual}>
                  <User size={14} color={COLORS.primary} />
                  <Text style={styles.accountBadgeTextIndividual}>Individual Professional</Text>
                </View>
              </View>
            )}

            {/* Business/Staff Info */}
            {hasBusiness && professionalProfile?.business && (
              <View style={styles.businessInfo}>
                {professionalProfile.business.logo ? (
                  <Image
                    source={{ uri: professionalProfile.business.logo }}
                    style={styles.businessLogo}
                  />
                ) : (
                  <View style={styles.businessLogoPlaceholder}>
                    <Building2 size={16} color={COLORS.primary} />
                  </View>
                )}
                <Text style={styles.businessName}>
                  {professionalProfile.business.business_name}
                </Text>
              </View>
            )}
            {isStaffMember && staffMemberInfo && (
              <View style={styles.businessInfo}>
                <View style={styles.businessLogoPlaceholder}>
                  <Building2 size={16} color={COLORS.success} />
                </View>
                <Text style={styles.businessName}>
                  {(staffMemberInfo as any)?.business?.business_name || 'Staff Member'}
                </Text>
              </View>
            )}

            {/* Live Status Toggle */}
            <View style={styles.liveToggleContainer}>
              <View style={styles.liveToggleInfo}>
                {isLiveLocal ? (
                  <Eye size={18} color={COLORS.success} />
                ) : (
                  <EyeOff size={18} color={COLORS.textSecondary} />
                )}
                <Text style={styles.liveToggleLabel}>
                  Profile {isLiveLocal ? 'Live' : 'Hidden'}
                </Text>
              </View>
              <Switch
                value={isLiveLocal}
                onValueChange={handleToggleLive}
                disabled={toggling}
                trackColor={{ false: COLORS.border, true: COLORS.success }}
                thumbColor={COLORS.white}
              />
            </View>
            {!isLiveLocal && (
              <Text style={styles.liveWarning}>
                Your profile is hidden from clients
              </Text>
            )}
          </Card>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          {stats.map((stat, index) => (
            <TouchableOpacity
              key={index}
              style={{ flex: 1 }}
              onPress={() => {
                if (stat.label === 'Reviews') {
                  navigation.navigate('Reviews');
                }
              }}
              activeOpacity={stat.label === 'Reviews' ? 0.7 : 1}
            >
              <Card style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
                  <stat.icon size={24} color={stat.color} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconContainer}>
                <item.icon size={20} color={COLORS.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {'subtitle' in item && item.subtitle && (
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                )}
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>BeautyConnect v1.0.0</Text>
        </View>
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatarContainer: {
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    justifyContent: 'center',
  },
  userName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  phoneText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  accountBadge: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  accountBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
    gap: SPACING.xs,
  },
  accountBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  accountBadgeIndividual: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.chipBackground,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  accountBadgeTextIndividual: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.primary,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
  },
  businessLogo: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
  },
  businessLogoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  businessName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  liveToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  liveToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  liveToggleLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  liveWarning: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  menuSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    gap: SPACING.sm,
  },
  logoutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  versionSection: {
    alignItems: 'center',
    paddingBottom: SPACING.xl,
  },
  versionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
