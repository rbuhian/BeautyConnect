import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { X } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '../constants';

// These URLs are used as markers — the WebView intercepts them
const SUCCESS_URL = 'https://beautyconnect.app/payment/success';
const CANCEL_URL = 'https://beautyconnect.app/payment/cancel';

interface PaymentWebViewProps {
  visible: boolean;
  checkoutUrl: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentWebView = React.memo(function PaymentWebView({
  visible,
  checkoutUrl,
  onSuccess,
  onCancel,
}: PaymentWebViewProps) {
  const [loading, setLoading] = useState(true);

  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const { url } = navState;

      if (url.startsWith(SUCCESS_URL)) {
        onSuccess();
        return;
      }

      if (url.startsWith(CANCEL_URL)) {
        onCancel();
        return;
      }
    },
    [onSuccess, onCancel]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Complete Payment</Text>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <X size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={styles.webviewContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading payment page...</Text>
            </View>
          )}
          {checkoutUrl ? (
            <WebView
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              style={styles.webview}
              javaScriptEnabled
              domStorageEnabled
              startInLoadingState={false}
            />
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
});

export default PaymentWebView;

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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    zIndex: 1,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
});
