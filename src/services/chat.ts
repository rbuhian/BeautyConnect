import { supabase } from './supabase';
import { Message } from '../types';

export interface ConversationPreview {
  booking_id: string;
  other_user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  service_name: string;
  booking_date: string;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number;
}

export interface MessageWithSender extends Omit<Message, 'sender'> {
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

/**
 * Get all conversations (bookings with messages) for a user
 */
export async function getConversations(userId: string, professionalProfileId?: string): Promise<{ data: ConversationPreview[] | null; error: Error | null }> {
  try {
    // Build the OR condition based on user type
    // - For clients: check client_id = userId
    // - For professionals: check professional_id = professionalProfileId (not userId!)
    let orCondition = `client_id.eq.${userId}`;
    if (professionalProfileId) {
      orCondition += `,professional_id.eq.${professionalProfileId}`;
    }

    // Get all bookings where user is either client or professional
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        client_id,
        professional_id,
        service:services(name),
        client:users!bookings_client_id_fkey(id, name, avatar),
        professional:professional_profiles!bookings_professional_id_fkey(
          id,
          user:users(id, name, avatar)
        )
      `)
      .or(orCondition)
      .in('status', ['pending', 'confirmed', 'completed'])
      .order('created_at', { ascending: false });

    if (bookingsError) throw bookingsError;
    if (!bookings || bookings.length === 0) {
      return { data: [], error: null };
    }

    // Get messages for each booking to find last message and unread count
    const conversations: ConversationPreview[] = [];

    for (const booking of bookings) {
      // Get last message
      const { data: lastMessageData } = await supabase
        .from('messages')
        .select('text, created_at')
        .eq('booking_id', booking.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('booking_id', booking.id)
        .neq('sender_id', userId)
        .is('read_at', null);

      // Determine other user (if current user is client, show professional and vice versa)
      // Check both client_id and professional_id to determine role
      const isClient = booking.client_id === userId;
      const isProfessional = professionalProfileId && booking.professional_id === professionalProfileId;

      const otherUser = isClient && !isProfessional
        ? {
            id: (booking.professional as any)?.user?.id || '',
            name: (booking.professional as any)?.user?.name || 'Professional',
            avatar: (booking.professional as any)?.user?.avatar || null,
          }
        : {
            id: (booking.client as any)?.id || '',
            name: (booking.client as any)?.name || 'Client',
            avatar: (booking.client as any)?.avatar || null,
          };

      conversations.push({
        booking_id: booking.id,
        other_user: otherUser,
        service_name: (booking.service as any)?.name || 'Service',
        booking_date: booking.date,
        last_message: lastMessageData?.text || null,
        last_message_time: lastMessageData?.created_at || null,
        unread_count: unreadCount || 0,
      });
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      if (!a.last_message_time && !b.last_message_time) return 0;
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

    return { data: conversations, error: null };
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all messages for a booking
 */
export async function getMessages(bookingId: string): Promise<{ data: MessageWithSender[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, avatar)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { data: data as MessageWithSender[], error: null };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Send a new message
 */
export async function sendMessage(
  bookingId: string,
  senderId: string,
  text: string
): Promise<{ data: MessageWithSender | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        booking_id: bookingId,
        sender_id: senderId,
        text: text.trim(),
      })
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, avatar)
      `)
      .single();

    if (error) throw error;

    return { data: data as MessageWithSender, error: null };
  } catch (error) {
    console.error('Error sending message:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(
  bookingId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('booking_id', bookingId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return { error: error as Error };
  }
}

/**
 * Get booking details for chat header
 */
export async function getChatBookingDetails(bookingId: string, currentUserId: string): Promise<{
  data: {
    booking_id: string;
    service_name: string;
    booking_date: string;
    booking_status: string;
    other_user: {
      id: string;
      name: string;
      avatar: string | null;
    };
  } | null;
  error: Error | null;
}> {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        date,
        status,
        client_id,
        professional_id,
        service:services(name),
        client:users!bookings_client_id_fkey(id, name, avatar),
        professional:professional_profiles!bookings_professional_id_fkey(
          user:users(id, name, avatar)
        )
      `)
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    if (!booking) throw new Error('Booking not found');

    const isClient = booking.client_id === currentUserId;
    const otherUser = isClient
      ? {
          id: (booking.professional as any)?.user?.id || '',
          name: (booking.professional as any)?.user?.name || 'Professional',
          avatar: (booking.professional as any)?.user?.avatar || null,
        }
      : {
          id: (booking.client as any)?.id || '',
          name: (booking.client as any)?.name || 'Client',
          avatar: (booking.client as any)?.avatar || null,
        };

    return {
      data: {
        booking_id: booking.id,
        service_name: (booking.service as any)?.name || 'Service',
        booking_date: booking.date,
        booking_status: booking.status,
        other_user: otherUser,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error fetching chat booking details:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Subscribe to new messages for a booking (real-time)
 */
export function subscribeToMessages(
  bookingId: string,
  onNewMessage: (message: MessageWithSender) => void
) {
  const channel = supabase
    .channel(`messages:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      },
      async (payload) => {
        // Fetch the complete message with sender info
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey(id, name, avatar)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onNewMessage(data as MessageWithSender);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get total unread message count for a user
 */
export async function getUnreadMessageCount(userId: string, professionalProfileId?: string): Promise<{ count: number; error: Error | null }> {
  try {
    // Build the OR condition based on user type
    let orCondition = `client_id.eq.${userId}`;
    if (professionalProfileId) {
      orCondition += `,professional_id.eq.${professionalProfileId}`;
    }

    // First get all bookings for this user
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id')
      .or(orCondition);

    if (bookingsError) throw bookingsError;
    if (!bookings || bookings.length === 0) {
      return { count: 0, error: null };
    }

    const bookingIds = bookings.map(b => b.id);

    // Count unread messages across all bookings
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('booking_id', bookingIds)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Start typing indicator
 */
export async function startTyping(
  bookingId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    // First, try to insert
    const { error: insertError } = await supabase
      .from('typing_indicators')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        expires_at: new Date(Date.now() + 30 * 1000).toISOString(), // 30 seconds from now
      })
      .select()
      .single();

    if (insertError && insertError.code !== '23505') {
      // 23505 is unique constraint violation - that's okay, user is already typing
      throw insertError;
    }

    // If unique constraint violation, update the existing record
    if (insertError?.code === '23505') {
      const { error: updateError } = await supabase
        .from('typing_indicators')
        .update({
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 1000).toISOString(),
        })
        .eq('booking_id', bookingId)
        .eq('user_id', userId);

      if (updateError) throw updateError;
    }

    return { error: null };
  } catch (error) {
    console.error('Error starting typing indicator:', error);
    return { error: error as Error };
  }
}

/**
 * Stop typing indicator
 */
export async function stopTyping(
  bookingId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('typing_indicators')
      .delete()
      .eq('booking_id', bookingId)
      .eq('user_id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error stopping typing indicator:', error);
    return { error: error as Error };
  }
}

/**
 * Get who is currently typing in a booking
 */
export async function getTypingUsers(bookingId: string): Promise<{
  data: Array<{
    user_id: string;
    started_at: string;
    expires_at: string;
  }> | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('typing_indicators')
      .select('user_id, started_at, expires_at')
      .eq('booking_id', bookingId)
      .gt('expires_at', new Date().toISOString()); // Only get non-expired indicators

    if (error) throw error;

    return { data: data as any[], error: null };
  } catch (error) {
    console.error('Error fetching typing users:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Subscribe to typing indicator changes
 */
export function subscribeToTypingIndicators(
  bookingId: string,
  onTypingChange: (typingUsers: string[]) => void
) {
  const channel = supabase
    .channel(`typing:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'typing_indicators',
        filter: `booking_id=eq.${bookingId}`,
      },
      async (payload) => {
        // Get current list of typing users
        const { data } = await getTypingUsers(bookingId);
        const typingUserIds = data?.map((u) => u.user_id) || [];
        onTypingChange(typingUserIds);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

