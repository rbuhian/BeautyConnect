import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, MessageCircle, User } from 'lucide-react-native';
import { ProfessionalStackParamList, ProfessionalTabParamList } from './types';
import { COLORS } from '../constants';

// Tab Screens (will be created later)
import DashboardScreen from '../screens/professional/DashboardScreen';
import CalendarScreen from '../screens/professional/CalendarScreen';
import MessagesScreen from '../screens/professional/MessagesScreen';
import ProfileScreen from '../screens/professional/ProfileScreen';

// Stack Screens (will be created later)
import BookingDetailScreen from '../screens/professional/BookingDetailScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import ManageServicesScreen from '../screens/professional/ManageServicesScreen';
import AddServiceScreen from '../screens/professional/AddServiceScreen';
import EditServiceScreen from '../screens/professional/EditServiceScreen';
import AvailabilityScreen from '../screens/professional/AvailabilityScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const Tab = createBottomTabNavigator<ProfessionalTabParamList>();
const Stack = createNativeStackNavigator<ProfessionalStackParamList>();

function ProfessionalTabs() {
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
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function ProfessionalNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfessionalTabs" component={ProfessionalTabs} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ManageServices" component={ManageServicesScreen} />
      <Stack.Screen name="AddService" component={AddServiceScreen} />
      <Stack.Screen name="EditService" component={EditServiceScreen} />
      <Stack.Screen name="Availability" component={AvailabilityScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
