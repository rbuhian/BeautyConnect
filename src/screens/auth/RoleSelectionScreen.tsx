import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { User, Briefcase, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthScreenProps } from '../../navigation/types';
import { Card, Loading } from '../../components';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';

export default function RoleSelectionScreen({ navigation }: AuthScreenProps<'RoleSelection'>) {
  const [loading, setLoading] = useState(false);
  const { setRole } = useAuth();

  const handleSelectRole = async (role: 'client' | 'professional') => {
    setLoading(true);

    const result = await setRole(role);

    setLoading(false);

    if (result.success) {
      if (role === 'client') {
        navigation.navigate('ClientOnboarding');
      } else {
        navigation.navigate('ProfessionalOnboarding');
      }
    } else {
      // For development/testing, allow bypass if Supabase isn't configured or database isn't set up
      const errorLower = result.error?.toLowerCase() || '';
      const isDevelopmentError =
        errorLower.includes('invalid api key') ||
        errorLower.includes('fetch') ||
        errorLower.includes('not authenticated') ||
        errorLower.includes('database') ||
        errorLower.includes('relation') ||
        errorLower.includes('does not exist') ||
        errorLower.includes('saving') ||
        errorLower.includes('user');

      if (isDevelopmentError) {
        Alert.alert(
          'Development Mode',
          `Database may not be set up. Proceeding to onboarding for testing.\n\nTo fix: Run supabase/schema.sql in your Supabase SQL Editor.\n\nError: ${result.error}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (role === 'client') {
                  navigation.navigate('ClientOnboarding');
                } else {
                  navigation.navigate('ProfessionalOnboarding');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to set role. Please try again.');
      }
    }
  };

  if (loading) {
    return <Loading fullScreen message="Setting up your account..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>How will you use BeautyConnect?</Text>
        <Text style={styles.subtitle}>
          Choose your role to get started. You can always change this later.
        </Text>

        <View style={styles.options}>
          {/* Client Option */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectRole('client')}
          >
            <Card style={styles.optionCard}>
              <View style={styles.optionIconContainer}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionIcon}
                >
                  <User size={32} color={COLORS.white} />
                </LinearGradient>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>I'm looking for services</Text>
                <Text style={styles.optionDescription}>
                  Book appointments with beauty professionals in your area
                </Text>
              </View>
              <ArrowRight size={24} color={COLORS.textSecondary} />
            </Card>
          </TouchableOpacity>

          {/* Professional Option */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleSelectRole('professional')}
          >
            <Card style={styles.optionCard}>
              <View style={styles.optionIconContainer}>
                <LinearGradient
                  colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.optionIcon}
                >
                  <Briefcase size={32} color={COLORS.white} />
                </LinearGradient>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>I'm a professional</Text>
                <Text style={styles.optionDescription}>
                  Offer your services and grow your beauty business
                </Text>
              </View>
              <ArrowRight size={24} color={COLORS.textSecondary} />
            </Card>
          </TouchableOpacity>
        </View>

        <Text style={styles.noteText}>
          Professionals need an invite code to join during our launch phase
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: 100,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
    lineHeight: 24,
  },
  options: {
    gap: SPACING.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  optionIconContainer: {
    marginRight: SPACING.md,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  optionDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  noteText: {
    marginTop: SPACING.xl,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
