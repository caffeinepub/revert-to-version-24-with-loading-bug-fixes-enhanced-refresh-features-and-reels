import { useRef } from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useGetUnseenNotifications, useMarkAllNotificationsAsRead, useMarkNotificationAsRead } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Home, MessageCircle, User, Users, LogOut, Moon, Sun, Bell, Film } from 'lucide-react';
import { useTheme } from 'next-themes';
import { formatDistanceToNow } from 'date-fns';
import type { Notification } from '../types/backend-types';

type Tab = 'feed' | 'reels' | 'chat' | 'profile' | 'friends';

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onNotificationClick?: (notification: Notification) => void;
}

export default function Header({ activeTab, onTabChange, onNotificationClick }: HeaderProps) {
  const { clear } = useInternetIdentity();
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: unseenNotifications } = useGetUnseenNotifications();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const markAsRead = useMarkNotificationAsRead();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  // Track last click time for double-click detection
  const lastClickTime = useRef<{ [key: string]: number }>({});

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead.mutateAsync();
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead.mutateAsync(notification.id);
    }
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const handleTabClick = (tab: Tab) => {
    const now = Date.now();
    const lastClick = lastClickTime.current[tab] || 0;
    const timeDiff = now - lastClick;

    // If double-click (within 500ms)
    if (timeDiff < 500) {
      // Invalidate queries for the current tab
      switch (tab) {
        case 'feed':
          queryClient.invalidateQueries({ queryKey: ['postsFeed'] });
          break;
        case 'reels':
          queryClient.invalidateQueries({ queryKey: ['reelsFeed'] });
          break;
        case 'friends':
          queryClient.invalidateQueries({ queryKey: ['friends'] });
          queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
          queryClient.invalidateQueries({ queryKey: ['sentRequests'] });
          break;
        case 'chat':
          queryClient.invalidateQueries({ queryKey: ['messages'] });
          queryClient.invalidateQueries({ queryKey: ['sharedPostMessages'] });
          break;
        case 'profile':
          queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
          queryClient.invalidateQueries({ queryKey: ['userPosts'] });
          queryClient.invalidateQueries({ queryKey: ['userReels'] });
          break;
      }
    } else {
      // Single click - just navigate
      onTabChange(tab);
    }

    lastClickTime.current[tab] = now;
  };

  const avatarUrl = userProfile?.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';
  const unseenCount = unseenNotifications?.length || 0;

  return (
    <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src="/assets/Pi7-Image-Cropper (1)-1.png"
            alt="Fabegram"
            className="h-10 w-10 rounded-full object-cover"
          />
          <h1 className="text-xl font-bold tracking-tight">Fabegram</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          <Button
            variant={activeTab === 'feed' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('feed')}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Feed
          </Button>
          <Button
            variant={activeTab === 'reels' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('reels')}
            className="gap-2"
          >
            <Film className="h-4 w-4" />
            Reels
          </Button>
          <Button
            variant={activeTab === 'friends' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('friends')}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Friends
          </Button>
          <Button
            variant={activeTab === 'chat' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('chat')}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Chat
          </Button>
          <Button
            variant={activeTab === 'profile' ? 'default' : 'ghost'}
            onClick={() => handleTabClick('profile')}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            Profile
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unseenCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs"
                  >
                    {unseenCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between border-b p-4">
                <h3 className="font-semibold">Notifications</h3>
                {unseenCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllRead}
                    disabled={markAllAsRead.isPending}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              <ScrollArea className="h-[400px]">
                {unseenNotifications && unseenNotifications.length > 0 ? (
                  <div className="divide-y">
                    {unseenNotifications.map((notification) => {
                      const timestamp = new Date(Number(notification.timestamp) / 1000000);
                      return (
                        <button
                          key={notification.id.toString()}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full p-4 text-left transition-colors hover:bg-muted ${
                            !notification.isRead ? 'bg-primary/5' : ''
                          }`}
                        >
                          <p className="text-sm">{notification.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDistanceToNow(timestamp, { addSuffix: true })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} alt={userProfile?.name || 'User'} />
                  <AvatarFallback>{userProfile?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} alt={userProfile?.name || 'User'} />
                  <AvatarFallback>{userProfile?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className="text-sm font-medium">{userProfile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">View profile</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
