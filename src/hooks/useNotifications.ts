import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './useAuth';
import {
  registerForPushNotifications,
  savePushToken,
  deactivatePushToken,
  getUnreadNotificationCount,
  NotificationData,
} from '../services/notifications';

// Dynamic import to prevent crashes
let Notifications: typeof import('expo-notifications') | null = null;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.warn('expo-notifications not available:', error);
}

export function useNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  // Register for push notifications
  const registerPushNotifications = useCallback(async () => {
    if (!user?.id) return;

    const token = await registerForPushNotifications();
    if (token) {
      setExpoPushToken(token);
      await savePushToken(user.id, token);
    }
  }, [user?.id]);

  // Deactivate push token on logout
  const deactivateToken = useCallback(async () => {
    if (!user?.id || !expoPushToken) return;
    await deactivatePushToken(user.id, expoPushToken);
    setExpoPushToken(null);
  }, [user?.id, expoPushToken]);

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    const { count } = await getUnreadNotificationCount(user.id);
    setUnreadCount(count);
  }, [user?.id]);

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = useCallback(
    (response: any) => {
      const data = response?.notification?.request?.content?.data as NotificationData;

      if (!data?.type) return;

      switch (data.type) {
        case 'booking_new':
        case 'booking_confirmed':
        case 'booking_declined':
        case 'booking_cancelled':
        case 'reminder':
          if (data.bookingId) {
            // Navigate to booking detail
            navigation.navigate('BookingDetail', { bookingId: data.bookingId });
          }
          break;

        case 'message':
          if (data.bookingId) {
            // Navigate to chat
            navigation.navigate('Chat', { bookingId: data.bookingId });
          }
          break;

        case 'review_request':
          if (data.bookingId) {
            // Navigate to write review (will need to fetch booking details)
            navigation.navigate('BookingDetail', { bookingId: data.bookingId });
          }
          break;
      }

      // Refresh unread count after handling
      refreshUnreadCount();
    },
    [navigation, refreshUnreadCount]
  );

  // Set up notification listeners
  useEffect(() => {
    if (!user?.id) return;

    // Register for push notifications
    registerPushNotifications();

    // Fetch initial unread count
    refreshUnreadCount();

    // Only set up listeners if Notifications module is available
    if (Notifications) {
      try {
        // Listen for incoming notifications while app is in foreground
        notificationListener.current = Notifications.addNotificationReceivedListener(
          (notification) => {
            // Refresh unread count when notification received
            refreshUnreadCount();
          }
        );

        // Listen for notification responses (user taps notification)
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          handleNotificationResponse
        );
      } catch (error) {
        console.warn('Failed to set up notification listeners:', error);
      }
    }

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (error) {
        console.warn('Failed to remove notification listeners:', error);
      }
    };
  }, [user?.id, registerPushNotifications, refreshUnreadCount, handleNotificationResponse]);

  return {
    expoPushToken,
    unreadCount,
    refreshUnreadCount,
    registerPushNotifications,
    deactivateToken,
  };
}

export default useNotifications;
