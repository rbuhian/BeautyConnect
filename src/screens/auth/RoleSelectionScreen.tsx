import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthScreenProps } from '../../navigation/types';
import { COLORS, SPACING, FONT_SIZES } from '../../constants';

const AppLogo = require('../../../BeautyConnect.png');

export default function RoleSelectionScreen({ navigation }: AuthScreenProps<'RoleSelection'>) {
  const handleSelectRole = (role: 'client' | 'professional') => {
    navigation.navigate('CreateAccount', { role });
  };

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={AppLogo} style={styles.logoImage} />
          <Text style={styles.logoText}>Maquillage.Ph</Text>
        </View>

        {/* Role Options */}
        <View style={styles.options}>
          <TouchableOpacity
            style={styles.option}
            activeOpacity={0.8}
            onPress={() => handleSelectRole('client')}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
            <Text style={styles.optionLabel}>Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            activeOpacity={0.8}
            onPress={() => handleSelectRole('professional')}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
            <Text style={styles.optionLabel}>Service Provider</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl * 2,
  },
  logoImage: {
    width: 160,
    height: 160,
    borderRadius: 20,
    marginBottom: SPACING.sm,
  },
  logoText: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.white,
    fontStyle: 'italic',
    fontWeight: '400',
  },
  options: {
    width: '100%',
    gap: SPACING.xl,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 36,
  },
  optionLabel: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.white,
    fontWeight: '500',
  },
});
