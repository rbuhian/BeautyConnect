import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';

// Screens (will be created later)
import SplashScreen from '../screens/auth/SplashScreen';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import ClientOnboardingScreen from '../screens/auth/ClientOnboardingScreen';
import ProfessionalOnboardingScreen from '../screens/auth/ProfessionalOnboardingScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="ClientOnboarding" component={ClientOnboardingScreen} />
      <Stack.Screen name="ProfessionalOnboarding" component={ProfessionalOnboardingScreen} />
    </Stack.Navigator>
  );
}
