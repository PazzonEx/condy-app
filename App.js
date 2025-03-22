import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { StripeProvider } from '@stripe/stripe-react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

// Obter a instância do functions
const functions = getFunctions(getApp(), 'southamerica-east1'); // Mesma região das suas functions


// Importar navegador principal
import AppNavigator from './src/navigation';

// Importar provider de autenticação
import { AuthProvider } from './src/hooks/useAuth';

// Importar serviço de notificações
import NotificationService from './src/services/notification.service';

// Ignorar avisos específicos em ambiente de desenvolvimento
LogBox.ignoreLogs([
  'AsyncStorage has been extracted from react-native',
  'Setting a timer for a long period of time',
  'Possible Unhandled Promise Rejection'
]); 

// Definir tema personalizado
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#1E88E5', // Azul
    accent: '#FFA000', // Laranja
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    error: '#D32F2F',
  },
};

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();
  const [publishableKey, setPublishableKey] = useState('');

  const fetchPublishableKey = async () => {
    const key ="pk_test_51R5W7DP5RFauVjCsYvmSI7SCeDg9ZeTbMhZJiHzGyjU4tKVtKNakl7I16g4cmrw8oMtLrqXQDHsMK9hzAfjfNpx6001cMeaTF6" //await fetchKey(); // fetch key from your server here
    setPublishableKey(key);
  };

  useEffect(() => {
    fetchPublishableKey();
  }, []);

  

// No componente principal ou hook de inicialização
useEffect(() => {
  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permissão de localização negada');
        // Mostrar mensagem amigável ao usuário
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão de localização:', error);
    }
  })();
}, []);
  
  useEffect(() => {
    // Registrar para receber notificações
    registerForPushNotifications();
    
    // Configurar listeners para notificações
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });
    
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
            
      // Aqui você pode implementar a navegação para uma tela específica
      // com base nos dados da notificação
      const data = response.notification.request.content.data;
      if (data.requestId) {
        // Navegar para a tela de detalhes da solicitação
        // Isso requer acesso ao objeto de navegação, que pode ser complexo neste contexto
        // Uma solução seria usar um estado global ou contexto para armazenar esta ação
      }
    });
    
    // Limpar listeners quando o componente for desmontado
    return () => { 
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);
  
  const registerForPushNotifications = async () => {
    try {
      const token = await NotificationService.registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        await NotificationService.saveTokenToFirestore(token);
      }
    } catch (error) {
      console.log('Error registering for push notifications:', error);
    }
  };
  
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <StatusBar style="auto" />
          <StripeProvider
          publishableKey={publishableKey}
          merchantIdentifier="merchant.identifier" // required for Apple Pay
          urlScheme="your-url-scheme" // required for 3D Secure and bank redirects
        >
          <AppNavigator />
          </StripeProvider>         
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}