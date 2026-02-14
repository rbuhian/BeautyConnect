import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Calendar, MessageCircle, User } from 'lucide-react-native';
import { ClientStackParamList, ClientTabParamList } from './types';
import { COLORS } from '../constants';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

// Tab Screens (will be created later)
import DiscoverScreen from '../screens/client/DiscoverScreen';
import BookingsScreen from '../screens/client/BookingsScreen';
import MessagesScreen from '../screens/client/MessagesScreen';
import ProfileScreen from '../screens/client/ProfileScreen';

// Stack Screens (will be created later)
import ProfessionalProfileScreen from '../screens/client/ProfessionalProfileScreen';
import BookingFlowScreen from '../screens/client/BookingFlowScreen';
import BookingDetailScreen from '../screens/client/BookingDetailScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import WriteReviewScreen from '../screens/client/WriteReviewScreen';
import ClientReviewsScreen from '../screens/client/ClientReviewsScreen';
import FavoritesScreen from '../screens/client/FavoritesScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator<ClientStackParamList>();

function ClientTabs() {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadMessages();

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
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: styles.badge,
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

export default function ClientNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="ProfessionalProfile" component={ProfessionalProfileScreen} />
      <Stack.Screen name="BookingFlow" component={BookingFlowScreen as any} />
      <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="Reviews" component={ClientReviewsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.error,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 18,
    height: 18,
  },
});
