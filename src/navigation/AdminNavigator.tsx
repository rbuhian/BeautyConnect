import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, Megaphone, Package, Star } from 'lucide-react-native';
import { AdminStackParamList, AdminTabParamList } from './types';
import { COLORS } from '../constants';

// Tab Screens
import AdsDashboardScreen from '../screens/admin/AdsDashboardScreen';
import ManageAdsScreen from '../screens/admin/ManageAdsScreen';
import ManageAffiliatesScreen from '../screens/admin/ManageAffiliatesScreen';
import FeaturedListingsScreen from '../screens/admin/FeaturedListingsScreen';

// Stack Screens
import AdFormScreen from '../screens/admin/AdFormScreen';
import AffiliateFormScreen from '../screens/admin/AffiliateFormScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          paddingTop: 10,
          paddingBottom: 10 + insets.bottom,
          height: 70 + insets.bottom,
          backgroundColor: COLORS.white,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
          elevation: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Overview"
        component={AdsDashboardScreen as any}
        options={{
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Ads"
        component={ManageAdsScreen as any}
        options={{
          tabBarIcon: ({ color, size }) => <Megaphone size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Affiliates"
        component={ManageAffiliatesScreen as any}
        options={{
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Featured"
        component={FeaturedListingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="AdForm" component={AdFormScreen} />
      <Stack.Screen name="AffiliateForm" component={AffiliateFormScreen} />
    </Stack.Navigator>
  );
}
