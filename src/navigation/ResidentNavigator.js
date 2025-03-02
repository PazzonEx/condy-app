import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Importar telas de residentes
// Nota: Essas telas serão criadas posteriormente
import ResidentHomeScreen from '../screens/resident/ResidentHomeScreen';
import NewAccessRequestScreen from '../screens/resident/NewAccessRequestScreen';
import AccessHistoryScreen from '../screens/resident/AccessHistoryScreen';
import ResidentProfileScreen from '../screens/resident/ResidentProfileScreen';
import AccessDetailsScreen from '../screens/resident/AccessDetailsScreen';
import ResidentSettingsScreen from '../screens/resident/ResidentSettingsScreen';

import ResidentNotificationsScreen from '../screens/resident/ResidentNotificationsScreen';


// Criar navegadores
const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const HistoryStack = createStackNavigator();
const ProfileStack = createStackNavigator();

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
        name="ResidentHome" 
        component={ResidentHomeScreen} 
        options={{ title: 'Início' }}
      />
      <HomeStack.Screen 
          name="ResidentNotifications" 
          component={ResidentNotificationsScreen} 
          options={{ title: 'Access Requests' }}
        />
      <HomeStack.Screen 
        name="NewAccessRequest" 
        component={NewAccessRequestScreen} 
        options={{ title: 'Nova Solicitação' }}
      />
      <HomeStack.Screen 
        name="AccessDetails" 
        component={AccessDetailsScreen} 
        options={{ title: 'Detalhes do Acesso' }}
      />
    </HomeStack.Navigator>
  );
};

// Stack para a aba Histórico
const HistoryStackNavigator = () => {
  const theme = useTheme();
  
  return (
    <HistoryStack.Navigator
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
      <HistoryStack.Screen 
        name="AccessHistory" 
        component={AccessHistoryScreen} 
        options={{ title: 'Histórico' }}
      />
      <HistoryStack.Screen 
        name="AccessDetails" 
        component={AccessDetailsScreen} 
        options={{ title: 'Detalhes do Acesso' }}
      />
    </HistoryStack.Navigator>
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
        name="Profile" 
        component={ResidentProfileScreen} 
        options={{ title: 'Meu Perfil' }}
      />
      <ProfileStack.Screen 
        name="Settings" 
        component={ResidentSettingsScreen} 
        options={{ title: 'Meu Perfil' }}
      />
    </ProfileStack.Navigator>
  );
};

// Navegador principal para residentes (Tab Navigator)
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
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator} 
        options={{ tabBarLabel: 'Início' }}
      />
      
      
      <Tab.Screen 
        name="History" 
        component={HistoryStackNavigator} 
        options={{ tabBarLabel: 'Histórico' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStackNavigator} 
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
};

export default ResidentNavigator;