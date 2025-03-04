// Crie um novo arquivo: src/components/NotificationManager.js
import React, { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../hooks/useAuth';
import NotificationService from '../services/notification.service';

const NotificationManager = () => {
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();
  const { userProfile } = useAuth();

  useEffect(() => {
    // Só registrar para notificações se o usuário estiver autenticado
    if (userProfile) {
      registerForPushNotifications();
    }

    // Configurar listeners para notificações
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      // Lógica para processar resposta a notificações
    });

    // Limpar listeners quando o componente for desmontado
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [userProfile]);

  const registerForPushNotifications = async () => {
    try {
      const token = await NotificationService.registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        await NotificationService.saveTokenToFirestore(token, userProfile.id);
      }
    } catch (error) {
      console.log('Error registering for push notifications:', error);
    }
  };

  return null; // Este componente não renderiza nada
};

export default NotificationManager;