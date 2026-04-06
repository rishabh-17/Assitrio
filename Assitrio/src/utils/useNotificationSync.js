import { useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import * as chrono from 'chrono-node';

const NOTIFICATION_LEAD_TIME_MS = 15 * 60 * 1000; // 15 mins

export function useNotificationSync(notes) {
  useEffect(() => {
    async function syncNotifications() {
      // 1. Check permissions safely
      if (Capacitor.isNativePlatform()) {
        const permStatus = await LocalNotifications.checkPermissions();
        if (permStatus.display !== 'granted') {
          // If we haven't asked yet or they didn't explicitly deny, request it.
          const reqStatus = await LocalNotifications.requestPermissions();
          if (reqStatus.display !== 'granted') {
            console.warn('Notification permissions denied.');
            return;
          }
        }
      }

      // 2. Extract future tasks from all notes
      const futureEvents = [];
      const now = new Date().getTime();

      notes.forEach((note) => {
        note.tasks?.forEach((task) => {
          if (task.date && !task.done) {
            const creationDate = new Date(`${note.date} ${note.time}`);
            const parsed = chrono.parse(task.date, creationDate);
            const targetDateObj = parsed.length > 0 ? parsed[0].start.date() : null;

            if (targetDateObj) {
              const eventTime = targetDateObj.getTime();
              const scheduledTime = new Date(eventTime - NOTIFICATION_LEAD_TIME_MS);

              // Only schedule if the alert time is in the future
              if (scheduledTime.getTime() > now) {
                // Ensure ID is a valid 32-bit int by hashing/modding the string ID or taking the timestamp
                // Fallback to purely visual derivation if task.id is string
                const numId = typeof task.id === 'string' 
                  ? parseInt(task.id.slice(-8), 16) 
                  : Number(task.id) % 2147483647; 

                futureEvents.push({
                  id: Math.abs(numId),
                  title: 'Upcoming Task in 15 mins',
                  body: task.text,
                  schedule: { at: scheduledTime },
                  smallIcon: 'ic_stat_icon_config_sample', // Default Android icon
                });
              }
            }
          }
        });
      });

      if (!Capacitor.isNativePlatform()) {
        // Fallback for Web/Browser if requested: 
        if ('Notification' in window && Notification.permission === 'granted') {
           // On web, checking scheduled intervals is complex, so we will skip local web scheduling for this specific hook and just handle Capacitor Native
        }
        return;
      }

      // 3. Clear all old scheduled notifications to prevent duplicates
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel(pending);
      }

      // 4. Register the new active set
      if (futureEvents.length > 0) {
        await LocalNotifications.schedule({ notifications: futureEvents });
      }
    }

    // Only run if we actually have notes
    if (notes && notes.length > 0) {
       syncNotifications();
    }
  }, [notes]);
}
