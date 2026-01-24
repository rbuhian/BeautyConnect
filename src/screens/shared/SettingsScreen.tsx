import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  Mail,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';

export default function SettingsScreen({ navigation }: any) {
  const settingsGroups = [
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Push Notifications',
          subtitle: 'Coming soon',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: HelpCircle,
          label: 'Help Center',
          onPress: () => {},
        },
        {
          icon: Mail,
          label: 'Contact Support',
          onPress: () => Linking.openURL('mailto:support@beautyconnect.ph'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: FileText,
          label: 'Terms of Service',
          onPress: () => {},
        },
        {
          icon: Shield,
          label: 'Privacy Policy',
          onPress: () => {},
        },
      ],
    },
  ];

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
            {group.items.map((item, itemIndex) => (
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
                  {'subtitle' in item && item.subtitle && (
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  )}
                </View>
                <ChevronRight size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>BeautyConnect v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2026 BeautyConnect Philippines</Text>
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
});
