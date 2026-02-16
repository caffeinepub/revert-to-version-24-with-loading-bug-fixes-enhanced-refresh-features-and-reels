import { useState, useRef } from 'react';
import { Home, MessageCircle, User, Users, Film } from 'lucide-react';
import FeedPage from '../pages/FeedPage';
import ReelsPage from '../pages/ReelsPage';
import ChatPage from '../pages/ChatPage';
import ProfilePage from '../pages/ProfilePage';
import FriendsPage from '../pages/FriendsPage';
import UserProfilePage from '../pages/UserProfilePage';
import Header from './Header';
import { NotificationPopupContainer } from './NotificationPopup';
import { useNotificationPolling } from '../hooks/useNotificationPolling';
import { useQueryClient } from '@tanstack/react-query';
import type { Principal } from '@icp-sdk/core/principal';
import type { Notification } from '../types/backend-types';
import { NotificationType } from '../types/backend-types';

type MainTab = 'feed' | 'reels' | 'chat' | 'profile' | 'friends';
type ViewState = 
  | { type: 'main'; tab: MainTab }
  | { type: 'userProfile'; userId: Principal }
  | { type: 'userProfileByUserId'; userId: string }
  | { type: 'chat'; friendId: Principal }
  | { type: 'post'; postId: string };

export default function MainLayout() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'main', tab: 'feed' });
  const queryClient = useQueryClient();
  const lastClickTime = useRef<{ [key: string]: number }>({});
  
  // Notification polling
  const { displayedNotifications, dismissNotification } = useNotificationPolling();

  const handleViewUserProfile = (userId: Principal) => {
    setViewState({ type: 'userProfile', userId });
  };

  const handleViewUserProfileByUserId = (userId: string) => {
    setViewState({ type: 'userProfileByUserId', userId });
  };

  const handleViewChat = (friendId: Principal) => {
    setViewState({ type: 'chat', friendId });
  };

  const handleViewPost = (postId: string) => {
    // Navigate to feed to show the post
    setViewState({ type: 'main', tab: 'feed' });
  };

  const handleBackToMain = (tab: MainTab = 'feed') => {
    setViewState({ type: 'main', tab });
  };

  const handleTabChange = (tab: MainTab) => {
    const now = Date.now();
    const lastClick = lastClickTime.current[tab] || 0;
    const timeDiff = now - lastClick;

    // If clicking the same tab (single click refresh)
    if (viewState.type === 'main' && viewState.tab === tab) {
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
      // Navigate to the tab
      setViewState({ type: 'main', tab });
    }

    lastClickTime.current[tab] = now;
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on notification type
    switch (notification.notificationType) {
      case NotificationType.like:
      case NotificationType.comment:
        // Navigate to the post
        if (notification.relatedPostId) {
          setViewState({ type: 'main', tab: 'feed' });
        }
        break;
      case NotificationType.friendRequest:
      case NotificationType.friendAccepted:
        // Navigate to friends page
        setViewState({ type: 'main', tab: 'friends' });
        break;
      case NotificationType.message:
      case NotificationType.postShared:
        // Navigate to chat with the sender
        if (notification.sender) {
          setViewState({ type: 'chat', friendId: notification.sender });
        }
        break;
    }
  };

  const activeTab = viewState.type === 'main' ? viewState.tab : 
                    viewState.type === 'chat' ? 'chat' : 
                    viewState.type === 'userProfile' || viewState.type === 'userProfileByUserId' ? 'friends' : 'feed';

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
        onNotificationClick={handleNotificationClick}
      />

      {/* Popup Notifications */}
      <NotificationPopupContainer
        notifications={displayedNotifications}
        onDismiss={dismissNotification}
        onNotificationClick={handleNotificationClick}
      />

      <main className="flex-1 overflow-y-auto">
        {viewState.type === 'main' && viewState.tab === 'feed' && (
          <FeedPage onViewProfile={handleViewUserProfile} />
        )}
        {viewState.type === 'main' && viewState.tab === 'reels' && (
          <ReelsPage onViewProfile={handleViewUserProfile} />
        )}
        {viewState.type === 'main' && viewState.tab === 'chat' && (
          <ChatPage 
            onViewProfile={handleViewUserProfile}
            onViewPost={handleViewPost}
          />
        )}
        {viewState.type === 'main' && viewState.tab === 'profile' && <ProfilePage />}
        {viewState.type === 'main' && viewState.tab === 'friends' && (
          <FriendsPage onViewProfile={handleViewUserProfileByUserId} />
        )}
        {viewState.type === 'userProfile' && (
          <UserProfilePage userPrincipal={viewState.userId} onBack={() => handleBackToMain('friends')} />
        )}
        {viewState.type === 'userProfileByUserId' && (
          <UserProfilePage userId={viewState.userId} onBack={() => handleBackToMain('friends')} />
        )}
        {viewState.type === 'chat' && (
          <ChatPage 
            initialFriendId={viewState.friendId}
            onViewProfile={handleViewUserProfile}
            onViewPost={handleViewPost}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="sticky bottom-0 z-10 border-t bg-card md:hidden">
        <div className="flex items-center justify-around px-2 py-3">
          <button
            onClick={() => handleTabChange('feed')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'feed' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Home className="h-6 w-6" />
            <span className="text-xs font-medium">Feed</span>
          </button>

          <button
            onClick={() => handleTabChange('reels')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'reels' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Film className="h-6 w-6" />
            <span className="text-xs font-medium">Reels</span>
          </button>

          <button
            onClick={() => handleTabChange('friends')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'friends' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Users className="h-6 w-6" />
            <span className="text-xs font-medium">Friends</span>
          </button>

          <button
            onClick={() => handleTabChange('chat')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'chat' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs font-medium">Chat</span>
          </button>

          <button
            onClick={() => handleTabChange('profile')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'profile' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <User className="h-6 w-6" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
