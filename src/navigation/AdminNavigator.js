import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';

// Componente temporário para telas não implementadas
const PlaceholderScreen = ({ title }) => {
  const { logout } = useAuth();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>Esta tela ainda será implementada</Text>
      <Button mode="contained" onPress={logout} style={styles.button}>
        Sair
      </Button>
    </View>
  );
};

// Criar navegador de tabs
const Tab = createBottomTabNavigator();

// Navegador para Administradores
const AdminNavigator = () => {
  const theme = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'AdminDashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
              break;
            case 'AdminCondos':
              iconName = focused ? 'office-building' : 'office-building-outline';
              break;
            case 'AdminDrivers':
              iconName = focused ? 'car' : 'car-outline';
              break;
            case 'AdminSettings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'help-circle';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="AdminDashboard" 
        component={() => <PlaceholderScreen title="Dashboard Admin" />}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="AdminCondos" 
        component={() => <PlaceholderScreen title="Gerenciar Condomínios" />}
        options={{ title: 'Condomínios' }}
      />
      <Tab.Screen 
        name="AdminDrivers" 
        component={() => <PlaceholderScreen title="Gerenciar Motoristas" />}
        options={{ title: 'Motoristas' }}
      />
      <Tab.Screen 
        name="AdminSettings" 
        component={() => <PlaceholderScreen title="Configurações" />}
        options={{ title: 'Configurações' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    marginBottom: 30,
  },
  button: {
    width: '80%',
  },
});

export default AdminNavigator;