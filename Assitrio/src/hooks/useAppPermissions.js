import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export function useAppPermissions() {
  useEffect(() => {
    const requestAllPermissions = async () => {
      // Only execute this flow on Native Android/iOS via Capacitor
      if (!Capacitor.isNativePlatform()) return;

      try {
        // 1. Notification Permission (Push & Local)
        // This handles "notification" and "background app" alerting capabilities
        try {
          const notifStatus = await LocalNotifications.checkPermissions();
          if (notifStatus.display !== 'granted') {
            await LocalNotifications.requestPermissions();
          }
        } catch (e) {
          console.warn('Notification permission failed:', e);
        }

        // 2. Microphone / Audio Recording Permission
        // This also handles audio routing (speaker) permissions by triggering the native OS prompt
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // If granted, immediately stop the tracks so it doesn't leave the mic active in the background until needed
          stream.getTracks().forEach(track => track.stop());
        } catch (micErr) {
          console.warn('Microphone permission denied on startup:', micErr);
        }

      } catch (e) {
        console.error('Error requesting startup permissions:', e);
      }
    };

    // Slight delay to ensure the UI is fully rendered before blasting the user with permission modals
    setTimeout(() => {
      requestAllPermissions();
    }, 1000);

  }, []);
}
