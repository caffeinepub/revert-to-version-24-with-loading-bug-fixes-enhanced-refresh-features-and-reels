import { useState, useEffect } from 'react';
import { useGetUnseenNotifications } from './useQueries';
import type { Notification } from '../backend';

export interface PopupNotification {
  notification: Notification;
  senderAvatarUrl?: string;
}

export function useNotificationPolling() {
  const { data: unseenNotifications = [] } = useGetUnseenNotifications();
  const [displayedNotifications, setDisplayedNotifications] = useState<PopupNotification[]>([]);
  const [seenNotificationIds, setSeenNotificationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newNotifications = unseenNotifications.filter(
      (notification) => !seenNotificationIds.has(notification.id.toString())
    );

    if (newNotifications.length > 0) {
      const popupNotifications: PopupNotification[] = newNotifications.map(notification => ({
        notification,
        senderAvatarUrl: undefined,
      }));

      setDisplayedNotifications((prev) => [...prev, ...popupNotifications]);
      setSeenNotificationIds((prev) => {
        const newSet = new Set(prev);
        newNotifications.forEach((n) => newSet.add(n.id.toString()));
        return newSet;
      });
    }
  }, [unseenNotifications, seenNotificationIds]);

  const dismissNotification = (notificationId: bigint) => {
    setDisplayedNotifications((prev) =>
      prev.filter((pn) => pn.notification.id !== notificationId)
    );
  };

  return {
    displayedNotifications,
    dismissNotification,
  };
}
