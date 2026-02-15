import React, { createContext, useContext } from 'react';
import useNotifications from '../hooks/useNotifications';

interface NotificationContextValue {
  expoPushToken: string | null;
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  registerPushNotifications: () => Promise<void>;
  deactivateToken: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  expoPushToken: null,
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  registerPushNotifications: async () => {},
  deactivateToken: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notifications = useNotifications();

  return (
    <NotificationContext.Provider value={notifications}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}
