import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Edit,
  Heart,
  Settings,
  LogOut,
  Phone,
  ChevronRight,
} from 'lucide-react-native';
import { Card } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen({ navigation }: any) {
  const { user, logout } = useAuth();

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
      icon: Heart,
      label: 'My Favorites',
      onPress: () => navigation.navigate('Favorites'),
    },
    {
      icon: Settings,
      label: 'Settings',
      onPress: () => navigation.navigate('Settings'),
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
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <View style={styles.phoneRow}>
              <Phone size={14} color={COLORS.textSecondary} />
              <Text style={styles.phoneText}>{user?.phone || ''}</Text>
            </View>
          </Card>
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
    paddingBottom: SPACING.lg,
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
  },
  phoneText: {
    fontSize: FONT_SIZES.sm,
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
