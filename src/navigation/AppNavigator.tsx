import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/theme';
import HomeScreen from '../screens/HomeScreen';
import SessionsScreen from '../screens/SessionsScreen';
import AddSessionScreen from '../screens/AddSessionScreen';
import SessionDetailScreen from '../screens/SessionDetailScreen';
import AnalysisScreen from '../screens/AnalysisScreen';
import EquipmentScreen from '../screens/EquipmentScreen';
import AddEquipmentScreen from '../screens/AddEquipmentScreen';
import ScanTargetScreen from '../screens/ScanTargetScreen';

export type RootTabParamList = {
  HomeTab: undefined;
  SessionsTab: undefined;
  AnalysisTab: undefined;
  EquipmentTab: undefined;
};

export type SessionsStackParamList = {
  SessionsList: undefined;
  AddSession: { sessionId?: number };
  SessionDetail: { sessionId: number };
  ScanTarget: { sessionId: number; distanceM: number; caliber?: string };
};

export type EquipmentStackParamList = {
  EquipmentList: undefined;
  AddEquipment: Record<string, never>;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const SessionsStack = createNativeStackNavigator<SessionsStackParamList>();
const EquipmentStack = createNativeStackNavigator<EquipmentStackParamList>();

const HEADER_OPTS = {
  headerStyle: { backgroundColor: COLORS.card },
  headerTintColor: COLORS.text,
  headerTitleStyle: { color: COLORS.text },
};

function SessionsNavigator() {
  return (
    <SessionsStack.Navigator screenOptions={HEADER_OPTS}>
      <SessionsStack.Screen
        name="SessionsList"
        component={SessionsScreen}
        options={{ title: 'Sessions' }}
      />
      <SessionsStack.Screen
        name="AddSession"
        component={AddSessionScreen}
        options={{ title: 'New Session' }}
      />
      <SessionsStack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Session Detail' }}
      />
      <SessionsStack.Screen
        name="ScanTarget"
        component={ScanTargetScreen}
        options={{ title: 'Scan Target' }}
      />
    </SessionsStack.Navigator>
  );
}

function EquipmentNavigator() {
  return (
    <EquipmentStack.Navigator screenOptions={HEADER_OPTS}>
      <EquipmentStack.Screen
        name="EquipmentList"
        component={EquipmentScreen}
        options={{ title: 'Equipment' }}
      />
      <EquipmentStack.Screen
        name="AddEquipment"
        component={AddEquipmentScreen}
        options={{ title: 'Add Firearm' }}
      />
    </EquipmentStack.Navigator>
  );
}

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home-outline',
  SessionsTab: 'list-outline',
  AnalysisTab: 'bar-chart-outline',
  EquipmentTab: 'construct-outline',
};

const TAB_ICONS_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  HomeTab: 'home',
  SessionsTab: 'list',
  AnalysisTab: 'bar-chart',
  EquipmentTab: 'construct',
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarIcon: ({ focused, color, size }) => {
          const name = focused
            ? TAB_ICONS_ACTIVE[route.name]
            : TAB_ICONS[route.name];
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          headerShown: true,
          ...HEADER_OPTS,
          headerTitle: 'Groupr',
        }}
      />
      <Tab.Screen
        name="SessionsTab"
        component={SessionsNavigator}
        options={{ title: 'Sessions' }}
      />
      <Tab.Screen
        name="AnalysisTab"
        component={AnalysisScreen}
        options={{
          title: 'Analysis',
          headerShown: true,
          ...HEADER_OPTS,
        }}
      />
      <Tab.Screen
        name="EquipmentTab"
        component={EquipmentNavigator}
        options={{ title: 'Equipment' }}
      />
    </Tab.Navigator>
  );
}
