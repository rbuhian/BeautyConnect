import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BookOpen, MessageCircle, User } from 'lucide-react-native';
import { ClientStackParamList, ClientTabParamList } from './types';
import { COLORS } from '../constants';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

// Tab Screens
import HomeScreen from '../screens/client/HomeScreen';
import DiscoverScreen from '../screens/client/DiscoverScreen';
import MessagesScreen from '../screens/client/MessagesScreen';
import ProfileScreen from '../screens/client/ProfileScreen';

// Stack Screens
import ProfessionalProfileScreen from '../screens/client/ProfessionalProfileScreen';
import BookingFlowScreen from '../screens/client/BookingFlowScreen';
import BookingDetailScreen from '../screens/client/BookingDetailScreen';
import BookingsScreen from '../screens/client/BookingsScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import WriteReviewScreen from '../screens/client/WriteReviewScreen';
import GalleryScreen from '../screens/client/GalleryScreen';
import ClientReviewsScreen from '../screens/client/ClientReviewsScreen';
import FavoritesScreen from '../screens/client/FavoritesScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import PaymentsScreen from '../screens/client/PaymentsScreen';

const Tab = createBottomTabNavigator<ClientTabParamList>();
const Stack = createNativeStackNavigator<ClientStackParamList>();

const TAB_BG = '#2D1040';

function ClientTabs() {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useUnreadMessages();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
        tabBarStyle: {
          borderTopWidth: 0,
          paddingTop: 10,
          paddingBottom: 10 + insets.bottom,
          height: 70 + insets.bottom,
          backgroundColor: TAB_BG,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 2,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Book"
        component={DiscoverScreen}
        options={{
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
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
      <Stack.Screen name="Bookings" component={BookingsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="Gallery" component={GalleryScreen} />
      <Stack.Screen name="Reviews" component={ClientReviewsScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
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
