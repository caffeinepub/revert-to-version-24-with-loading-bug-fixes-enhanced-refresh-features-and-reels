import { useState } from 'react';
import { useGetFriends, useGetPendingRequests, useAcceptFriendRequest, useDeclineFriendRequest, useRemoveFriend, useGetProfileByPrincipal, useSendFriendRequest, useCheckFriendshipStatus, useSearchUserProfiles, useGetProfileByUserId, useCancelFriendRequest } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, UserCheck, UserX, UserMinus, Search, Lock, Globe, UserPlus, X, AlertCircle } from 'lucide-react';
import { Principal } from '@icp-sdk/core/principal';
import type { UserProfile } from '../types/backend-types';
import type { SimplifiedUserProfile } from '../backend';

interface FriendsPageProps {
  onViewProfile?: (userId: string) => void;
}

function FriendCard({ 
  friendPrincipal, 
  onRemove, 
  onViewProfile 
}: { 
  friendPrincipal: Principal; 
  onRemove: (p: Principal) => void;
  onViewProfile?: (userId: string) => void;
}) {
  const { data: profile, isLoading } = useGetProfileByPrincipal(friendPrincipal);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const avatarUrl = profile?.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  const handleProfileClick = () => {
    if (onViewProfile && profile?.userId) {
      onViewProfile(profile.userId);
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={handleProfileClick} className="cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl} alt={profile?.name || 'User'} />
              <AvatarFallback>{profile?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1">
            <button 
              onClick={handleProfileClick}
              className="font-semibold hover:underline cursor-pointer text-left"
            >
              {profile?.name || 'Unknown User'}
            </button>
            <button
              onClick={handleProfileClick}
              className="block text-xs text-primary hover:underline cursor-pointer"
            >
              @{profile?.userId || 'N/A'}
            </button>
            <p className="text-sm text-muted-foreground">{profile?.bio || 'No bio'}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive">
              <UserMinus className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Friend</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {profile?.name || 'this user'} from your friends?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onRemove(friendPrincipal)} className="bg-destructive text-destructive-foreground">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function RequestCard({ 
  requesterProfile, 
  onAccept, 
  onDecline 
}: { 
  requesterProfile: UserProfile; 
  onAccept: (profile: UserProfile) => void; 
  onDecline: (profile: UserProfile) => void;
}) {
  const avatarUrl = requesterProfile.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={avatarUrl} alt={requesterProfile.name} />
            <AvatarFallback>{requesterProfile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{requesterProfile.name}</p>
            <p className="text-xs text-muted-foreground">@{requesterProfile.userId}</p>
            <p className="text-sm text-muted-foreground">Wants to be friends</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="default" size="sm" onClick={() => onAccept(requesterProfile)}>
            <UserCheck className="mr-1 h-4 w-4" />
            Accept
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDecline(requesterProfile)}>
            <UserX className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchResultCard({ 
  profile,
  onViewProfile 
}: { 
  profile: SimplifiedUserProfile;
  onViewProfile?: (userId: string) => void;
}) {
  const { data: profileByUserId } = useGetProfileByUserId(profile.userId);
  const { isFriend, isPendingReceived, isPendingSent, isCurrentUser } = useCheckFriendshipStatus(profile.principal);
  const sendRequest = useSendFriendRequest();
  const cancelRequest = useCancelFriendRequest();

  const handleSendRequest = async () => {
    await sendRequest.mutateAsync(profile.userId);
  };

  const handleCancelRequest = async () => {
    await cancelRequest.mutateAsync(profile.userId);
  };

  const handleUserIdClick = () => {
    if (onViewProfile) {
      onViewProfile(profile.userId);
    }
  };

  const avatarUrl = profile.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={handleUserIdClick} className="cursor-pointer hover:opacity-80 transition-opacity">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatarUrl} alt={profile.name} />
              <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{profile.name}</p>
              <Badge variant={profile.isPublic ? 'default' : 'secondary'} className="gap-1 text-xs">
                {profile.isPublic ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Private
                  </>
                )}
              </Badge>
            </div>
            <button
              onClick={handleUserIdClick}
              className="text-xs text-primary hover:underline cursor-pointer"
            >
              @{profile.userId}
            </button>
          </div>
        </div>
        <div>
          {isCurrentUser ? (
            <Badge variant="outline">You</Badge>
          ) : isFriend ? (
            <Badge variant="default" className="gap-1">
              <UserCheck className="h-3 w-3" />
              Friends
            </Badge>
          ) : isPendingSent ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancelRequest}
              disabled={cancelRequest.isPending}
            >
              {cancelRequest.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-1 h-4 w-4" />
              )}
              Request Sent
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSendRequest} 
              disabled={sendRequest.isPending}
            >
              {sendRequest.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1 h-4 w-4" />
              )}
              Add Friend
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FriendsPage({ onViewProfile }: FriendsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { actor } = useActor();
  const { data: friends, isLoading: friendsLoading, error: friendsError } = useGetFriends();
  const { data: pendingRequests, isLoading: requestsLoading, error: requestsError } = useGetPendingRequests();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();
  const { data: searchResults, isFetching: searchLoading } = useSearchUserProfiles(searchQuery);

  const handleAccept = async (requesterProfile: UserProfile) => {
    // Since backend expects Principal but we only have UserProfile, we need to look up the Principal
    // For now, this is a stub since the backend method isn't fully implemented
    console.warn('Accept friend request not fully implemented - backend needs Principal');
  };

  const handleDecline = async (requesterProfile: UserProfile) => {
    // Since backend expects Principal but we only have UserProfile, we need to look up the Principal
    // For now, this is a stub since the backend method isn't fully implemented
    console.warn('Decline friend request not fully implemented - backend needs Principal');
  };

  const handleRemove = async (friend: Principal) => {
    await removeFriend.mutateAsync(friend);
  };

  const pendingCount = pendingRequests?.length || 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <img
          src="/assets/generated/friends-icon-transparent.dim_64x64.png"
          alt="Friends"
          className="h-10 w-10"
        />
        <h2 className="text-2xl font-bold">Friends</h2>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search users by username or user ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchLoading && (
              <div className="flex items-center px-3">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            )}
          </div>
          {searchResults && searchResults.length > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Search Results:</p>
              {searchResults.map((profile) => (
                <SearchResultCard 
                  key={profile.userId} 
                  profile={profile}
                  onViewProfile={onViewProfile}
                />
              ))}
            </div>
          )}
          {searchQuery.trim() && searchResults && searchResults.length === 0 && !searchLoading && (
            <p className="mt-4 text-sm text-muted-foreground">No users found matching your search.</p>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends">
            My Friends {friends && friends.length > 0 && `(${friends.length})`}
          </TabsTrigger>
          <TabsTrigger value="requests" className="relative">
            Requests
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full px-1 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-6">
          {friendsError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Backend Feature Unavailable</AlertTitle>
              <AlertDescription>
                The friends list feature is currently unavailable. The backend needs to be updated with the required methods.
              </AlertDescription>
            </Alert>
          )}
          {friendsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : friends && friends.length > 0 ? (
            <div className="space-y-3">
              {friends.map((friend) => (
                <FriendCard 
                  key={friend.toString()} 
                  friendPrincipal={friend} 
                  onRemove={handleRemove}
                  onViewProfile={onViewProfile}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <img
                  src="/assets/generated/friends-icon-transparent.dim_64x64.png"
                  alt="No friends"
                  className="mb-4 h-16 w-16 opacity-50"
                />
                <h3 className="mb-2 text-lg font-semibold">No friends yet</h3>
                <p className="text-muted-foreground">
                  {friendsError ? 'Friends feature is currently unavailable.' : 'Start connecting with people!'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          {requestsError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Backend Feature Unavailable</AlertTitle>
              <AlertDescription>
                The friend requests feature is currently unavailable. The backend needs to be updated with the required methods.
              </AlertDescription>
            </Alert>
          )}
          {requestsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingRequests && pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((requester) => (
                <RequestCard
                  key={requester.userId}
                  requesterProfile={requester}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <UserCheck className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-semibold">No pending requests</h3>
                <p className="text-muted-foreground">
                  {requestsError ? 'Friend requests feature is currently unavailable.' : "You're all caught up!"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
