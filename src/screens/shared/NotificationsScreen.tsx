import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  Calendar,
  MessageCircle,
  Star,
  Clock,
  XCircle,
  CheckCircle,
  UserPlus,
  CheckCheck,
  Megaphone,
} from 'lucide-react-native';
import { Loading, EmptyState } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { useNotificationContext } from '../../contexts/NotificationContext';
import {
  getNotificationLogs,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationType,
} from '../../services/notifications';
import { supabase } from '../../services/supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';

const NOTIFICATION_ICONS: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  booking_new: { icon: Calendar, color: '#E65100', bg: '#FFF3E0' },
  booking_confirmed: { icon: CheckCircle, color: '#2E7D32', bg: '#E8F5E9' },
  booking_declined: { icon: XCircle, color: '#C62828', bg: '#FFEBEE' },
  booking_cancelled: { icon: XCircle, color: '#C62828', bg: '#FFEBEE' },
  message: { icon: MessageCircle, color: '#1565C0', bg: '#E3F2FD' },
  reminder: { icon: Clock, color: '#F57F17', bg: '#FFFDE7' },
  review_request: { icon: Star, color: '#7B1FA2', bg: '#F3E5F5' },
  staff_assigned: { icon: UserPlus, color: '#00695C', bg: '#E0F2F1' },
  announcement: { icon: Megaphone, color: '#C9A0DC', bg: '#F3E5F5' },
};

interface NotificationLog {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  related_id: string | null;
  data: any;
  sent_at: string;
  read_at: string | null;
}

export default function NotificationsScreen({ navigation }: any) {
  const { user } = useAuth();
  const { refreshUnreadCount } = useNotificationContext();
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data } = await getNotificationLogs(user.id, { limit: 50 });
      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleTapNotification = async (notification: NotificationLog) => {
    // Mark as read if unread
    if (!notification.read_at) {
      markNotificationAsRead(notification.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      refreshUnreadCount();
    }

    const BOOKING_TYPES: NotificationType[] = [
      'booking_new', 'booking_confirmed', 'booking_declined',
      'booking_cancelled', 'reminder', 'review_request', 'staff_assigned',
    ];

    const data = notification.data || {};
    const bookingId = data.bookingId || notification.related_id;

    if (!bookingId) return; // no navigation target

    if (notification.type === 'message') {
      navigation.navigate('Chat', { bookingId });
    } else if (BOOKING_TYPES.includes(notification.type)) {
      // Verify booking exists and is accessible before navigating
      const { data: booking, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('id', bookingId)
        .single();
      if (booking && !error) {
        navigation.navigate('BookingDetail', { bookingId });
      }
    }
    // announcement and unknown types: do nothing (just mark as read above)
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;

    await markAllNotificationsAsRead(user.id);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    refreshUnreadCount();
  };

  const hasUnread = notifications.some((n) => !n.read_at);

  const renderNotification = ({ item }: { item: NotificationLog }) => {
    const config = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.booking_new;
    const Icon = config.icon;
    const isUnread = !item.read_at;
    const timeAgo = item.sent_at
      ? formatDistanceToNow(parseISO(item.sent_at), { addSuffix: true })
      : 'just now';

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.unreadCard]}
        onPress={() => handleTapNotification(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <Icon size={20} color={config.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading fullScreen message="Loading notifications..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread ? (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
            <CheckCheck size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Notification List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            type="custom"
            icon={Bell}
            title="No Notifications"
            message="You're all caught up! Notifications about bookings, messages, and updates will appear here."
          />
        }
        showsVerticalScrollIndicator={false}
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  markAllButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  emptyContainer: {
    flex: 1,
  },
  notificationCard: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  unreadCard: {
    backgroundColor: '#F8F0FF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  notificationBody: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  timeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 4,
  },
});
