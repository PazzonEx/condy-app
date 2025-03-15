// src/navigation/index.js
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';


import { useAuth } from '../hooks/useAuth';

// Telas de autenticação e registro
import AuthNavigator from './AuthNavigator';
import ResidentRegisterScreen from '../screens/resident/ResidentRegisterScreen';
import DriverRegisterScreen from '../screens/driver/DriverRegisterScreen';
import CondoRegisterScreen from '../screens/condo/CondoRegisterScreen';
import PendingApprovalScreen from '../screens/shared/PendingApprovalScreen';

// Navegadores específicos
import ResidentNavigator from './ResidentNavigator';
import DriverNavigator from './DriverNavigator';
import CondoNavigator from './CondoNavigator';
import AdminNavigator from './AdminNavigator';

// Componentes
import LoadingOverlay from '../components/LoadingOverlay';

const Stack = createStackNavigator();

 

const RootNavigator = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const redirectionInProgress = useRef(false);




// Remover referências como esta:
useEffect(() => {
  if (currentUser && !loading && !redirectionInProgress.current) {
    const checkProfile = async () => {
      try {
        redirectionInProgress.current = true;
      
        
        console.log("Perfil verificado, aguardando navegação...");
        
        setTimeout(() => {
          redirectionInProgress.current = false;
        }, 1000);
      } catch (error) {
        console.error("Erro ao verificar perfil:", error);
        redirectionInProgress.current = false;
      }
    };
    
    checkProfile();
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
  
   
  // Função para verificar se o usuário precisa completar o cadastro
  const needsProfileCompletion = () => {
    // Se não tiver perfil, não precisa completar o cadastro
    if (!userProfile) return false;

    // Caso especial para admin - nunca precisa completar perfil
  if (userProfile.type === 'admin') return false;
    
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
  
  if (loading) {
    return <LoadingOverlay />;
  }


  return (
    <Stack.Navigator screenOptions={{
      headerStyle: {
        backgroundColor: '#1E88E5',
        
      },
      headerTintColor: '#000',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
    }}>
      {!currentUser ? (
        // Não autenticado
        <Stack.Screen name="Entrar" component={AuthNavigator} options={{ headerMode: false}}   />
      ) : needsProfileCompletion() ? (
        // Perfil incompleto - Redirecionar para tela de complementação
        (() => {
          console.log('Redirecionando para completar perfil:', userProfile?.type);
          switch (userProfile?.type) {
            case 'resident':
              return <Stack.Screen name="ResidentRegister" component={ResidentRegisterScreen} options={{ title: 'Cadastrar' }}/>;
            case 'driver':
              return <Stack.Screen name="DriverRegister" component={DriverRegisterScreen} options={{ title: 'Cadastrar' }} />;
            case 'condo':
              return <Stack.Screen name="CondoRegister" component={CondoRegisterScreen} options={{ title: 'Cadastrar' }} />;
            default:
              return <Stack.Screen name="Auth" component={AuthNavigator} options={{ title: 'Cadastrar' }} />;
          }
        })()
      ) : needsApproval() ? (
        // Aguardando aprovação
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      ) : (
        // Aprovado - Redirecionar para tela principal
        (() => {
          console.log('Redirecionando para tela principal:', userProfile?.type);
          console.log('Perfil completo:', JSON.stringify(userProfile));
          
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
              console.error('Tipo de usuário indefinido ou inválido:', userProfile?.type);
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