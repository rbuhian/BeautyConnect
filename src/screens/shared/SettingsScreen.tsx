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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
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
  Lock,
  X,
  Eye,
  EyeOff,
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

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  const handleChangePassword = async () => {
    if (!newPassword || !currentPassword) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Too short', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }
    setChangingPassword(true);
    try {
      // Re-authenticate with current password first
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      if (signInError) {
        Alert.alert('Incorrect Password', 'Your current password is incorrect.');
        return;
      }
      // Update to new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed.');
    } catch {
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: Lock,
          label: 'Change Password',
          subtitle: 'Update your account password',
          onPress: () => setShowPasswordModal(true),
        },
      ],
    },
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
              'Visit our help center for answers to common questions and guides on using Maquillage.Ph.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Visit',
                  onPress: () => Linking.openURL('https://maquillage.ph/help'),
                },
              ]
            );
          },
        },
        {
          icon: Mail,
          label: 'Contact Support',
          subtitle: 'support@maquillage.ph',
          onPress: () => Linking.openURL('mailto:support@maquillage.ph'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: Info,
          label: 'About Maquillage.Ph',
          onPress: () => {
            Alert.alert(
              'Maquillage.Ph',
              'Maquillage.Ph is the premier platform connecting beauty professionals with clients in the Philippines.\n\nVersion 1.0.0\nBuild 1',
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
              'By using Maquillage.Ph, you agree to our terms of service which govern the use of our platform.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Read Terms',
                  onPress: () => Linking.openURL('https://maquillage.ph/terms'),
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
                  onPress: () => Linking.openURL('https://maquillage.ph/privacy'),
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
          <Text style={styles.versionText}>Maquillage.Ph v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2026 Maquillage.Ph Philippines</Text>
          {pushToken && (
            <Text style={styles.tokenText} numberOfLines={1}>
              Push Token: ...{pushToken.slice(-20)}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <X size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                {showCurrent ? <EyeOff size={20} color={COLORS.textSecondary} /> : <Eye size={20} color={COLORS.textSecondary} />}
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="At least 6 characters"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                {showNew ? <EyeOff size={20} color={COLORS.textSecondary} /> : <Eye size={20} color={COLORS.textSecondary} />}
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat new password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? <EyeOff size={20} color={COLORS.textSecondary} /> : <Eye size={20} color={COLORS.textSecondary} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, changingPassword && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={changingPassword}
            >
              {changingPassword
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.saveBtnText}>Save New Password</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
});
