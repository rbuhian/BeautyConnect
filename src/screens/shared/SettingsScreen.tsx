import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Shield,
  HelpCircle,
  FileText,
  Mail,
  ChevronRight,
  Smartphone,
  Info,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  registerForPushNotifications,
  savePushToken,
  deactivatePushToken,
} from '../../services/notifications';
import { supabase } from '../../services/supabase';

export default function SettingsScreen({ navigation }: any) {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
    loadEmailPreference();
  }, []);

  const loadEmailPreference = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('users')
      .select('email_notifications')
      .eq('id', user.id)
      .single();
    if (data) setEmailNotificationsEnabled(data.email_notifications ?? true);
  };

  const handleEmailNotificationToggle = async (enabled: boolean) => {
    if (!user?.id) return;
    setEmailNotificationsEnabled(enabled);
    await supabase
      .from('users')
      .update({ email_notifications: enabled })
      .eq('id', user.id);
  };

  const checkNotificationStatus = async () => {
    try {
      const token = await registerForPushNotifications();
      if (token) {
        setPushToken(token);
        setNotificationsEnabled(true);
      }
    } catch (error) {
      console.log('Notifications not available');
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      if (enabled) {
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(user.id, token);
          setPushToken(token);
          setNotificationsEnabled(true);
        } else {
          Alert.alert(
            'Notifications Unavailable',
            'Push notifications could not be enabled. Please check your device settings and ensure notifications are allowed for this app.',
            [{ text: 'OK' }]
          );
        }
      } else {
        if (pushToken) {
          await deactivatePushToken(user.id, pushToken);
        }
        setPushToken(null);
        setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  const openAppSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const settingsGroups = [
    {
      title: 'Notifications',
      items: [
        {
          icon: notificationsEnabled ? Bell : BellOff,
          label: 'Push Notifications',
          subtitle: notificationsEnabled ? 'Enabled' : 'Disabled',
          type: 'toggle' as const,
          value: notificationsEnabled,
          onToggle: handleNotificationToggle,
        },
        {
          icon: Mail,
          label: 'Email Notifications',
          subtitle: 'Booking confirmations and reminders',
          type: 'toggle' as const,
          value: emailNotificationsEnabled,
          onToggle: handleEmailNotificationToggle,
        },
        {
          icon: Smartphone,
          label: 'Device Settings',
          subtitle: 'Manage app permissions',
          onPress: openAppSettings,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help Center',
          subtitle: 'FAQs and guides',
          onPress: () => {
            Alert.alert(
              'Help Center',
              'Visit our help center for answers to common questions and guides on using BeautyConnect.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Visit',
                  onPress: () => Linking.openURL('https://beautyconnect.ph/help'),
                },
              ]
            );
          },
        },
        {
          icon: Mail,
          label: 'Contact Support',
          subtitle: 'support@beautyconnect.ph',
          onPress: () => Linking.openURL('mailto:support@beautyconnect.ph'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'About BeautyConnect',
          onPress: () => {
            Alert.alert(
              'BeautyConnect',
              'BeautyConnect is the premier platform connecting beauty professionals with clients in the Philippines.\n\nVersion 1.0.0\nBuild 1',
              [{ text: 'OK' }]
            );
          },
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: FileText,
          label: 'Terms of Service',
          onPress: () => {
            Alert.alert(
              'Terms of Service',
              'By using BeautyConnect, you agree to our terms of service which govern the use of our platform.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Read Terms',
                  onPress: () => Linking.openURL('https://beautyconnect.ph/terms'),
                },
              ]
            );
          },
        },
        {
          icon: Shield,
          label: 'Privacy Policy',
          onPress: () => {
            Alert.alert(
              'Privacy Policy',
              'Your privacy is important to us. Read our privacy policy to understand how we collect and use your data.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Read Policy',
                  onPress: () => Linking.openURL('https://beautyconnect.ph/privacy'),
                },
              ]
            );
          },
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, itemIndex: number) => {
    if (item.type === 'toggle') {
      return (
        <View key={itemIndex} style={styles.settingItem}>
          <View style={styles.settingIconContainer}>
            <item.icon size={20} color={COLORS.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            disabled={loading}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={itemIndex}
        style={styles.settingItem}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View style={styles.settingIconContainer}>
          <item.icon size={20} color={COLORS.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingLabel}>{item.label}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
        <ChevronRight size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {settingsGroups.map((group, groupIndex) => (
          <View key={groupIndex} style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map((item, itemIndex) => renderSettingItem(item, itemIndex))}
          </View>
        ))}

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>BeautyConnect v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2026 BeautyConnect Philippines</Text>
          {pushToken && (
            <Text style={styles.tokenText} numberOfLines={1}>
              Push Token: ...{pushToken.slice(-20)}
            </Text>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  settingsGroup: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  groupTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  versionText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  versionSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  tokenText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    maxWidth: '80%',
  },
});
