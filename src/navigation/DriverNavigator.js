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

// Criar navegadores
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const SearchStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Stack para a aba Home (Solicitações)
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
        name="DriverHome" 
        component={DriverHomeScreen} 
        options={{ title: 'Solicitações' }}
      />
      <HomeStack.Screen 
        name="DriverAccessDetails" 
        component={DriverAccessDetailsScreen} 
        options={{ title: 'Detalhes do Acesso' }}
      />
    </HomeStack.Navigator>
  );
};

// Stack para a aba Busca de Condomínios
const SearchStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <SearchStack.Navigator
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
      <SearchStack.Screen 
        name="DriverCondoSearch" 
        component={DriverCondoSearchScreen} 
        options={{ title: 'Buscar Condomínio' }}
      />
      <SearchStack.Screen 
        name="DriverQRCode" 
        component={DriverQRCodeScreen} 
        options={{ title: 'Gerar QR Code' }}
      />
    </SearchStack.Navigator>
  );
};

// Stack para a aba Perfil
const ProfileStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <ProfileStack.Navigator
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
      <ProfileStack.Screen 
        name="DriverProfile" 
        component={DriverProfileScreen} 
        options={{ title: 'Meu Perfil' }}
      />
      <ProfileStack.Screen 
        name="DriverSettings" 
        component={DriverSettingsScreen} 
        options={{ title: 'Configurações' }}
      />
    </ProfileStack.Navigator>
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
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator} 
        options={{ tabBarLabel: 'Solicitações' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchStackNavigator} 
        options={{ tabBarLabel: 'Buscar Condomínio' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator} 
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};

export default DriverNavigator;