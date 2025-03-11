// src/navigation/AdminNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Componentes
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminCondosScreen from '../screens/admin/AdminCondosScreen';
import AdminDriversScreen from '../screens/admin/AdminDriversScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import AdminApprovalScreen from '../screens/admin/AdminApprovalScreen';
import AdminUsersListScreen from '../screens/admin/AdminUsersListScreen';
import AdminUserDetailsScreen from '../screens/admin/AdminUserDetailsScreen';
import AdminSettingsPasswordScreen from '../screens/admin/AdminSettingsPasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack para Dashboard
const DashboardStack = () => {
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
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard',headerShown: true  }} />
    </Stack.Navigator>
  );
};

// Stack para Condomínios
const CondosStack = () => {
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
      <Stack.Screen name="AdminCondos" component={AdminCondosScreen} options={{ title: 'Condomínios' }} />
      <Stack.Screen 
        name="AdminUsersList" 
        component={AdminUsersListScreen}
        options={({ route }) => ({ 
          title: route.params?.title || 'Usuários',
        })}
      />
      <Stack.Screen 
        name="AdminUserDetails" 
        component={AdminUserDetailsScreen}
        options={({ route }) => ({ 
          title: route.params?.userName || 'Detalhes do Usuário',
        })}
      />
      <Stack.Screen name="AdminApproval" component={AdminApprovalScreen} options={{ title: 'Aprovar Usuário' }} />
    </Stack.Navigator>
  );
};

// Stack para Motoristas
const DriversStack = () => {
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
      <Stack.Screen name="AdminDrivers" component={AdminDriversScreen} options={{ title: 'Motoristas' }} />
      <Stack.Screen 
        name="AdminUserDetails" 
        component={AdminUserDetailsScreen}
        options={({ route }) => ({ 
          title: route.params?.userName || 'Detalhes do Motorista',
        })}
      />
      <Stack.Screen name="AdminApproval" component={AdminApprovalScreen} options={{ title: 'Aprovar Motorista' }} />
    </Stack.Navigator>
  );
};

// Stack para Configurações
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
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: 'Configurações' }} />
      <Stack.Screen name="AdminSettingsPassword" component={AdminSettingsPasswordScreen} options={{ title: 'Senha de Administrador' }} />
    </Stack.Navigator>
  );
};

// Navegador para Administradores
const AdminNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'DashboardTab':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'CondosTab':
              iconName = focused ? 'office-building' : 'office-building-outline';
              break;
            case 'DriversTab':
              iconName = focused ? 'car' : 'car-outline';
              break;
            case 'SettingsTab':
              iconName = focused ? 'cog' : 'cog-outline';
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
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ tabBarLabel: 'Dashboard',headerShown: false  }} />
      <Tab.Screen name="CondosTab" component={CondosStack} options={{ tabBarLabel: 'Condomínios' }} />
      <Tab.Screen name="DriversTab" component={DriversStack} options={{ tabBarLabel: 'Motoristas' }} />
      <Tab.Screen name="SettingsTab" component={SettingsStack} options={{ tabBarLabel: 'Configurações' }} />
    </Tab.Navigator>
  );
};

export default AdminNavigator;