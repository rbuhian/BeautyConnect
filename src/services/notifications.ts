import { Platform } from 'react-native';
import { supabase } from './supabase';

// Dynamic imports to prevent crashes if modules aren't available
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let Constants: typeof import('expo-constants').default | null = null;

// Initialize modules safely
try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;
} catch (error) {
  console.warn('Failed to load notification modules:', error);
}

// Notification types
export type NotificationType =
  | 'booking_new'
  | 'booking_confirmed'
  | 'booking_declined'
  | 'booking_cancelled'
  | 'message'
  | 'reminder'
  | 'review_request'
  | 'staff_assigned'
  | 'announcement';

export interface NotificationData {
  type: NotificationType;
  bookingId?: string;
  messageId?: string;
  senderId?: string;
  professionalId?: string;
}

// Configure notification handler (wrapped in try-catch for safety)
try {
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  console.warn('Failed to set notification handler:', error);
}

/**
 * Register for push notifications and get the token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Check if modules are available
  if (!Notifications || !Device) {
    console.log('Notification modules not available');
    return null;
  }

  // Check if it's a physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get the Expo push token
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save push token to database
 */
export async function savePushToken(
  userId: string,
  token: string
): Promise<{ error: Error | null }> {
  try {
    const platform = Platform.OS as 'ios' | 'android' | 'web';
    const deviceName = Device?.deviceName || `${Device?.brand ?? ''} ${Device?.modelName ?? ''}`;

    // Upsert the token (update if exists, insert if not)
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          token,
          platform,
          device_name: deviceName,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,token',
        }
      );

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error saving push token:', error);
    return { error: error as Error };
  }
}

/**
 * Deactivate push token (on logout)
 */
export async function deactivatePushToken(
  userId: string,
  token: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('token', token);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deactivating push token:', error);
    return { error: error as Error };
  }
}

/**
 * Get active push tokens for a user
 */
