import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Award } from 'lucide-react-native';
import { COLORS, FONT_SIZES, RADIUS, SPACING } from '../../constants';

const FeaturedBadge: React.FC = () => (
  <View style={styles.badge}>
    <Award size={10} color={COLORS.white} />
    <Text style={styles.text}>Featured</Text>
  </View>
);

export default FeaturedBadge;

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.md,
    zIndex: 10,
  },
  text: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
});
