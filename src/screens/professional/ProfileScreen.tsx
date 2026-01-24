import React, { useState, useEffect } from 'react';
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
  Settings,
  LogOut,
  Phone,
  ChevronRight,
  Star,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { updateProfessionalProfile } from '../../services/professional';

export default function ProfileScreen({ navigation }: any) {
  const { user, professionalProfile, logout } = useAuth();
  const [isLiveLocal, setIsLiveLocal] = useState(professionalProfile?.is_live || false);
  const [toggling, setToggling] = useState(false);

  // Sync with professionalProfile changes
  useEffect(() => {
    setIsLiveLocal(professionalProfile?.is_live || false);
  }, [professionalProfile?.is_live]);

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
      Alert.alert('Error', 'Failed to update profile status');
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
    {
      icon: Calendar,
      label: 'Manage Availability',
      onPress: () => navigation.navigate('Availability'),
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
      value: professionalProfile?.avg_rating?.toFixed(1) || '0.0',
      color: '#FFB800',
    },
    {
      icon: CheckCircle,
      label: 'Reviews',
      value: professionalProfile?.total_reviews || 0,
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
            <Text style={styles.userName}>{user?.name || 'Professional'}</Text>
            <View style={styles.phoneRow}>
              <Phone size={14} color={COLORS.textSecondary} />
              <Text style={styles.phoneText}>{user?.phone || ''}</Text>
            </View>

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
            <Card key={index} style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}20` }]}>
                <stat.icon size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
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
              <Text style={styles.menuLabel}>{item.label}</Text>
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
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
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
