// src/services/notification.service.js
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { auth, firestore } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Configurar comportamento de notificação
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const NotificationService = {
  /**
   * Registrar token de notificação para o usuário atual
   * @returns {Promise<string>} Token de notificação
   */
  async registerForPushNotificationsAsync() {
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  },

  /**
   * Salvar token de notificação no Firestore
   * @param {string} token Token de notificação
   * @returns {Promise<void>}
   */
  async saveTokenToFirestore(token) {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Salvar token no documento do usuário
      await setDoc(doc(firestore, 'users', user.uid), 
        { notificationToken: token }, 
        { merge: true }
      );
      
      // Salvar token também na coleção específica do tipo de usuário
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData && userData.type) {
        let collectionName;
        switch (userData.type) {
          case 'resident':
            collectionName = 'residents';
            break;
          case 'driver':
            collectionName = 'drivers';
            break;
          case 'condo':
            collectionName = 'condos';
            break;
          default:
            return;
        }
        
        await setDoc(doc(firestore, collectionName, user.uid), 
          { notificationToken: token }, 
          { merge: true }
        );
      }
    } catch (error) {
      console.error('Error saving notification token:', error);
    }
  },

  /**
   * Enviar notificação local
   * @param {string} title Título da notificação
   * @param {string} body Corpo da notificação
   * @param {Object} data Dados adicionais
   * @returns {Promise<string>} ID da notificação
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: null, // Imediatamente
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error sending local notification:', error);
      return null;
    }
  },
  
  /**
   * Cancelar todas as notificações agendadas
   * @returns {Promise<void>}
   */
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }
};

export default NotificationService;