import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';

// Importar hooks
import { useAuth } from '../hooks/useAuth';

// Importar telas de autenticação
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';

// Importar navegadores específicos por tipo de usuário
import ResidentNavigator from './ResidentNavigator';
import DriverNavigator from './DriverNavigator';
import CondoNavigator from './CondoNavigator';
import AdminNavigator from './AdminNavigator';

// Criar stacks de navegação
const AuthStack = createStackNavigator();
const RootStack = createStackNavigator();

// Navegador para telas de autenticação
const AuthNavigator = () => {
  const theme = useTheme();

  return (
    <AuthStack.Navigator
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
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Entrar' }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Cadastrar' }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Recuperar Senha' }}
      />
      <AuthStack.Screen
        name="UserType"
        component={UserTypeScreen}
        options={{ title: 'Tipo de Usuário' }}
      />
    </AuthStack.Navigator>
  );
};

// Navegador principal que decide qual fluxo mostrar com base no estado de autenticação
const RootNavigator = () => {
  const { currentUser, userProfile, loading } = useAuth();
  
  // Enquanto carrega o perfil, pode mostrar uma tela de splash
  if (loading) {
    // Retornaria um componente de loading
    return null;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!currentUser ? (
        // Não autenticado - mostrar telas de auth
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      ) : (
        // Autenticado - mostrar navegador específico com base no tipo de usuário
        (() => {
          if (!userProfile) {
            // Perfil não carregado ainda
            return <RootStack.Screen name="Auth" component={AuthNavigator} />;
          }

          switch (userProfile.type) {
            case 'resident':
              return <RootStack.Screen name="Resident" component={ResidentNavigator} />;
            case 'driver':
              return <RootStack.Screen name="Driver" component={DriverNavigator} />;
            case 'condo':
              return <RootStack.Screen name="Condo" component={CondoNavigator} />;
            case 'admin':
              return <RootStack.Screen name="Admin" component={AdminNavigator} />;
            default:
              return <RootStack.Screen name="Auth" component={AuthNavigator} />;
          }
        })()
      )}
    </RootStack.Navigator>
  );
};

// Navegador principal envolto em um NavigationContainer
const AppNavigator = () => {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;