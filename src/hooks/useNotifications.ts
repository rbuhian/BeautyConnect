import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
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

/**
 * Set up Android notification channels.
 * Must be called before any notification is sent on Android.
 */
async function setupNotificationChannels() {
  if (Platform.OS !== 'android' || !Notifications) return;

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A0DC',
    });

    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Bookings',
      description: 'Booking confirmations, cancellations, and reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A0DC',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      description: 'New chat messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#C9A0DC',
      sound: 'default',
    });
  } catch (error) {
    console.warn('Failed to set up notification channels:', error);
  }
}

export function useNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const channelsSetUp = useRef(false);

  // Register for push notifications
  const registerPushNotifications = useCallback(async () => {
    if (!user?.id) return;

    // Set up Android channels once
    if (!channelsSetUp.current) {
      await setupNotificationChannels();
      channelsSetUp.current = true;
    }

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
        case 'staff_assigned':
          if (data.bookingId) {
            navigation.navigate('BookingDetail', { bookingId: data.bookingId });
          }
          break;

        case 'message':
          if (data.bookingId) {
            navigation.navigate('Chat', { bookingId: data.bookingId });
          }
          break;

        case 'review_request':
          if (data.bookingId) {
            navigation.navigate('BookingDetail', { bookingId: data.bookingId });
          }
          break;
      }

      // Refresh unread count after handling
      refreshUnreadCount();
    },
    [navigation, refreshUnreadCount]
  );

  // Check if app was opened via notification (cold start)
  useEffect(() => {
    if (!user?.id || !Notifications) return;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationResponse(response);
      }
    });
  }, [user?.id, handleNotificationResponse]);

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
          (_notification) => {
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
