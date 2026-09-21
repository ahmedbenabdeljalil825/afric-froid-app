import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export const pushService = {
  async register(userId: string) {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications not available on web/desktop.');
      return;
    }

    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('User denied push notification permissions.');
        return;
      }

      // Register with Apple/Google to receive token
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', async (token) => {
        console.log('Push registration success, token: ' + token.value);
        
        // Save token to Supabase profiles.config
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('config')
            .eq('id', userId)
            .single();
            
          const currentConfig = profile?.config || {};
          
          if (currentConfig.fcm_token !== token.value) {
            await supabase
              .from('profiles')
              .update({
                config: { ...currentConfig, fcm_token: token.value }
              })
              .eq('id', userId);
            console.log('FCM token saved to profile.');
          }
        } catch (err) {
          console.error('Failed to save FCM token to Supabase:', err);
        }
      });

      // Handle registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on push registration: ' + JSON.stringify(error));
      });

      // Handle incoming notifications when app is open
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ', notification);
      });

      // Handle tap on notification
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ', notification);
        if (notification.notification.data?.type === 'alarm') {
          window.location.hash = '#/alarms';
        }
      });

    } catch (err) {
      console.error('Error initializing push notifications:', err);
    }
  }
};
