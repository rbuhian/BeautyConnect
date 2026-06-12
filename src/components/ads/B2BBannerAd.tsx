import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, ViewStyle } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { AdCreative } from '../../types';
import { recordImpression, recordClick } from '../../services/ads';
import { useAuth } from '../../hooks/useAuth';

interface B2BBannerAdProps {
  ad: AdCreative | null;
  style?: ViewStyle;
}

const B2BBannerAd: React.FC<B2BBannerAdProps> = ({ ad, style }) => {
  const { user } = useAuth();
  const impressionLogged = useRef(false);

  useEffect(() => {
    if (ad && user?.id && !impressionLogged.current) {
      impressionLogged.current = true;
      recordImpression(ad.id, user.id, 'professional_dashboard', 0);
    }
  }, [ad, user?.id]);

  if (!ad) return null;

  const handlePress = async () => {
    if (user?.id) {
      recordClick(ad.id, user.id, 'professional_dashboard');
    }
    if (ad.cta_url) {
      await Linking.openURL(ad.cta_url);
    }
  };

  return (
    <TouchableOpacity style={[styles.banner, style]} onPress={handlePress} activeOpacity={0.85}>
      {ad.image_url && (
        <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
      )}
      <View style={styles.overlay}>
        <View style={styles.textContainer}>
          <Text style={styles.headline} numberOfLines={1}>
            {ad.headline}
          </Text>
          <Text style={styles.subtext} numberOfLines={1}>
            {ad.subtext}
          </Text>
        </View>
        <View style={styles.ctaContainer}>
          <Text style={styles.ctaText}>{ad.cta_label}</Text>
          <ExternalLink size={12} color={COLORS.white} />
        </View>
      </View>
      <Text style={styles.adLabel}>Ad</Text>
    </TouchableOpacity>
  );
};

export default React.memo(B2BBannerAd);

const styles = StyleSheet.create({
  banner: {
    height: 100,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.textPrimary,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  textContainer: {
    flex: 1,
    marginRight: SPACING.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  ctaText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  adLabel: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    fontSize: FONT_SIZES.xs - 2,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    letterSpacing: 0.5,
  },
});
