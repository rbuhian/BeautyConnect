import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AlertCircle, WifiOff, ServerCrash, RefreshCw } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES } from '../constants';
import { Button } from './index';

type ErrorType = 'network' | 'server' | 'generic' | 'custom';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

const ERROR_CONFIG: Record<Exclude<ErrorType, 'custom'>, { icon: typeof AlertCircle; title: string; message: string }> = {
  network: {
    icon: WifiOff,
    title: 'No Connection',
    message: 'Please check your internet connection and try again.',
  },
  server: {
    icon: ServerCrash,
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
  },
  generic: {
    icon: AlertCircle,
    title: 'Oops!',
    message: 'Something went wrong. Please try again.',
  },
};

export default function ErrorState({
  type = 'generic',
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
  style,
}: ErrorStateProps) {
  const config = type !== 'custom' ? ERROR_CONFIG[type] : ERROR_CONFIG.generic;
  const Icon = config.icon;
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Icon size={48} color={COLORS.error} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry && (
        <Button
          title={retryLabel}
          onPress={onRetry}
          variant="secondary"
          size="medium"
          style={styles.button}
        />
      )}
    </View>
  );
}

// Inline error banner for forms/sections
interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  style?: ViewStyle;
}

export function ErrorBanner({ message, onDismiss, style }: ErrorBannerProps) {
  return (
    <View style={[styles.banner, style]}>
      <AlertCircle size={18} color={COLORS.error} />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    minHeight: 300,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  button: {
    marginTop: SPACING.lg,
    minWidth: 150,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: SPACING.md,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  bannerText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
  },
});
