import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS, AD_CONFIG } from '../../constants';
import { AdCreative } from '../../types';
import { recordImpression, recordClick } from '../../services/ads';
import { useAuth } from '../../hooks/useAuth';

interface BookingInterstitialAdProps {
  visible: boolean;
  ad: AdCreative | null;
  onDismiss: () => void;
}

const BookingInterstitialAd: React.FC<BookingInterstitialAdProps> = ({
  visible,
  ad,
  onDismiss,
}) => {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(
    Math.ceil(AD_CONFIG.INTERSTITIAL_SKIP_DELAY_MS / 1000)
  );
  const impressionLogged = useRef(false);

  useEffect(() => {
    if (visible && ad && user?.id && !impressionLogged.current) {
      impressionLogged.current = true;
      recordImpression(ad.id, user.id, 'booking_interstitial', 0);
    }
  }, [visible, ad, user?.id]);

  useEffect(() => {
    if (!visible) {
      setCountdown(Math.ceil(AD_CONFIG.INTERSTITIAL_SKIP_DELAY_MS / 1000));
      impressionLogged.current = false;
      return;
    }

    if (countdown <= 0) return;

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, countdown]);

  if (!ad) return null;

  const handleCta = async () => {
    if (user?.id) {
      recordClick(ad.id, user.id, 'booking_interstitial');
    }
    if (ad.cta_url) {
      await Linking.openURL(ad.cta_url);
    }
    onDismiss();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Skip button */}
          <TouchableOpacity
            style={[styles.skipButton, countdown > 0 && styles.skipDisabled]}
            onPress={countdown <= 0 ? onDismiss : undefined}
            activeOpacity={countdown <= 0 ? 0.7 : 1}
          >
            {countdown > 0 ? (
              <Text style={styles.skipCountdown}>{countdown}s</Text>
            ) : (
              <X size={18} color={COLORS.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Ad image */}
          {ad.image_url && (
            <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
          )}

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.sponsored}>Sponsored</Text>
            <Text style={styles.headline}>{ad.headline}</Text>
            {ad.subtext ? (
              <Text style={styles.subtext}>{ad.subtext}</Text>
            ) : null}

            <TouchableOpacity style={styles.ctaButton} onPress={handleCta} activeOpacity={0.8}>
              <Text style={styles.ctaText}>{ad.cta_label}</Text>
            </TouchableOpacity>

            <Text style={styles.advertiser}>
              Ad by {ad.advertiser_name}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default BookingInterstitialAd;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
  },
  skipButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipDisabled: {
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  skipCountdown: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  image: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  sponsored: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '600',
    color: COLORS.textLight,
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  headline: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md - 2,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  ctaText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
  advertiser: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textLight,
  },
});
