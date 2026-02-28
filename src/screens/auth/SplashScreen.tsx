import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Calendar, MessageCircle } from 'lucide-react-native';
import { AuthScreenProps } from '../../navigation/types';
import { Button } from '../../components';
import { COLORS, SPACING, FONT_SIZES, APP_TAGLINE } from '../../constants';

const AppLogo = require('../../../BeautyConnect.png');

export default function SplashScreen({ navigation }: AuthScreenProps<'Splash'>) {
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
          <Text style={styles.tagline}>{APP_TAGLINE}</Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authButtons}>
          <Button
            title="Get Started"
            onPress={() => navigation.navigate('EmailInput')}
            variant="primary"
            size="large"
          />
          <Button
            title="Sign In"
            onPress={() => navigation.navigate('EmailInput')}
            variant="secondary"
            size="large"
          />
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Star size={20} color={COLORS.white} />
            <Text style={styles.featureText}>Top-rated Professionals</Text>
          </View>
          <View style={styles.featureItem}>
            <Calendar size={20} color={COLORS.white} />
            <Text style={styles.featureText}>Easy Booking</Text>
          </View>
          <View style={styles.featureItem}>
            <MessageCircle size={20} color={COLORS.white} />
            <Text style={styles.featureText}>Direct Chat</Text>
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoImage: {
    width: 200,
    height: 200,
    borderRadius: 24,
    marginBottom: SPACING.md,
  },
  tagline: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  authButtons: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  features: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  featureText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
});
