import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { ShoppingBag, X } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CURRENCY } from '../../constants';
import { AffiliateProduct } from '../../types';
import { recordImpression, recordClick } from '../../services/ads';
import { useAuth } from '../../hooks/useAuth';

interface AffiliateProductCardProps {
  product: AffiliateProduct;
  onDismiss: () => void;
}

const AffiliateProductCard: React.FC<AffiliateProductCardProps> = ({
  product,
  onDismiss,
}) => {
  const { user } = useAuth();
  const impressionLogged = useRef(false);

  useEffect(() => {
    if (user?.id && !impressionLogged.current) {
      impressionLogged.current = true;
      recordImpression(product.id, user.id, 'chat_affiliate', 0);
    }
  }, [product.id, user?.id]);

  const handleShop = async () => {
    if (user?.id) {
      recordClick(product.id, user.id, 'chat_affiliate');
    }
    await Linking.openURL(product.affiliate_url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Suggested for you</Text>
      <View style={styles.card}>
        <Image source={{ uri: product.image_url }} style={styles.thumbnail} resizeMode="cover" />

        <View style={styles.info}>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.brand} numberOfLines={1}>
            {product.brand}
          </Text>
          <Text style={styles.price}>
            {CURRENCY.symbol}{product.price.toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity style={styles.shopButton} onPress={handleShop} activeOpacity={0.8}>
          <ShoppingBag size={14} color={COLORS.white} />
          <Text style={styles.shopText}>Shop</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <X size={14} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default React.memo(AffiliateProductCard);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.xs - 1,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  info: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  productName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  brand: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  price: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.primary,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm - 2,
    paddingHorizontal: SPACING.sm + 2,
    borderRadius: RADIUS.sm,
  },
  shopText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.white,
  },
  dismissButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
