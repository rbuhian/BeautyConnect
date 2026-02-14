import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';

interface BoostProfileCardProps {
  onPress: () => void;
}

const BoostProfileCard: React.FC<BoostProfileCardProps> = ({ onPress }) => (
  <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.iconContainer}>
        <TrendingUp size={24} color={COLORS.white} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.headline}>Boost Your Profile</Text>
        <Text style={styles.subtext}>Appear at the top of search results</Text>
      </View>
      <View style={styles.ctaContainer}>
        <Text style={styles.ctaText}>From {'\u20B1'}99</Text>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

export default BoostProfileCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  headline: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  subtext: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.85)',
  },
  ctaContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  ctaText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
