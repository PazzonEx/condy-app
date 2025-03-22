// src/navigation/AuthNavigator.js
import React, { useState, useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from 'react-native-paper';
import { StatusBar, ActivityIndicator, View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Telas
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import UserTypeScreen from '../screens/auth/UserTypeScreen';
import TermsOfUseScreen from '../screens/auth/TermsOfUseScreen';
import PrivacyPolicyScreen from '../screens/auth/PrivacyPolicyScreen';
import LoadingOverlay from "../components/LoadingOverlay"
const Stack = createStackNavigator();

const AuthNavigator = () => {
  const theme = useTheme();
  const [initialRoute, setInitialRoute] = useState('Login');
  const [loading, setLoading] = useState(true);
  const [error,setError] = useState("")
  useEffect(() => {
    // Verificar se existe um email salvo para determinar rota inicial
    const checkInitialRoute = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('@auth_email');
        
        // Se tiver email salvo, começar na tela de login
        // Caso contrário, pode começar na tela de seleção de tipo
        if (savedEmail) {
          setInitialRoute('Login');
        } else {
          // Opcionalmente, pode verificar se é primeira execução
          // e começar na tela de tipo
          const isFirstRun = await AsyncStorage.getItem('@first_run');
          if (isFirstRun === null) {
            await AsyncStorage.setItem('@first_run', 'false');
            setInitialRoute('UserType');
          } else {
            setInitialRoute('Login');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar rota inicial:', error);
        setError('Erro ao inicializar aplicativo');
      } finally {
        setLoading(false);
      }
    };
    
    checkInitialRoute();
  }, []);
  
 
  
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
        <MaterialCommunityIcons name="alert-circle" size={40} color="#F44336" />
        <Text style={{ marginTop: 16, color: '#F44336', fontSize: 16 }}>{error}</Text>
        <TouchableOpacity 
          style={{ marginTop: 24, padding: 12, backgroundColor: '#F44336', borderRadius: 4 }}
          onPress={() => {
            // Tentar novamente
            setLoading(true);
            setError(null);
            checkInitialRoute();
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (loading) {
    return <LoadingOverlay /> }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: theme.colors.primary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ 
          headerShown: false
        }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ 
         
          headerShown: false
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Recuperar Senha' }}
      />
      <Stack.Screen
        name="UserType"
        component={UserTypeScreen}
        options={{ 
          title: 'Tipo de Usuário',
          headerShown: false
        }}
      />
      <Stack.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{ title: 'Termos de Uso' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Política de Privacidade' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;