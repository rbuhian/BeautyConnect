import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart3, Wallet, Users } from 'lucide-react-native';
import { AdminStackParamList, AdminTabParamList } from './types';
import { COLORS } from '../constants';

// Tab Screens
import AdsDashboardScreen from '../screens/admin/AdsDashboardScreen';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';

// Stack Screens
import AdminManagePromotionsScreen from '../screens/admin/AdminManagePromotionsScreen';
import AdminCreatePromotionScreen from '../screens/admin/AdminCreatePromotionScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminProfessionalDetailScreen from '../screens/admin/AdminProfessionalDetailScreen';
import AdminClientDetailScreen from '../screens/admin/AdminClientDetailScreen';
import AdminVerificationDetailScreen from '../screens/admin/AdminVerificationDetailScreen';
import AdminReportDetailScreen from '../screens/admin/AdminReportDetailScreen';
import AdminAnnouncementScreen from '../screens/admin/AdminAnnouncementScreen';
import AdminManageAccountsScreen from '../screens/admin/AdminManageAccountsScreen';

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: { display: 'none' },
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
        name="Payments"
        component={AdminPaymentsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Users"
        component={AdminUsersScreen as any}
        options={{
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
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
      <Stack.Screen name="AdminManagePromotions" component={AdminManagePromotionsScreen} />
      <Stack.Screen name="AdminCreatePromotion" component={AdminCreatePromotionScreen} />
      <Stack.Screen name="AdminProfessionalDetail" component={AdminProfessionalDetailScreen} />
      <Stack.Screen name="AdminClientDetail" component={AdminClientDetailScreen} />
      <Stack.Screen name="AdminVerificationDetail" component={AdminVerificationDetailScreen} />
      <Stack.Screen name="AdminReportDetail" component={AdminReportDetailScreen} />
      <Stack.Screen name="AdminAnnouncement" component={AdminAnnouncementScreen} />
      <Stack.Screen name="AdminManageAccounts" component={AdminManageAccountsScreen} />
    </Stack.Navigator>
  );
}
