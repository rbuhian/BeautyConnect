import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components';

import AuthNavigator from './AuthNavigator';
import ClientNavigator from './ClientNavigator';
import ProfessionalNavigator from './ProfessionalNavigator';
import AdminNavigator from './AdminNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading, initialized } = useAuth();

  // Show loading until auth is initialized
  if (!initialized || loading) {
    return <Loading fullScreen message="Loading..." />;
  }

  // Determine initial route for incomplete onboarding
  let initialRoute: 'Splash' | 'RoleSelection' | 'ClientOnboarding' | 'ProfessionalOnboarding' = 'Splash';
  const needsOnboarding = user && !user.name;

  if (needsOnboarding) {
    // User has authenticated but hasn't completed onboarding
    // If role is already set (from seed migration), skip to appropriate onboarding
    if (user.role === 'professional') {
      initialRoute = 'ProfessionalOnboarding';
    } else if (user.role === 'client') {
      initialRoute = 'ClientOnboarding';
    } else {
      // No role set yet, show role selection
      initialRoute = 'RoleSelection';
    }
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user || needsOnboarding ? (
          // Not authenticated or needs onboarding - show auth flow
          <Stack.Screen name="Auth">
            {() => <AuthNavigator initialRoute={initialRoute} />}
          </Stack.Screen>
        ) : user.role === 'admin' ? (
          // Authenticated as admin
          <Stack.Screen name="Admin" component={AdminNavigator} />
        ) : user.role === 'professional' ? (
          // Authenticated as professional
          <Stack.Screen name="Professional" component={ProfessionalNavigator} />
        ) : (
          // Authenticated as client (default)
          <Stack.Screen name="Client" component={ClientNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
