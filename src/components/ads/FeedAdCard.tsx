import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { AdCreative } from '../../types';
import { recordImpression, recordClick } from '../../services/ads';
import { useAuth } from '../../hooks/useAuth';

interface FeedAdCardProps {
  ad: AdCreative;
  position: number;
}

const FeedAdCard: React.FC<FeedAdCardProps> = ({ ad, position }) => {
  const { user } = useAuth();
  const impressionLogged = useRef(false);

  useEffect(() => {
    if (!impressionLogged.current && user?.id) {
      impressionLogged.current = true;
      recordImpression(ad.id, user.id, 'discover_feed', position);
    }
  }, [ad.id, user?.id, position]);

  const handlePress = async () => {
    if (user?.id) {
      recordClick(ad.id, user.id, 'discover_feed');
    }
    if (ad.cta_url) {
      await Linking.openURL(ad.cta_url);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sponsoredLabel}>Sponsored</Text>

      {ad.image_url && (
        <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
      )}

      <View style={styles.content}>
        <Text style={styles.advertiser}>{ad.advertiser_name}</Text>
        <Text style={styles.headline} numberOfLines={2}>
          {ad.headline}
        </Text>
        {ad.subtext ? (
          <Text style={styles.subtext} numberOfLines={2}>
            {ad.subtext}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.ctaButton} onPress={handlePress} activeOpacity={0.8}>
          <Text style={styles.ctaText}>{ad.cta_label}</Text>
          <ExternalLink size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default React.memo(FeedAdCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sponsoredLabel: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    zIndex: 10,
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    letterSpacing: 0.5,
  },
  image: {
    width: '100%',
    height: 140,
  },
  content: {
    padding: SPACING.md,
  },
  advertiser: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  headline: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  ctaText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
});