export async function getUserPushTokens(
  userId: string
): Promise<{ data: string[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;
    return { data: data?.map((t) => t.token) || [], error: null };
  } catch (error) {
    console.error('Error getting push tokens:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: NotificationData,
  trigger?: any
): Promise<string | null> {
  if (!Notifications) {
    console.log('Notifications module not available');
    return null;
  }

  try {
    // Build notification config
    const notificationConfig: Parameters<typeof Notifications.scheduleNotificationAsync>[0] = {
      content: {
        title,
        body,
        data: data as any,
        sound: true,
      },
      trigger: null,
    };

    // Only include trigger for scheduled notifications
    // For immediate notifications, omit trigger entirely (newer SDK requirement)
    if (trigger && typeof trigger === 'object' && trigger.type) {
      notificationConfig.trigger = trigger;
    }
    // If no valid trigger, notification fires immediately (trigger property omitted)

    const id = await Notifications.scheduleNotificationAsync(notificationConfig);
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  if (!Notifications) return 0;
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Error getting badge count:', error);
    return 0;
  }
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
}

/**
 * Log notification to database
 */
export async function logNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  relatedId?: string,
  data?: any
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.from('notification_logs').insert({
      user_id: userId,
      title,
      body,
      type,
      related_id: relatedId,
      data,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error logging notification:', error);
    return { error: error as Error };
  }
}

/**
 * Get notification logs for a user
 */
export async function getNotificationLogs(
  userId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('notification_logs')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    if (options?.unreadOnly) {
      query = query.is('read_at', null);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting notification logs:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { error: error as Error };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { error: error as Error };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(
  userId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { count, error } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error getting unread count:', error);
    return { count: 0, error: error as Error };
  }
}

// ============================================
// Notification Content Helpers
// ============================================

export const NotificationMessages = {
  // Booking notifications
  newBooking: (clientName: string, serviceName: string, date: string) => ({
    title: 'New Booking Request',
    body: `${clientName} has requested ${serviceName} on ${date}`,
  }),

  bookingConfirmed: (professionalName: string, serviceName: string, date: string) => ({
    title: 'Booking Confirmed',
    body: `${professionalName} has confirmed your ${serviceName} appointment on ${date}`,
  }),

  bookingDeclined: (professionalName: string, serviceName: string) => ({
    title: 'Booking Declined',
    body: `${professionalName} was unable to accept your ${serviceName} booking. Your deposit will be refunded.`,
  }),

  bookingCancelled: (cancelledBy: string, serviceName: string, date: string) => ({
    title: 'Booking Cancelled',
    body: `${cancelledBy} has cancelled the ${serviceName} appointment on ${date}`,
  }),

  // Message notifications
  newMessage: (senderName: string) => ({
    title: 'New Message',
    body: `${senderName} sent you a message`,
  }),

  // Reminder notifications
  bookingReminder: (serviceName: string, professionalName: string, time: string) => ({
    title: 'Appointment Tomorrow',
    body: `Reminder: ${serviceName} with ${professionalName} at ${time} tomorrow`,
  }),

  // Review notifications
  reviewRequest: (professionalName: string, serviceName: string) => ({
    title: 'How was your appointment?',
    body: `Rate your ${serviceName} experience with ${professionalName}`,
  }),

  // Staff notifications
  staffAssigned: (clientName: string, serviceName: string, date: string) => ({
    title: 'New Booking Assigned',
    body: `You've been assigned to ${clientName}'s ${serviceName} appointment on ${date}`,
  }),
};

// ============================================
// Expo Push API — Send real push notifications
// ============================================

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

/**
 * Send a push notification to a user's devices via Expo Push API.
 * Looks up their active push tokens from the database and delivers
 * the notification even when the app is closed/backgrounded.
 */
async function sendPushToUser(
  recipientUserId: string,
  title: string,
  body: string,
  data?: NotificationData,
  channelId: string = 'default'
): Promise<void> {
  try {
    const { data: tokens } = await getUserPushTokens(recipientUserId);

    if (!tokens || tokens.length === 0) {
      // User has no registered devices — skip silently
      return;
    }

    const messages = tokens.map((token) => ({
      to: token,
      title,
      body,
      data: data as any,
      sound: 'default' as const,
      channelId,
      priority: 'high' as const,
    }));

    // Expo Push API accepts batches of up to 100 messages
    const response = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.warn('Expo Push API error:', response.status, await response.text());
    }
  } catch (error) {
    // Fire-and-forget — don't let push failures break the app flow
    console.warn('Failed to send push notification:', error);
  }
}

// ============================================
// Send Notification Helpers
// ============================================

/**
 * Send notification for new booking (to professional)
 */
export async function sendNewBookingNotification(
  professionalUserId: string,
  clientName: string,
  serviceName: string,
  date: string,
  bookingId: string
): Promise<void> {
  const { title, body } = NotificationMessages.newBooking(clientName, serviceName, date);
  const data: NotificationData = { type: 'booking_new', bookingId };

  // Log to DB + send push to recipient's devices + local notification
  await Promise.all([
    logNotification(professionalUserId, title, body, 'booking_new', bookingId),
    sendPushToUser(professionalUserId, title, body, data, 'bookings'),
    scheduleLocalNotification(title, body, data),
  ]);
}

/**
 * Send notification for booking confirmed (to client)
 */
export async function sendBookingConfirmedNotification(
  clientUserId: string,
  professionalName: string,
  serviceName: string,
  date: string,
  bookingId: string
): Promise<void> {
  const { title, body } = NotificationMessages.bookingConfirmed(professionalName, serviceName, date);
  const data: NotificationData = { type: 'booking_confirmed', bookingId };

  await Promise.all([
    logNotification(clientUserId, title, body, 'booking_confirmed', bookingId),
    sendPushToUser(clientUserId, title, body, data, 'bookings'),
    scheduleLocalNotification(title, body, data),
  ]);
}

/**
 * Send notification for booking declined (to client)
 */
export async function sendBookingDeclinedNotification(
  clientUserId: string,
  professionalName: string,
  serviceName: string,
  bookingId: string
): Promise<void> {
  const { title, body } = NotificationMessages.bookingDeclined(professionalName, serviceName);
  const data: NotificationData = { type: 'booking_declined', bookingId };

  await Promise.all([
    logNotification(clientUserId, title, body, 'booking_declined', bookingId),
    sendPushToUser(clientUserId, title, body, data, 'bookings'),
    scheduleLocalNotification(title, body, data),
  ]);
}

/**
 * Send notification for booking cancelled (to other party)
 */
export async function sendBookingCancelledNotification(
  recipientUserId: string,
  cancelledByName: string,
  serviceName: string,
  date: string,
  bookingId: string
): Promise<void> {
  const { title, body } = NotificationMessages.bookingCancelled(cancelledByName, serviceName, date);
  const data: NotificationData = { type: 'booking_cancelled', bookingId };

  await Promise.all([
    logNotification(recipientUserId, title, body, 'booking_cancelled', bookingId),
    sendPushToUser(recipientUserId, title, body, data, 'bookings'),
    scheduleLocalNotification(title, body, data),
  ]);
}

/**
 * Send notification for new message
 */
export async function sendNewMessageNotification(
  recipientUserId: string,
  senderName: string,
  bookingId: string,
  messageId?: string
): Promise<void> {
  const { title, body } = NotificationMessages.newMessage(senderName);
  const data: NotificationData = { type: 'message', bookingId, messageId };

  await Promise.all([
    logNotification(recipientUserId, title, body, 'message', bookingId),
    sendPushToUser(recipientUserId, title, body, data, 'messages'),
    scheduleLocalNotification(title, body, data),
  ]);
}

/**
 * Schedule reminder notification (24 hours before appointment)
 */
export async function scheduleBookingReminder(
  userId: string,
  serviceName: string,
  otherPartyName: string,
  bookingDate: Date,
  bookingTime: string,
  bookingId: string
): Promise<string | null> {
  const { title, body } = NotificationMessages.bookingReminder(serviceName, otherPartyName, bookingTime);

  // Schedule for 24 hours before
  const reminderDate = new Date(bookingDate);
  reminderDate.setDate(reminderDate.getDate() - 1);

  // Only schedule if reminder time is in the future
  if (reminderDate <= new Date()) {
    return null;
  }

  const notificationId = await scheduleLocalNotification(
    title,
    body,
    { type: 'reminder', bookingId },
    { type: 'date', date: reminderDate }
  );

  if (notificationId) {
    await logNotification(userId, title, body, 'reminder', bookingId);
  }

  return notificationId;
}

/**
 * Send review request notification (after booking completed)
 */
export async function sendReviewRequestNotification(
  clientUserId: string,
  professionalName: string,
  serviceName: string,
  bookingId: string
): Promise<void> {
  const { title, body } = NotificationMessages.reviewRequest(professionalName, serviceName);
  const data: NotificationData = { type: 'review_request', bookingId };

  await Promise.all([
    logNotification(clientUserId, title, body, 'review_request', bookingId),
    sendPushToUser(clientUserId, title, body, data, 'bookings'),
    scheduleLocalNotification(title, body, data),
  ]);
}

/**
 * Send announcement notification to ALL users (admin broadcast)
 */
export async function sendAnnouncementToAllUsers(message: string): Promise<void> {
  const title = 'Announcement';

  try {
    // 1. Fetch all active push tokens + their user IDs
    const { data: tokenRows, error: tokenError } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .eq('is_active', true);

    if (!tokenError && tokenRows && tokenRows.length > 0) {
      // Send push notifications in batches of 100
      const messages = tokenRows.map((row: any) => ({
        to: row.token,
        title,
        body: message,
        sound: 'default' as const,
        channelId: 'default',
        priority: 'high' as const,
      }));

      for (let i = 0; i < messages.length; i += 100) {
        const batch = messages.slice(i, i + 100);
        await fetch(EXPO_PUSH_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(batch),
        }).catch(() => { /* fire-and-forget */ });
      }
    }

    // 2. Log the announcement to notification_logs for every user
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .neq('role', 'admin');

    if (users && users.length > 0) {
      const logs = users.map((u: any) => ({
        user_id: u.id,
        title,
        body: message,
        type: 'announcement',
      }));

      // Insert in batches of 100
      for (let i = 0; i < logs.length; i += 100) {
        await supabase.from('notification_logs').insert(logs.slice(i, i + 100));
      }
    }
  } catch (err) {
    console.warn('Failed to send announcement notifications:', err);
  }
}

/**
 * Send notification to staff member when assigned to a booking
 */
export async function sendStaffAssignedNotification(
  staffUserId: string,
  clientName: string,
  serviceName: string,
  date: string,
  bookingId: string
): Promise<void> {
  const { title, body } = NotificationMessages.staffAssigned(clientName, serviceName, date);
  const data: NotificationData = { type: 'staff_assigned', bookingId };

  await Promise.all([
    logNotification(staffUserId, title, body, 'staff_assigned', bookingId),
    sendPushToUser(staffUserId, title, body, data, 'bookings'),
    scheduleLocalNotification(title, body, data),
  ]);
}
