import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Megaphone, ChevronLeft } from 'lucide-react-native';
import { COLORS, FONT_SIZES, SPACING, RADIUS } from '../../constants';
import { sendAdminAnnouncement } from '../../services/admin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'AdminAnnouncement'>;

export default function AdminAnnouncementScreen({ navigation }: Props) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Empty Message', 'Please type a message before sending.');
      return;
    }
    Alert.alert(
      'Send Announcement',
      'Send this announcement to all users?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            const result = await sendAdminAnnouncement(message.trim());
            setSending(false);
            if (result.error) {
              Alert.alert('Error', result.error.message);
            } else {
              Alert.alert('Sent', 'Announcement sent successfully.', [
                { text: 'OK', onPress: () => { setMessage(''); navigation.goBack(); } },
              ]);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Announcement</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Megaphone size={56} color={COLORS.primary} strokeWidth={1.5} />
          </View>

          {/* Message Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type message..............."
              placeholderTextColor={COLORS.white}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.gradientEnd, '#e8a898']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendButton}
            >
              <Text style={styles.sendButtonText}>
                {sending ? 'Sending...' : 'Send'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.lg,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    width: '100%',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  messageInput: {
    backgroundColor: COLORS.gradientStart,
    minHeight: 160,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.white,
    borderRadius: RADIUS.md,
  },
  sendButton: {
    borderRadius: RADIUS.xxl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    alignItems: 'center',
    minWidth: 160,
  },
  sendButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.white,
  },
});
