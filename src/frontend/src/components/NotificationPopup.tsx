import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import type { Notification } from '../backend';
import { NotificationType } from '../backend';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPopupProps {
  notification: Notification;
  onDismiss: () => void;
  onClick: () => void;
  senderAvatarUrl?: string;
}

export function NotificationPopup({ notification, onDismiss, onClick, senderAvatarUrl }: NotificationPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClick();
      onDismiss();
    }, 200);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const getNotificationIcon = () => {
    switch (notification.notificationType) {
      case NotificationType.like:
        return '❤️';
      case NotificationType.comment:
        return '💬';
      case NotificationType.friendRequest:
        return '👋';
      case NotificationType.friendAccepted:
        return '✅';
      case NotificationType.message:
        return '📩';
      case NotificationType.postShared:
        return '🔗';
      default:
        return '🔔';
    }
  };

  const timestamp = new Date(Number(notification.timestamp) / 1000000);

  return (
    <Card
      onClick={handleClick}
      className={`group relative mb-3 w-80 cursor-pointer overflow-hidden border-l-4 border-l-primary bg-card p-4 shadow-lg transition-all duration-300 hover:shadow-xl ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={senderAvatarUrl || '/assets/generated/default-avatar.dim_200x200.png'} />
          <AvatarFallback>{notification.senderName?.slice(0, 2).toUpperCase() || '?'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getNotificationIcon()}</span>
            <p className="text-sm font-semibold">{notification.senderName || 'Someone'}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface NotificationPopupContainerProps {
  notifications: Array<{
    notification: Notification;
    senderAvatarUrl?: string;
  }>;
  onDismiss: (id: bigint) => void;
  onNotificationClick: (notification: Notification) => void;
}

export function NotificationPopupContainer({ notifications, onDismiss, onNotificationClick }: NotificationPopupContainerProps) {
  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col items-end">
      <div className="pointer-events-auto">
        {notifications.map(({ notification, senderAvatarUrl }) => (
          <NotificationPopup
            key={notification.id.toString()}
            notification={notification}
            senderAvatarUrl={senderAvatarUrl}
            onDismiss={() => onDismiss(notification.id)}
            onClick={() => onNotificationClick(notification)}
          />
        ))}
      </div>
    </div>
  );
}
