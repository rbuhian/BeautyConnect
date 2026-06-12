import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';

import SplashScreen from '../screens/auth/SplashScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import ClientOnboardingScreen from '../screens/auth/ClientOnboardingScreen';
import ProfessionalOnboardingScreen from '../screens/auth/ProfessionalOnboardingScreen';
import EmailInputScreen from '../screens/auth/EmailInputScreen';
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordOtpScreen from '../screens/auth/ResetPasswordOtpScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

interface AuthNavigatorProps {
  initialRoute?: keyof AuthStackParamList;
}

export default function AuthNavigator({ initialRoute = 'Splash' }: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="ClientOnboarding" component={ClientOnboardingScreen} />
      <Stack.Screen name="ProfessionalOnboarding" component={ProfessionalOnboardingScreen} />
      <Stack.Screen name="EmailInput" component={EmailInputScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPasswordOtp" component={ResetPasswordOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
