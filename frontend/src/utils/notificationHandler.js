import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import { API_URL } from '../config';

export async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    getFCMToken();
  }
}

async function getFCMToken() {
  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await AsyncStorage.setItem('fcmToken', fcmToken);
      // Register token with backend
      await registerDeviceToken(fcmToken);
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
  }
}

async function registerDeviceToken(token) {
  try {
    await axios.post(`${API_URL}/users/device`, {
      deviceToken: token,
      deviceType: Platform.OS,
    });
  } catch (error) {
    console.error('Error registering device token:', error);
  }
}

export function setupNotificationListeners(navigation) {
  // Handle notifications when app is in background
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background:', remoteMessage);
    handleNotification(remoteMessage, navigation);
  });

  // Handle notifications when app is in foreground
  const unsubscribe = messaging().onMessage(async remoteMessage => {
    console.log('Received foreground message:', remoteMessage);
    handleNotification(remoteMessage, navigation);
  });

  // Handle notification open
  messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('Notification opened app:', remoteMessage);
    navigateToScreen(remoteMessage, navigation);
  });

  // Check if app was opened from a notification
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('App opened from notification:', remoteMessage);
        navigateToScreen(remoteMessage, navigation);
      }
    });

  return unsubscribe;
}

function handleNotification(remoteMessage, navigation) {
  // Handle different types of notifications
  switch (remoteMessage.data.type) {
    case 'chat':
      // Show chat notification if not in chat screen with sender
      const currentRoute = navigation.getCurrentRoute();
      if (currentRoute?.name !== 'Chat' || 
          currentRoute?.params?.otherUser?.id !== remoteMessage.data.senderId) {
        // Show local notification
        showLocalNotification(remoteMessage);
      }
      break;
    case 'emergency':
      // Always show emergency notifications
      showLocalNotification(remoteMessage);
      break;
  }
}

function navigateToScreen(remoteMessage, navigation) {
  switch (remoteMessage.data.type) {
    case 'chat':
      navigation.navigate('Chat', {
        otherUser: {
          id: remoteMessage.data.senderId,
          name: remoteMessage.notification.title
        }
      });
      break;
    case 'emergency':
      navigation.navigate('Emergency', {
        emergencyId: remoteMessage.data.emergencyId
      });
      break;
  }
}

async function showLocalNotification(remoteMessage) {
  // Implementation depends on your local notification library
  // Here's an example using react-native-push-notification
  PushNotification.localNotification({
    channelId: 'default',
    title: remoteMessage.notification.title,
    message: remoteMessage.notification.body,
    data: remoteMessage.data,
  });
}
