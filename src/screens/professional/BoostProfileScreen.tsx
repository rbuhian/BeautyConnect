import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Award, Check, Clock, Sparkles, Crown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, RADIUS, CURRENCY, FEATURED_PACKAGES } from '../../constants';
import { FeaturedPackage, FeaturedPackageKey } from '../../types';
import { getFeaturedListingStatus } from '../../services/ads';
import { createCheckoutSession, waitForPayment } from '../../services/payment';
import { useAuth } from '../../hooks/useAuth';
import { ProfessionalScreenProps } from '../../navigation/types';
import PaymentWebView from '../../components/PaymentWebView';

const PACKAGE_ICONS: Record<FeaturedPackageKey, React.ReactNode> = {
  boost_1d: <Sparkles size={24} color={COLORS.primary} />,
  weekly: <Clock size={24} color={COLORS.primary} />,
  monthly: <Award size={24} color={COLORS.primary} />,
  priority_category: <Crown size={24} color={COLORS.primary} />,
};

export default function BoostProfileScreen({
  navigation,
}: ProfessionalScreenProps<'BoostProfile'>) {
  const { user, professionalProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [currentEndsAt, setCurrentEndsAt] = useState<string | null>(null);
  const [currentPackage, setCurrentPackage] = useState<FeaturedPackageKey | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<FeaturedPackage | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    if (!professionalProfile?.id) return;
    setLoading(true);
    const result = await getFeaturedListingStatus(professionalProfile.id);
    if (result.data) {
      setIsFeatured(result.data.is_featured);
      setCurrentEndsAt(result.data.ends_at);
      setCurrentPackage(result.data.package);
    }
    setLoading(false);
  };

  const handlePurchase = async (pkg: FeaturedPackage) => {
    if (!professionalProfile?.id) return;

    Alert.alert(
      'Confirm Boost',
      `Activate "${pkg.label}" for ${CURRENCY.symbol}${pkg.price.toLocaleString()}?\n\n${pkg.description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            setPurchasing(true);
            setSelectedPkg(pkg);

            const result = await createCheckoutSession(
              pkg.key,
              professionalProfile.id,
              pkg.price,
              pkg.label
            );

            setPurchasing(false);

            if (result.error || !result.data) {
              Alert.alert('Error', result.error?.message || 'Failed to start payment');
              return;
            }

            setCheckoutUrl(result.data.checkoutUrl);
            setCurrentSessionId(result.data.sessionId);
            setShowPayment(true);
          },
        },
      ]
    );
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setPurchasing(true);

    // Wait for webhook to process and create the featured listing
    const status = await waitForPayment(currentSessionId);

    setPurchasing(false);

    if (status === 'paid') {
      Alert.alert(
        'Boost Activated!',
        `Your profile is now featured for ${selectedPkg?.duration_days || 1} day${(selectedPkg?.duration_days || 1) > 1 ? 's' : ''}.`,
        [{ text: 'OK' }]
      );
      loadStatus();
    } else {
      Alert.alert(
        'Payment Processing',
        'Your payment is being processed. Your boost will be activated shortly.',
        [{ text: 'OK' }]
      );
      // Refresh after a delay in case webhook is slow
      setTimeout(() => loadStatus(), 5000);
    }
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    Alert.alert('Payment Cancelled', 'No charges were made. You can try again anytime.');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boost Your Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Current Status */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
        ) : isFeatured ? (
          <LinearGradient
            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusCard}
          >
            <Check size={28} color={COLORS.white} />
            <Text style={styles.statusTitle}>Your profile is featured!</Text>
            {currentEndsAt && (
              <Text style={styles.statusSubtext}>
                Expires: {formatDate(currentEndsAt)}
              </Text>
            )}
          </LinearGradient>
        ) : (
          <View style={styles.inactiveCard}>
            <Award size={28} color={COLORS.textSecondary} />
            <Text style={styles.inactiveTitle}>Not currently featured</Text>
            <Text style={styles.inactiveSubtext}>
              Choose a package below to appear at the top of client search results
            </Text>
          </View>
        )}

        {/* Packages */}
        <Text style={styles.sectionTitle}>Choose a Package</Text>

        {FEATURED_PACKAGES.map((pkg) => {
          const isCurrentPkg = isFeatured && currentPackage === pkg.key;
          return (
            <TouchableOpacity
              key={pkg.key}
              style={[styles.packageCard, isCurrentPkg && styles.packageCardActive]}
              onPress={() => handlePurchase(pkg)}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              <View style={styles.packageIcon}>{PACKAGE_ICONS[pkg.key]}</View>
              <View style={styles.packageInfo}>
                <Text style={styles.packageLabel}>{pkg.label}</Text>
                <Text style={styles.packageDesc}>{pkg.description}</Text>
              </View>
              <View style={styles.packagePrice}>
                <Text style={styles.priceAmount}>
                  {CURRENCY.symbol}{pkg.price.toLocaleString()}
                </Text>
                {isCurrentPkg && (
                  <Text style={styles.activeBadge}>Active</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Benefits */}
        <Text style={styles.sectionTitle}>What You Get</Text>
        <View style={styles.benefitsCard}>
          {[
            'Your profile appears at the top of Discover',
            'A "Featured" badge on your profile card',
            'Higher visibility to new clients in your area',
            'Priority placement above non-featured professionals',
          ].map((benefit, i) => (
            <View key={i} style={styles.benefitRow}>
              <Check size={16} color={COLORS.success} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {purchasing && (
        <View style={styles.purchasingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      <PaymentWebView
        visible={showPayment}
        checkoutUrl={checkoutUrl}
        onSuccess={handlePaymentSuccess}
        onCancel={handlePaymentCancel}
      />
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  statusCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statusTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.white,
  },
  statusSubtext: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  inactiveCard: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  inactiveTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inactiveSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  packageCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  packageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  packageInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  packageLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  packageDesc: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  packagePrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  activeBadge: {
    fontSize: FONT_SIZES.xs - 1,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: 2,
  },
  benefitsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  purchasingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
