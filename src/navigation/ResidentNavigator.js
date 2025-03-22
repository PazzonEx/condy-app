// src/navigation/ResidentNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Importar telas
import ResidentHomeScreen from '../screens/resident/ResidentHomeScreen';
import NewAccessRequestScreen from '../screens/resident/NewAccessRequestScreen';
import AccessHistoryScreen from '../screens/resident/AccessHistoryScreen';
import ResidentProfileScreen from '../screens/resident/ResidentProfileScreen';
import AccessDetailsScreen from '../screens/resident/AccessDetailsScreen';
import ResidentSettingsScreen from '../screens/resident/ResidentSettingsScreen';
import ResidentNotificationsScreen from '../screens/resident/ResidentNotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack para cada aba
const HomeStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="ResidentHome" component={ResidentHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ResidentNotifications" component={ResidentNotificationsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="NewAccessRequest" component={NewAccessRequestScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AccessDetails" component={AccessDetailsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

const HistoryStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="AccessHistory" component={AccessHistoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AccessDetails" component={AccessDetailsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

const ProfileStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="Profile" component={ResidentProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Settings" component={ResidentSettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

// Navegador principal (Tab Navigator)
const ResidentNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'history' : 'history';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Importante: desativa o cabeçalho do Tab Navigator
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="History" component={HistoryStack} options={{ tabBarLabel: 'Histórico' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
};

export default ResidentNavigator;