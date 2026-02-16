import { useEffect, useRef, useState } from 'react';
import { useGetUnseenNotifications } from './useQueries';
import type { Notification } from '../types/backend-types';

interface PopupNotification {
  notification: Notification;
  senderAvatarUrl?: string;
}

export function useNotificationPolling() {
  const { data: unseenNotifications } = useGetUnseenNotifications();
  const [displayedNotifications, setDisplayedNotifications] = useState<PopupNotification[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const lastCheckRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!unseenNotifications || unseenNotifications.length === 0) {
      return;
    }

    // Filter for new notifications that haven't been processed yet
    const newNotifications = unseenNotifications.filter(notif => {
      const notifId = notif.id.toString();
      const notifTime = Number(notif.timestamp) / 1000000; // Convert to milliseconds
      
      // Only show notifications that are newer than last check and not already processed
      return notifTime > lastCheckRef.current && !processedIds.has(notifId);
    });

    if (newNotifications.length > 0) {
      // Process new notifications
      const popupNotifications: PopupNotification[] = newNotifications.map(notification => ({
        notification,
        senderAvatarUrl: undefined, // Will be loaded separately if needed
      }));

      // Add to displayed notifications (limit to 3 at a time)
      setDisplayedNotifications(prev => {
        const combined = [...popupNotifications, ...prev];
        return combined.slice(0, 3);
      });

      // Mark as processed
      setProcessedIds(prev => {
        const newSet = new Set(prev);
        newNotifications.forEach(n => newSet.add(n.id.toString()));
        return newSet;
      });

      // Update last check time
      lastCheckRef.current = Date.now();
    }
  }, [unseenNotifications, processedIds]);

  const dismissNotification = (id: bigint) => {
    setDisplayedNotifications(prev => 
      prev.filter(n => n.notification.id.toString() !== id.toString())
    );
  };

  const clearAll = () => {
    setDisplayedNotifications([]);
  };

  return {
    displayedNotifications,
    dismissNotification,
    clearAll,
  };
}
