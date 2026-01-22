import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  getChatBookingDetails,
  subscribeToMessages,
  startTyping,
  stopTyping,
  subscribeToTypingIndicators,
  MessageWithSender,
} from '../../services/chat';
import { Loading } from '../../components';

interface ChatScreenProps {
  route: {
    params: {
      bookingId: string;
    };
  };
  navigation: any;
}

export default function ChatScreen({ route, navigation }: ChatScreenProps) {
  const { bookingId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [chatDetails, setChatDetails] = useState<{
    booking_id: string;
    service_name: string;
    booking_date: string;
    booking_status: string;
    other_user: {
      id: string;
      name: string;
      avatar: string | null;
    };
  } | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data, error } = await getMessages(bookingId);
      if (data && !error) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const fetchChatDetails = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await getChatBookingDetails(bookingId, user.id);
      if (data && !error) {
        setChatDetails(data);
      }
    } catch (err) {
      console.error('Error fetching chat details:', err);
    }
  }, [bookingId, user?.id]);

  const handleTyping = useCallback(
    async (text: string) => {
      setNewMessage(text);

      if (!user?.id) return;

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send typing indicator
      if (text.length > 0) {
        await startTyping(bookingId, user.id);

        // Set timeout to stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(async () => {
          await stopTyping(bookingId, user.id);
        }, 3000);
      } else {
        // Stop typing if message is empty
        await stopTyping(bookingId, user.id);
      }
    },
    [bookingId, user?.id]
  );

  useEffect(() => {
    fetchMessages();
    fetchChatDetails();
  }, [fetchMessages, fetchChatDetails]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      markMessagesAsRead(bookingId, user.id);
    }
  }, [bookingId, user?.id, messages.length]);

  // Subscribe to real-time messages
  useEffect(() => {
    const unsubscribe = subscribeToMessages(bookingId, (newMsg) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Mark as read if it's from the other user
      if (user?.id && newMsg.sender_id !== user.id) {
        markMessagesAsRead(bookingId, user.id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId, user?.id]);

   // Subscribe to typing indicators
   useEffect(() => {
     const unsubscribe = subscribeToTypingIndicators(bookingId, (typingUserIds) => {
       setTypingUsers(typingUserIds);
       // Check if the other user is typing
       if (chatDetails && typingUserIds.includes(chatDetails.other_user.id)) {
         setOtherUserTyping(true);
       } else {
         setOtherUserTyping(false);
       }
     });

     return () => {
       unsubscribe();
     };
   }, [bookingId, chatDetails?.other_user.id]);

   // Cleanup typing timeout on unmount
   useEffect(() => {
     return () => {
       if (typingTimeoutRef.current) {
         clearTimeout(typingTimeoutRef.current);
       }
       // Stop typing when leaving the screen
       if (user?.id) {
         stopTyping(bookingId, user.id).catch(() => {
           // Silently fail - user is already gone
         });
       }
     };
   }, [bookingId, user?.id]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user?.id || sending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Stop typing indicator when sending
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    await stopTyping(bookingId, user.id);

    try {
      const { data, error } = await sendMessage(bookingId, user.id, messageText);
      if (error) {
        // Restore message if send failed
        setNewMessage(messageText);
        console.error('Error sending message:', error);
      }
    } catch (err) {
      setNewMessage(messageText);
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderMessage = ({ item, index }: { item: MessageWithSender; index: number }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const showDate = index === 0 ||
      formatDate(item.created_at) !== formatDate(messages[index - 1].created_at);

    return (
      <View>
        {showDate && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.messageRow, isOwnMessage && styles.messageRowOwn]}>
          {!isOwnMessage && (
            <View style={styles.messageSenderAvatar}>
              {item.sender?.avatar ? (
                <Image source={{ uri: item.sender.avatar }} style={styles.senderAvatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.senderAvatar}
                >
                  <Text style={styles.senderAvatarText}>
                    {item.sender?.name?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}
            </View>
          )}
          <View style={[styles.messageBubble, isOwnMessage ? styles.ownBubble : styles.otherBubble]}>
            <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
              {item.text}
            </Text>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
              {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading fullScreen message="Loading chat..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {chatDetails?.other_user.avatar ? (
            <Image source={{ uri: chatDetails.other_user.avatar }} style={styles.headerAvatar} />
          ) : (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              style={styles.headerAvatar}
            >
              <Text style={styles.headerAvatarText}>
                {chatDetails?.other_user.name?.[0]?.toUpperCase() || '?'}
              </Text>
            </LinearGradient>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {chatDetails?.other_user.name || 'Loading...'}
            </Text>
            <Text style={styles.headerService} numberOfLines={1}>
              {chatDetails?.service_name || ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSubtext}>Start the conversation!</Text>
            </View>
          }
        />

         {/* Input */}
         <View style={styles.inputContainer}>
           {otherUserTyping && (
             <View style={styles.typingIndicator}>
               <Text style={styles.typingText}>
                 {chatDetails?.other_user.name} is typing
               </Text>
               <View style={styles.typingDots}>
                 <View style={styles.dot} />
                 <View style={styles.dot} />
                 <View style={styles.dot} />
               </View>
             </View>
           )}
           <View style={styles.inputRow}>
             <TextInput
               style={styles.input}
               placeholder="Type a message..."
               placeholderTextColor={COLORS.textSecondary}
               value={newMessage}
               onChangeText={handleTyping}
               multiline
               maxLength={1000}
             />
             <TouchableOpacity
               style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
               onPress={handleSend}
               disabled={!newMessage.trim() || sending}
             >
               {sending ? (
                 <ActivityIndicator size="small" color={COLORS.white} />
               ) : (
                 <Send size={20} color={COLORS.white} />
               )}
             </TouchableOpacity>
           </View>
         </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerAvatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerService: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexGrow: 1,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.chipBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'flex-end',
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageSenderAvatar: {
    marginRight: SPACING.xs,
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderAvatarText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  ownBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: SPACING.xs,
  },
  otherBubble: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: SPACING.xs,
  },
  messageText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  ownMessageText: {
    color: COLORS.white,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyChatText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  emptyChatSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
   inputContainer: {
     flexDirection: 'column',
     paddingHorizontal: SPACING.md,
     paddingVertical: SPACING.sm,
     backgroundColor: COLORS.white,
     borderTopWidth: 1,
     borderTopColor: COLORS.border,
   },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    maxHeight: 100,
    marginRight: SPACING.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
   sendButtonDisabled: {
     backgroundColor: COLORS.textSecondary,
   },
   inputRow: {
     flexDirection: 'row',
     alignItems: 'flex-end',
     flex: 1,
   },
   typingIndicator: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: SPACING.md,
     paddingVertical: SPACING.xs,
     backgroundColor: COLORS.chipBackground,
     borderRadius: RADIUS.lg,
     marginBottom: SPACING.xs,
   },
   typingText: {
     fontSize: FONT_SIZES.sm,
     color: COLORS.textSecondary,
     marginRight: SPACING.sm,
   },
   typingDots: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: SPACING.xs,
   },
   dot: {
     width: 6,
     height: 6,
     borderRadius: 3,
     backgroundColor: COLORS.primary,
     opacity: 0.6,
   },
});
