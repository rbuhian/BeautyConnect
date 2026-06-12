import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { BookOpen } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { AdCreative } from '../../types';
import { recordImpression, recordClick } from '../../services/ads';
import { useAuth } from '../../hooks/useAuth';

interface SponsoredContentCardProps {
  ad: AdCreative;
  position: number;
}

const SponsoredContentCard: React.FC<SponsoredContentCardProps> = ({ ad, position }) => {
  const { user } = useAuth();
  const impressionLogged = useRef(false);

  useEffect(() => {
    if (user?.id && !impressionLogged.current) {
      impressionLogged.current = true;
      recordImpression(ad.id, user.id, 'discover_sponsored_content', position);
    }
  }, [ad.id, user?.id, position]);

  const handlePress = async () => {
    if (user?.id) {
      recordClick(ad.id, user.id, 'discover_sponsored_content');
    }
    if (ad.cta_url) {
      await Linking.openURL(ad.cta_url);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      {ad.image_url && (
        <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
      )}
      <View style={styles.content}>
        <View style={styles.labelRow}>
          <BookOpen size={12} color={COLORS.primary} />
          <Text style={styles.label}>
            Beauty Tip {'\u00B7'} Sponsored by {ad.advertiser_name}
          </Text>
        </View>
        <Text style={styles.headline} numberOfLines={2}>
          {ad.headline}
        </Text>
        {ad.subtext ? (
          <Text style={styles.subtext} numberOfLines={2}>
            {ad.subtext}
          </Text>
        ) : null}
        <Text style={styles.readMore}>{ad.cta_label}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(SponsoredContentCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  label: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  headline: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 24,
  },
  subtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  readMore: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
