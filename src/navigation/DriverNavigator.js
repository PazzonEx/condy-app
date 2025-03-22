// src/navigation/DriverNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Importar telas
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import DriverAccessDetailsScreen from '../screens/driver/DriverAccessDetailsScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';
import DriverSettingsScreen from '../screens/driver/DriverSettingsScreen';
import DriverCondoSearchScreen from '../screens/driver/DriverCondoSearchScreen';
import DriverQRCodeScreen from '../screens/driver/DriverQRCodeScreen';
import SubscriptionPlansScreen from '../screens/shared/SubscriptionPlansScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack para aba Home (Solicitações)
const HomeStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      
    >
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ headerShown: false }} />
      <Stack.Screen 
        name="DriverSubscription" 
        component={SubscriptionPlansScreen} 
        initialParams={{ userType: 'driver' }}
        options={{ title: 'Planos para Motoristas' }}
      />
      <Stack.Screen name="DriverAccessDetails" component={DriverAccessDetailsScreen} options={{ title: 'Detalhes do Acesso' }} />
    </Stack.Navigator>
  );
};

// Stack para aba Busca de Condomínios
const SearchStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
     
    >
      <Stack.Screen name="DriverCondoSearch" component={DriverCondoSearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DriverQRCode" component={DriverQRCodeScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

// Stack para aba Perfil
const ProfileStack = () => {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
     
    >
      <Stack.Screen name="DriverProfile" component={DriverProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="DriverSettings" component={DriverSettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

// Navegador principal para motoristas (Tab Navigator)
const DriverNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'Search':
              iconName = focused ? 'office-building-marker' : 'office-building';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Importante: desativa o cabeçalho do Tab Navigator
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Solicitações' }} />
      <Tab.Screen name="Search" component={SearchStack} options={{ tabBarLabel: 'Buscar Condomínio' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
};

export default DriverNavigator;