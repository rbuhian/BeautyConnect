import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getUnreadMessageCount } from '../services/chat';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

// Polling interval in milliseconds (10 seconds)
const POLLING_INTERVAL = 10000;

/**
 * Hook to track unread message count for the current user.
 * Automatically updates when new messages arrive or messages are read.
 * Uses both real-time subscriptions and polling for reliability.
 */
export function useUnreadMessages() {
  const { user, professionalProfile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    const { count } = await getUnreadMessageCount(
      user.id,
      professionalProfile?.id
    );
    setUnreadCount(count);
  }, [user?.id, professionalProfile?.id]);

  useEffect(() => {
    // Fetch initial count
    fetchUnreadCount();

    if (!user?.id) return;

    // Set up polling as primary mechanism for reliability
    pollingRef.current = setInterval(() => {
      fetchUnreadCount();
    }, POLLING_INTERVAL);

    // Also try real-time subscription as bonus
    const channelName = `unread-messages-${user.id}`;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Also refetch when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchUnreadCount();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      subscription.remove();
    };
  }, [user?.id, professionalProfile?.id, fetchUnreadCount]);

  return {
    unreadCount,
    refetch: fetchUnreadCount,
  };
}
