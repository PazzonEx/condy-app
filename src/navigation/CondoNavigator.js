// src/navigation/CondoNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Importar telas
import CondoHomeScreen from '../screens/condo/CondoHomeScreen';
import CondoRequestsScreen from '../screens/condo/CondoRequestsScreen';
import CondoResidentsScreen from '../screens/condo/CondoResidentsScreen';
import CondoSettingsScreen from '../screens/condo/CondoSettingsScreen';
import CondoQRScannerScreen from '../screens/condo/CondoQRScannerScreen';
import CondoAccessDetailsScreen from '../screens/condo/CondoAccessDetailsScreen';
import CondoSubscriptionScreen from '../screens/condo/CondoSubscriptionScreen';
import CondoDashboardScreen from '../screens/condo/CondoDashboardScreen';
import CondoReportScreen from '../screens/condo/CondoReportScreen';
import CondoProfileScreen from '../screens/condo/CondoProfileScreen';
import CondoSubscriptionPasswordScreen from '../screens/condo/CondoSubscriptionPasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack para a aba Home (Portaria)
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
      <Stack.Screen name="CondoHome" component={CondoHomeScreen} options={{ title: 'Portaria' }} />
      <Stack.Screen name="CondoQRScanner" component={CondoQRScannerScreen} options={{ title: 'Escanear QR Code' }} />
      <Stack.Screen name="CondoAccessDetails" component={CondoAccessDetailsScreen} options={{ title: 'Detalhes do Acesso' }} />
      <Stack.Screen name="CondoDashboard" component={CondoDashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="CondoReport" component={CondoReportScreen} options={{ title: 'Relatório Detalhado' }} />
      <Stack.Screen name="CondoSubscription" component={CondoSubscriptionScreen} options={{ title: 'Planos e Assinaturas' }} />
      <Stack.Screen name="CondoProfile" component={CondoProfileScreen} options={{ title: 'Perfil do Condomínio' }} />
      <Stack.Screen name="CondoSubscriptionPassword" component={CondoSubscriptionPasswordScreen} options={{ title: 'Senha de Administrador' }} />
    </Stack.Navigator>
  );
};

// Stack para a aba Solicitações
const RequestsStack = () => {
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
      <Stack.Screen name="CondoRequests" component={CondoRequestsScreen} options={{ title: 'Solicitações' }} />
      <Stack.Screen name="CondoQRScanner" component={CondoQRScannerScreen} options={{ title: 'Escanear QR Code' }} />
      <Stack.Screen name="CondoAccessDetails" component={CondoAccessDetailsScreen} options={{ title: 'Detalhes do Acesso' }} />
    </Stack.Navigator>
  );
};

// Stack para a aba Moradores
const ResidentsStack = () => {
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
      <Stack.Screen name="CondoResidents" component={CondoResidentsScreen} options={{ title: 'Moradores' }} />
    </Stack.Navigator>
  );
};

// Stack para a aba Configurações
const SettingsStack = () => {
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
      <Stack.Screen name="CondoSettings" component={CondoSettingsScreen} options={{ title: 'Configurações' }} />
      <Stack.Screen name="CondoSubscription" component={CondoSubscriptionScreen} options={{ title: 'Planos e Assinaturas' }} />
      <Stack.Screen name="CondoProfile" component={CondoProfileScreen} options={{ title: 'Perfil do Condomínio' }} />
      <Stack.Screen name="CondoSubscriptionPassword" component={CondoSubscriptionPasswordScreen} options={{ title: 'Senha de Administrador' }} />
    </Stack.Navigator>
  );
};

// Navegador principal para condomínios
const CondoNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Requests':
              iconName = focused ? 'clipboard-list' : 'clipboard-list-outline';
              break;
            case 'Residents':
              iconName = focused ? 'account-group' : 'account-group-outline';
              break;
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false, // Desativa o header no Tab Navigator
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ tabBarLabel: 'Portaria' }} />
      <Tab.Screen name="Requests" component={RequestsStack} options={{ tabBarLabel: 'Solicitações' }} />
      <Tab.Screen name="Residents" component={ResidentsStack} options={{ tabBarLabel: 'Moradores' }} />
      <Tab.Screen name="Settings" component={SettingsStack} options={{ tabBarLabel: 'Configurações' }} />
    </Tab.Navigator>
  );
};

export default CondoNavigator;