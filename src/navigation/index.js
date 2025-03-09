// src/navigation/index.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';

// Hooks
import { useAuth } from '../hooks/useAuth';

// Telas de autenticação
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';

// Telas de registro complementar
import DriverRegisterScreen from '../screens/driver/DriverRegisterScreen';
import ResidentRegisterScreen from '../screens/resident/ResidentRegisterScreen';
import CondoRegisterScreen from '../screens/condo/CondoRegisterScreen';

// Navegadores específicos
import ResidentNavigator from './ResidentNavigator';
import DriverNavigator from './DriverNavigator';
import CondoNavigator from './CondoNavigator';
import AdminNavigator from './AdminNavigator';

// Telas de espera/aprovação
import PendingApprovalScreen from '../screens/shared/PendingApprovalScreen';
import LoadingOverlay from '../components/LoadingOverlay';

const Stack = createStackNavigator();

const AuthNavigator = () => {
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
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Entrar' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Cadastrar' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Recuperar Senha' }}
      />
      <Stack.Screen
        name="UserType"
        component={UserTypeScreen}
        options={{ title: 'Tipo de Usuário' }}
      />
    </Stack.Navigator>
  );
};

const RootNavigator = () => {
  const { currentUser, userProfile, loading, reloadUserProfile } = useAuth();

  // Função para verificar se o usuário precisa completar o cadastro
  const needsProfileCompletion = () => {
    // Se não tiver perfil, não precisa completar o cadastro
    if (!userProfile) return false;
    
    // Se o perfil não tiver a flag de completo
    return userProfile.profileComplete !== true;
  };
  
  // Função para verificar se o usuário está em espera de aprovação
  const needsApproval = () => {
    // Se não tiver perfil, não precisa de aprovação ainda
    if (!userProfile) return false;
    
    console.log('Verificando aprovação - Tipo:', userProfile.type, 'Status:', userProfile.status);
    
    // Verificar status baseado no tipo de usuário
    switch (userProfile.type) {
      case 'resident':
        // Moradores precisam de aprovação a menos que status seja 'active'
        return userProfile.status !== 'active';
        
      case 'driver':
        // Motoristas precisam de aprovação a menos que status seja 'active'
        return userProfile.status !== 'active';
        
      case 'condo':
        // Condomínios precisam de aprovação a menos que status seja 'active'
        return userProfile.status !== 'active';
        
      case 'admin':
        // Admins não precisam de aprovação
        return false;
        
      default:
        return false;
    }
  };
  useEffect(() => {
    if (currentUser && !loading) {
      reloadUserProfile();
    }
  }, [currentUser, loading]);
  useEffect(() => {
    if (currentUser && userProfile) {
      console.log("Estado do usuário - UID:", currentUser.uid);
      console.log("Estado do perfil - Tipo:", userProfile.type);
      console.log("Estado do perfil - Completo:", userProfile.profileComplete);
      console.log("Estado do perfil - Status:", userProfile.status);
    }
  }, [currentUser, userProfile]);
  
  // Debugar estado atual
  useEffect(() => {
    if (currentUser) {
      console.log('Usuário logado:', currentUser.uid);
      console.log('Perfil:', userProfile);
      if (userProfile) {
        console.log('Precisa de aprovação:', needsApproval());
        console.log('Precisa completar perfil:', needsProfileCompletion());
      }
    }
  }, [currentUser, userProfile]);
  
  if (loading) {
    // Mostrar tela de carregamento
    return <LoadingOverlay />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!currentUser ? (
        // Não autenticado
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : needsProfileCompletion() ? (
        // Perfil incompleto - Redirecionar para tela de complementação
        (() => {
          console.log('Redirecionando para completar perfil:', userProfile?.type);
          switch (userProfile?.type) {
            case 'resident':
              return <Stack.Screen name="ResidentRegister" component={ResidentRegisterScreen} />;
            case 'driver':
              return <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} />;
            case 'condo':
              return <Stack.Screen name="CondoRegister" component={CondoRegisterScreen} />;
            default:
              return <Stack.Screen name="Auth" component={AuthNavigator} />;
          }
        })()
      ) : needsApproval() ? (
        // Aguardando aprovação
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      ) : (
        // Aprovado - Redirecionar para tela principal
        (() => {
          console.log('Redirecionando para tela principal:', userProfile?.type);
          switch (userProfile?.type) {
            case 'resident':
              return <Stack.Screen name="Resident" component={ResidentNavigator} />;
            case 'driver':
              return <Stack.Screen name="Driver" component={DriverNavigator} />;
            case 'condo':
              return <Stack.Screen name="Condo" component={CondoNavigator} />;
            case 'admin':
              return <Stack.Screen name="Admin" component={AdminNavigator} />;
            default:
              return <Stack.Screen name="Auth" component={AuthNavigator} />;
          }
        })()
      )}
    </Stack.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

export default AppNavigator;