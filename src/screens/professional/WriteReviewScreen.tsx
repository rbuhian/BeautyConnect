import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send } from 'lucide-react-native';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { StarRating, Card } from '../../components';
import { useAuth } from '../../hooks/useAuth';
import { submitReview } from '../../services/review';

const RATING_DESCRIPTIONS = [
  '',
  'Poor - Issues with client behavior',
  'Fair - Below average client experience',
  'Good - Met expectations',
  'Very Good - Great client to work with',
  'Excellent - Outstanding client!',
];

export default function WriteReviewScreen({ navigation, route }: any) {
  const { bookingId, serviceName, clientId, clientName, clientAvatar } =
    route.params;
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to submit a review');
      return;
    }

    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await submitReview(
        bookingId,
        user.id,
        clientId,
        rating,
        reviewText,
        serviceName
      );

      if (error) {
        Alert.alert('Error', error.message || 'Failed to submit review');
        return;
      }

      Alert.alert(
        'Thank You!',
        'Your review has been submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Error submitting review:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = rating > 0 && !submitting;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Client</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Client Info */}
          <Card style={styles.clientCard}>
            <View style={styles.clientInfo}>
              {clientAvatar ? (
                <Image source={{ uri: clientAvatar }} style={styles.clientAvatar} />
              ) : (
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  style={styles.clientAvatar}
                >
                  <Text style={styles.clientInitial}>
                    {clientName?.[0]?.toUpperCase() || '?'}
                  </Text>
                </LinearGradient>
              )}
              <View style={styles.clientDetails}>
                <Text style={styles.clientName}>{clientName || 'Client'}</Text>
                <Text style={styles.serviceName}>{serviceName || 'Service'}</Text>
              </View>
            </View>
          </Card>

          {/* Rating Section */}
          <Card style={styles.ratingCard}>
            <Text style={styles.sectionTitle}>Rate your client experience</Text>
            <Text style={styles.sectionSubtitle}>
              Consider punctuality, communication, and professionalism
            </Text>

            <View style={styles.starsContainer}>
              <StarRating
                rating={rating}
                size={40}
                editable
                onChange={setRating}
                spacing={SPACING.sm}
              />
            </View>

            {rating > 0 && (
              <View style={styles.ratingDescription}>
                <Text style={styles.ratingDescriptionText}>
                  {RATING_DESCRIPTIONS[rating]}
                </Text>
              </View>
            )}
          </Card>

          {/* Review Text Section */}
          <Card style={styles.reviewCard}>
            <Text style={styles.sectionTitle}>Share your experience (optional)</Text>
            <Text style={styles.sectionSubtitle}>
              Help other professionals by describing your client interaction
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="How was the client's punctuality? Communication? Overall professionalism?"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={reviewText}
              onChangeText={setReviewText}
              maxLength={500}
            />

            <Text style={styles.charCount}>
              {reviewText.length}/500 characters
            </Text>
          </Card>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <LinearGradient
              colors={
                canSubmit
                  ? [COLORS.gradientStart, COLORS.gradientEnd]
                  : [COLORS.border, COLORS.border]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              <Send size={18} color={COLORS.white} />
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Guidelines */}
          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>Review Guidelines</Text>
            <Text style={styles.guidelinesText}>
              {'\u2022'} Be honest and professional{'\n'}
              {'\u2022'} Focus on client behavior and communication{'\n'}
              {'\u2022'} Avoid personal attacks or inappropriate language{'\n'}
              {'\u2022'} Reviews are mutual and build trust in the platform
            </Text>
          </View>
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
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.chipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  clientCard: {
    padding: SPACING.md,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  clientInitial: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.white,
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  serviceName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
  },
  ratingCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  starsContainer: {
    paddingVertical: SPACING.md,
  },
  ratingDescription: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
  },
  ratingDescriptionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  reviewCard: {
    padding: SPACING.lg,
  },
  textInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    minHeight: 120,
    marginBottom: SPACING.sm,
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  submitButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.white,
  },
  guidelines: {
    padding: SPACING.md,
    backgroundColor: COLORS.chipBackground,
    borderRadius: RADIUS.md,
  },
  guidelinesTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  guidelinesText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
