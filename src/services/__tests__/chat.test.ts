import {
  getConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getChatBookingDetails,
  subscribeToMessages,
  getUnreadMessageCount,
  startTyping,
  stopTyping,
  getTypingUsers,
  subscribeToTypingIndicators,
  type MessageWithSender,
} from '../chat';
import { supabase } from '../supabase';

jest.mock('../supabase');

describe('Chat Service', () => {
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  const mockUserId = 'user-123';
  const mockBookingId = 'booking-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversations', () => {
    it('should return an empty array when no bookings exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      } as any);

      const result = await getConversations(mockUserId);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error');
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
            }),
          }),
        }),
      } as any);

      const result = await getConversations(mockUserId);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('getMessages', () => {
    it('should fetch messages for a booking', async () => {
      const mockMessages: MessageWithSender[] = [
        {
          id: 'msg-1',
          booking_id: mockBookingId,
          sender_id: mockUserId,
          text: 'Hello',
          created_at: '2026-01-22T14:00:00Z',
          read_at: null,
          sender: {
            id: mockUserId,
            name: 'Maria',
            avatar: null,
          },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockMessages, error: null }),
          }),
        }),
      } as any);

      const result = await getMessages(mockBookingId);

      expect(result.data).toEqual(mockMessages);
      expect(result.error).toBeNull();
    });

    it('should return empty array when no messages exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any);

      const result = await getMessages(mockBookingId);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Query failed');
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      } as any);

      const result = await getMessages(mockBookingId);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const messageText = 'Hello, how are you?';
      const mockMessage = {
        id: 'msg-123',
        booking_id: mockBookingId,
        sender_id: mockUserId,
        text: messageText,
        created_at: '2026-01-22T14:00:00Z',
        read_at: null,
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMessage, error: null }),
          }),
        }),
      } as any);

      const result = await sendMessage(mockBookingId, mockUserId, messageText);

      expect(result.data).toEqual(mockMessage);
      expect(result.error).toBeNull();
    });

    it('should trim message text before sending', async () => {
      const messageText = '  Hello  ';
      const mockMessage = {
        id: 'msg-123',
        booking_id: mockBookingId,
        sender_id: mockUserId,
        text: 'Hello',
        created_at: '2026-01-22T14:00:00Z',
        read_at: null,
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockMessage, error: null }),
          }),
        }),
      } as any);

      const result = await sendMessage(mockBookingId, mockUserId, messageText);

      expect(result.data?.text).toBe('Hello');
    });

    it('should handle send errors', async () => {
      const mockError = new Error('Send failed');
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: mockError }),
          }),
        }),
      } as any);

      const result = await sendMessage(mockBookingId, mockUserId, 'Hello');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark messages as read', async () => {
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnValue({
              is: jest.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as any);

      const result = await markMessagesAsRead(mockBookingId, mockUserId);

      expect(result.error).toBeNull();
    });

    it('should handle read status update errors', async () => {
      const mockError = new Error('Update failed');
      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            neq: jest.fn().mockReturnValue({
              is: jest.fn().mockResolvedValue({ error: mockError }),
            }),
          }),
        }),
      } as any);

      const result = await markMessagesAsRead(mockBookingId, mockUserId);

      expect(result.error).toBeTruthy();
    });
  });

  describe('getChatBookingDetails', () => {
    it('should return booking details for chat header', async () => {
      const mockBooking = {
        id: mockBookingId,
        date: '2026-02-15',
        status: 'confirmed',
        client_id: mockUserId,
        professional_id: 'prof-789',
        service: { name: 'Makeup' },
        client: { id: mockUserId, name: 'Maria', avatar: null },
        professional: {
          user: { id: 'prof-789', name: 'Bella', avatar: null },
        },
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockBooking, error: null }),
          }),
        }),
      } as any);

      const result = await getChatBookingDetails(mockBookingId, mockUserId);

      expect(result.error).toBeNull();
      expect(result.data?.booking_id).toBe(mockBookingId);
      expect(result.data?.service_name).toBe('Makeup');
    });

    it('should handle booking not found error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      } as any);

      const result = await getChatBookingDetails(mockBookingId, mockUserId);

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('subscribeToMessages', () => {
    it('should set up a real-time subscription', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };

      mockSupabase.channel.mockReturnValue(mockChannel as any);
      mockSupabase.removeChannel = jest.fn();

      const onNewMessage = jest.fn();
      const unsubscribe = subscribeToMessages(mockBookingId, onNewMessage);

      expect(mockSupabase.channel).toHaveBeenCalledWith(`messages:${mockBookingId}`);
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from messages', () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn().mockReturnThis(),
      };

      mockSupabase.channel.mockReturnValue(mockChannel as any);
      mockSupabase.removeChannel = jest.fn();

      const onNewMessage = jest.fn();
      const unsubscribe = subscribeToMessages(mockBookingId, onNewMessage);
      unsubscribe();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should return total unread message count', async () => {
      const mockBookings = [{ id: 'booking-1' }, { id: 'booking-2' }];

      let callCount = 0;
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'bookings') {
          return {
            select: jest.fn().mockReturnValue({
              or: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
            }),
          } as any;
        }

        // messages table
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              neq: jest.fn().mockReturnValue({
                is: jest.fn().mockResolvedValue({ count: 5, error: null }),
              }),
            }),
          }),
        } as any;
      });

      const result = await getUnreadMessageCount(mockUserId);

      expect(result.count).toBe(5);
      expect(result.error).toBeNull();
    });

    it('should return 0 when no bookings exist', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any);

      const result = await getUnreadMessageCount(mockUserId);

      expect(result.count).toBe(0);
      expect(result.error).toBeNull();
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database error');
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          or: jest.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      } as any);

      const result = await getUnreadMessageCount(mockUserId);

      expect(result.count).toBe(0);
     expect(result.error).toBeTruthy();
     });
   });

   describe('startTyping', () => {
     it('should start typing indicator', async () => {
       mockSupabase.from.mockReturnValue({
         insert: jest.fn().mockReturnValue({
           select: jest.fn().mockReturnValue({
             single: jest.fn().mockResolvedValue({ error: null }),
           }),
         }),
       } as any);

       const result = await startTyping(mockBookingId, mockUserId);

       expect(result.error).toBeNull();
     });

     it('should handle typing start errors', async () => {
       const mockError = new Error('Insert failed');
       mockSupabase.from.mockReturnValue({
         insert: jest.fn().mockReturnValue({
           select: jest.fn().mockReturnValue({
             single: jest.fn().mockResolvedValue({ error: mockError }),
           }),
         }),
       } as any);

       const result = await startTyping(mockBookingId, mockUserId);

       expect(result.error).toBeTruthy();
     });
   });

   describe('stopTyping', () => {
     it('should stop typing indicator', async () => {
       mockSupabase.from.mockReturnValue({
         delete: jest.fn().mockReturnValue({
           eq: jest.fn().mockReturnValue({
             eq: jest.fn().mockResolvedValue({ error: null }),
           }),
         }),
       } as any);

       const result = await stopTyping(mockBookingId, mockUserId);

       expect(result.error).toBeNull();
     });

     it('should handle stop typing errors', async () => {
       const mockError = new Error('Delete failed');
       mockSupabase.from.mockReturnValue({
         delete: jest.fn().mockReturnValue({
           eq: jest.fn().mockReturnValue({
             eq: jest.fn().mockResolvedValue({ error: mockError }),
           }),
         }),
       } as any);

       const result = await stopTyping(mockBookingId, mockUserId);

       expect(result.error).toBeTruthy();
     });
   });

   describe('getTypingUsers', () => {
     it('should return list of typing users', async () => {
       const mockTypingUsers = [
         {
           id: 'typing-1',
           user_id: 'user-1',
           booking_id: mockBookingId,
           started_at: '2026-01-22T14:00:00Z',
           expires_at: '2026-01-22T14:00:30Z',
         },
         {
           id: 'typing-2',
           user_id: 'user-2',
           booking_id: mockBookingId,
           started_at: '2026-01-22T14:00:05Z',
           expires_at: '2026-01-22T14:00:35Z',
         },
       ];

       mockSupabase.from.mockReturnValue({
         select: jest.fn().mockReturnValue({
           eq: jest.fn().mockReturnValue({
             gt: jest.fn().mockResolvedValue({ data: mockTypingUsers, error: null }),
           }),
         }),
       } as any);

       const result = await getTypingUsers(mockBookingId);

       expect(result.data).toEqual(mockTypingUsers);
       expect(result.error).toBeNull();
     });

     it('should return empty array when no one is typing', async () => {
       mockSupabase.from.mockReturnValue({
         select: jest.fn().mockReturnValue({
           eq: jest.fn().mockReturnValue({
             gt: jest.fn().mockResolvedValue({ data: [], error: null }),
           }),
         }),
       } as any);

       const result = await getTypingUsers(mockBookingId);

       expect(result.data).toEqual([]);
       expect(result.error).toBeNull();
     });

     it('should handle typing users fetch errors', async () => {
       const mockError = new Error('Fetch failed');
       mockSupabase.from.mockReturnValue({
         select: jest.fn().mockReturnValue({
           eq: jest.fn().mockReturnValue({
             gt: jest.fn().mockResolvedValue({ data: null, error: mockError }),
           }),
         }),
       } as any);

       const result = await getTypingUsers(mockBookingId);

       expect(result.data).toBeNull();
       expect(result.error).toBeTruthy();
     });
   });

   describe('subscribeToTypingIndicators', () => {
     it('should set up real-time typing subscription', () => {
       const mockChannel = {
         on: jest.fn().mockReturnThis(),
         subscribe: jest.fn().mockReturnThis(),
       };

       mockSupabase.channel.mockReturnValue(mockChannel as any);
       mockSupabase.removeChannel = jest.fn();

       const onTypingChange = jest.fn();
       const unsubscribe = subscribeToTypingIndicators(mockBookingId, onTypingChange);

       expect(mockSupabase.channel).toHaveBeenCalledWith(`typing:${mockBookingId}`);
       expect(mockChannel.on).toHaveBeenCalled();
       expect(mockChannel.subscribe).toHaveBeenCalled();
       expect(typeof unsubscribe).toBe('function');
     });

     it('should unsubscribe from typing indicators', () => {
       const mockChannel = {
         on: jest.fn().mockReturnThis(),
         subscribe: jest.fn().mockReturnThis(),
       };

       mockSupabase.channel.mockReturnValue(mockChannel as any);
       mockSupabase.removeChannel = jest.fn();

       const onTypingChange = jest.fn();
       const unsubscribe = subscribeToTypingIndicators(mockBookingId, onTypingChange);
       unsubscribe();

       expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
     });
   });
});
