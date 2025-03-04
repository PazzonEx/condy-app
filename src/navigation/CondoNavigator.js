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

// Criar navegadores
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const RequestsStack = createStackNavigator();
const ResidentsStack = createStackNavigator();
const SettingsStack = createStackNavigator();


// Stack para a aba Home
const HomeStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <HomeStack.Navigator
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
      <HomeStack.Screen 
        name="CondoHome" 
        component={CondoHomeScreen} 
        options={{ title: 'Portaria' }}
      />
      <HomeStack.Screen 
        name="CondoQRScanner" 
        component={CondoQRScannerScreen} 
        options={{ title: 'Escanear QR Code' }}
      />
      <HomeStack.Screen 
        name="CondoAccessDetails" 
        component={CondoAccessDetailsScreen} 
        options={{ title: 'Detalhes do Acesso' }}
      />
      <HomeStack.Screen 
        name="CondoDashboard" 
        component={CondoDashboardScreen} 
        options={{ title: 'Dashboard' }}
      />
      <HomeStack.Screen 
        name="CondoReport" 
        component={CondoReportScreen} 
        options={{ title: 'Relatório Detalhado' }}
      />
      <HomeStack.Screen 
        name="CondoSubscription" 
        component={CondoSubscriptionScreen} 
        options={{ title: 'Planos e Assinaturas' }}
      />
       <HomeStack.Screen 
      name="CondoProfile" 
      component={CondoProfileScreen} 
      options={{ title: 'Perfil do Condomínio' }}
    />
    
<HomeStack.Screen 
  name="CondoSubscriptionPassword" 
  component={CondoSubscriptionPasswordScreen} 
  options={{ title: 'Senha de Administrador' }} 
/>
    </HomeStack.Navigator>
  );
};

// Stack para a aba Solicitações
const RequestsStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <RequestsStack.Navigator
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
      <RequestsStack.Screen 
        name="CondoRequests" 
        component={CondoRequestsScreen} 
        options={{ title: 'Solicitações' }}
      />
       <RequestsStack.Screen 
        name="CondoQRScanner" 
        component={CondoQRScannerScreen} 
        options={{ title: 'Escanear QR Code' }}
      />
      <RequestsStack.Screen 
        name="CondoAccessDetails" 
        component={CondoAccessDetailsScreen} 
        options={{ title: 'Detalhes do Acesso' }}
      />
    </RequestsStack.Navigator>
  );
};

// Stack para a aba Moradores
const ResidentsStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <ResidentsStack.Navigator
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
      <ResidentsStack.Screen 
        name="CondoResidents" 
        component={CondoResidentsScreen} 
        options={{ title: 'Moradores' }}
      />
    </ResidentsStack.Navigator>
  );
};

// Stack para a aba Configurações
const SettingsStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <SettingsStack.Navigator
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
      <SettingsStack.Screen 
        name="CondoSettings" 
        component={CondoSettingsScreen} 
        options={{ title: 'Configurações' }}
      />
      <SettingsStack.Screen 
        name="CondoSubscription" 
        component={CondoSubscriptionScreen} 
        options={{ title: 'Planos e Assinaturas' }}
      />
      
      <SettingsStack.Screen 
      name="CondoProfile" 
      component={CondoProfileScreen} 
      options={{ title: 'Perfil do Condomínio' }}
    />
            
        <SettingsStack.Screen 
          name="CondoSubscriptionPassword" 
          component={CondoSubscriptionPasswordScreen} 
          options={{ title: 'Senha de Administrador' }} 
        />
    </SettingsStack.Navigator>
  );
};

// Navegador principal para condomínios (Tab Navigator)
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
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator} 
        options={{ tabBarLabel: 'Portaria' }}
      />
      <Tab.Screen 
        name="Requests" 
        component={RequestsStackNavigator} 
        options={{ tabBarLabel: 'Solicitações' }}
      />
      <Tab.Screen 
        name="Residents" 
        component={ResidentsStackNavigator} 
        options={{ tabBarLabel: 'Moradores' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStackNavigator} 
        options={{ tabBarLabel: 'Configurações' }}
      />
    </Tab.Navigator>
  );
};

export default CondoNavigator;