import React from 'react';
import { StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calendar, MessageCircle, User } from 'lucide-react-native';
import { ProfessionalStackParamList, ProfessionalTabParamList } from './types';
import { COLORS } from '../constants';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

// Tab Screens (will be created later)
import DashboardScreen from '../screens/professional/DashboardScreen';
import CalendarScreen from '../screens/professional/CalendarScreen';
import MessagesScreen from '../screens/professional/MessagesScreen';
import ProfileScreen from '../screens/professional/ProfileScreen';

// Stack Screens (will be created later)
import BookingDetailScreen from '../screens/professional/BookingDetailScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import WriteReviewScreen from '../screens/professional/WriteReviewScreen';
import ProfessionalReviewsScreen from '../screens/professional/ProfessionalReviewsScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import ManageServicesScreen from '../screens/professional/ManageServicesScreen';
import AddServiceScreen from '../screens/professional/AddServiceScreen';
import EditServiceScreen from '../screens/professional/EditServiceScreen';
import AvailabilityScreen from '../screens/professional/AvailabilityScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';
import StaffListScreen from '../screens/professional/StaffListScreen';
import AddStaffScreen from '../screens/professional/AddStaffScreen';
import EditStaffScreen from '../screens/professional/EditStaffScreen';
import StaffAvailabilityScreen from '../screens/professional/StaffAvailabilityScreen';
import StaffBookingsScreen from '../screens/professional/StaffBookingsScreen';
import BoostProfileScreen from '../screens/professional/BoostProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import PaymentsScreen from '../screens/professional/PaymentsScreen';
import ManagePackagesScreen from '../screens/professional/ManagePackagesScreen';
import CreatePackageScreen from '../screens/professional/CreatePackageScreen';
import ManagePromotionsScreen from '../screens/professional/ManagePromotionsScreen';
import CreatePromotionScreen from '../screens/professional/CreatePromotionScreen';
import ClientManagementScreen from '../screens/professional/ClientManagementScreen';
import RevenueAnalyticsScreen from '../screens/professional/RevenueAnalyticsScreen';
import SchedulingRulesScreen from '../screens/professional/SchedulingRulesScreen';
import VerificationScreen from '../screens/professional/VerificationScreen';

const Tab = createBottomTabNavigator<ProfessionalTabParamList>();
const Stack = createNativeStackNavigator<ProfessionalStackParamList>();

function ProfessionalTabs() {
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
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} />
      <Stack.Screen name="Reviews" component={ProfessionalReviewsScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="ManageServices" component={ManageServicesScreen} />
      <Stack.Screen name="AddService" component={AddServiceScreen} />
      <Stack.Screen name="EditService" component={EditServiceScreen} />
      <Stack.Screen name="Availability" component={AvailabilityScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="StaffList" component={StaffListScreen} />
      <Stack.Screen name="AddStaff" component={AddStaffScreen} />
      <Stack.Screen name="EditStaff" component={EditStaffScreen} />
      <Stack.Screen name="StaffAvailability" component={StaffAvailabilityScreen} />
      <Stack.Screen name="StaffBookings" component={StaffBookingsScreen} />
      <Stack.Screen name="BoostProfile" component={BoostProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Payments" component={PaymentsScreen} />
      <Stack.Screen name="ManagePackages" component={ManagePackagesScreen} />
      <Stack.Screen name="CreatePackage" component={CreatePackageScreen} />
      <Stack.Screen name="ManagePromotions" component={ManagePromotionsScreen} />
      <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} />
      <Stack.Screen name="ClientManagement" component={ClientManagementScreen} />
      <Stack.Screen name="RevenueAnalytics" component={RevenueAnalyticsScreen} />
      <Stack.Screen name="SchedulingRules" component={SchedulingRulesScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
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
