import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  Calendar,
  Heart,
  MessageCircle,
  Star,
  Search,
  Briefcase,
  Clock,
  Users,
  LucideIcon,
} from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../constants';
import { Button } from './index';

type EmptyStateType =
  | 'bookings'
  | 'favorites'
  | 'messages'
  | 'reviews'
  | 'search'
  | 'services'
  | 'history'
  | 'professionals'
  | 'custom';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  message?: string;
  description?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

const EMPTY_STATE_CONFIG: Record<
  Exclude<EmptyStateType, 'custom'>,
  { icon: LucideIcon; title: string; message: string }
> = {
  bookings: {
    icon: Calendar,
    title: 'No Bookings Yet',
    message: 'Your upcoming appointments will appear here. Browse professionals to book your first service!',
  },
  favorites: {
    icon: Heart,
    title: 'No Favorites Yet',
    message: 'Save your favorite professionals by tapping the heart icon on their profile.',
  },
  messages: {
    icon: MessageCircle,
    title: 'No Messages',
    message: 'Start a conversation by booking a service or messaging a professional.',
  },
  reviews: {
    icon: Star,
    title: 'No Reviews Yet',
    message: 'Reviews from clients will appear here once you complete bookings.',
  },
  search: {
    icon: Search,
    title: 'No Results Found',
    message: 'Try adjusting your search or filters to find what you\'re looking for.',
  },
  services: {
    icon: Briefcase,
    title: 'No Services Added',
    message: 'Add your services to let clients know what you offer and start receiving bookings.',
  },
  history: {
    icon: Clock,
    title: 'No Past Bookings',
    message: 'Your completed appointments will appear here.',
  },
  professionals: {
    icon: Users,
    title: 'No Professionals Found',
    message: 'Try adjusting your filters or check back later for new professionals in your area.',
  },
};

export default function EmptyState({
  type = 'custom',
  title,
  message,
  description,
  icon: CustomIcon,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const config = type !== 'custom' ? EMPTY_STATE_CONFIG[type] : null;
  const Icon = CustomIcon || config?.icon || Search;
  const displayTitle = title || config?.title || 'Nothing Here';
  const displayMessage = message || description || config?.message || 'No items to display.';

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Icon size={48} color={COLORS.textLight} strokeWidth={1.5} />
      </View>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="medium"
          style={styles.button}
        />
      )}
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
    backgroundColor: COLORS.chipBackground,
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
    minWidth: 180,
  },
});
