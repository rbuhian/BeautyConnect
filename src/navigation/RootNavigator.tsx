import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../hooks/useAuth';
import { Loading } from '../components';

import AuthNavigator from './AuthNavigator';
import ClientNavigator from './ClientNavigator';
import ProfessionalNavigator from './ProfessionalNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, loading, initialized } = useAuth();

  // Show loading until auth is initialized
  if (!initialized || loading) {
    return <Loading fullScreen message="Loading..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // Not authenticated - show auth flow
          <Stack.Screen name="Auth" component={AuthNavigator} />
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
