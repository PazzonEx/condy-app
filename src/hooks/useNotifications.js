// src/hooks/useNotifications.js
import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import NotificationService from '../services/notification.service';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { currentUser } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Só registrar se houver um usuário autenticado
    if (currentUser) {
      registerForPushNotifications();
    }

    // Configurar listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Aqui você pode implementar lógica adicional ao tocar na notificação
    });

    // Limpar listeners ao desmontar
    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [currentUser]);

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

  const sendLocalNotification = async (title, body, data = {}) => {
    return await NotificationService.sendLocalNotification(title, body, data);
  };

  return {
    expoPushToken,
    notification,
    sendLocalNotification
  };
}