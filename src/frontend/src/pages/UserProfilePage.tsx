import { useEffect } from 'react';
import { useGetProfileByPrincipal, useGetProfileByUserId, useGetPostsByAuthor, useGetReelsByAuthor, useSendFriendRequest, useCheckFriendshipStatus, useCancelFriendRequest, useAcceptFriendRequest, useRemoveFriend } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, UserPlus, UserCheck, UserMinus, X, Lock } from 'lucide-react';
import { Principal } from '@icp-sdk/core/principal';
import PostCard from '../components/PostCard';
import ReelCard from '../components/ReelCard';

interface UserProfilePageProps {
  userPrincipal?: Principal | null;
  userId?: string | null;
  onBack?: () => void;
  onNavigate?: (page: string, data?: any) => void;
}

export default function UserProfilePage({ userPrincipal, userId, onBack, onNavigate }: UserProfilePageProps) {
  const { identity } = useInternetIdentity();
  
  const { data: profileByPrincipal } = useGetProfileByPrincipal(userPrincipal || null);
  const { data: profileByUserId } = useGetProfileByUserId(userId || null);
  
  const profile = profileByPrincipal || profileByUserId;
  
  const effectivePrincipal = userPrincipal || (profileByUserId ? Principal.fromText(profile?.userId || '') : null);
  
  const friendshipStatus = useCheckFriendshipStatus(effectivePrincipal);
  const { data: posts } = useGetPostsByAuthor(effectivePrincipal);
  const { data: reels } = useGetReelsByAuthor(effectivePrincipal);
  const sendRequest = useSendFriendRequest();
  const cancelRequest = useCancelFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const removeFriend = useRemoveFriend();

  const { isFriend, isPendingSent, isCurrentUser } = friendshipStatus.data || {
    isFriend: false,
    isPendingReceived: false,
    isPendingSent: false,
    isCurrentUser: false,
  };

  const canViewContent = isCurrentUser || profile?.isPublic || isFriend;

  const handleSendRequest = async () => {
    if (profile?.userId) {
      await sendRequest.mutateAsync(profile.userId);
    }
  };

  const handleCancelRequest = async () => {
    if (profile?.userId) {
      await cancelRequest.mutateAsync(profile.userId);
    }
  };

  const handleAcceptRequest = async () => {
    if (effectivePrincipal) {
      await acceptRequest.mutateAsync(effectivePrincipal);
    }
  };

  const handleRemoveFriend = async () => {
    if (effectivePrincipal) {
      await removeFriend.mutateAsync(effectivePrincipal);
    }
  };

  if (!profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const avatarUrl = profile.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={avatarUrl} alt={profile.name} />
              <AvatarFallback className="text-2xl">{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <Badge variant={profile.isPublic ? 'default' : 'secondary'}>
                  {profile.isPublic ? 'Public' : 'Private'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">@{profile.userId}</p>
              <p className="mt-2 text-sm">{profile.bio || 'No bio'}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="font-semibold">{posts?.length || 0}</span> Posts
                </div>
                <div>
                  <span className="font-semibold">{reels?.length || 0}</span> Reels
                </div>
              </div>
            </div>
            {!isCurrentUser && (
              <div className="flex gap-2">
                {isFriend ? (
                  <Button variant="outline" onClick={handleRemoveFriend} disabled={removeFriend.isPending}>
                    {removeFriend.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="mr-2 h-4 w-4" />
                    )}
                    Unfriend
                  </Button>
                ) : isPendingSent ? (
                  <Button variant="outline" onClick={handleCancelRequest} disabled={cancelRequest.isPending}>
                    {cancelRequest.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-2 h-4 w-4" />
                    )}
                    Cancel Request
                  </Button>
                ) : (
                  <Button onClick={handleSendRequest} disabled={sendRequest.isPending}>
                    {sendRequest.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Add Friend
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canViewContent ? (
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts ({posts?.length || 0})</TabsTrigger>
            <TabsTrigger value="reels">Reels ({reels?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {posts && posts.length > 0 ? (
              <div className="space-y-6">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} showDelete={isCurrentUser} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <img
                    src="/assets/generated/no-posts-illustration.dim_400x300.png"
                    alt="No posts"
                    className="mb-4 h-32 w-32 opacity-50"
                  />
                  <h3 className="mb-2 text-lg font-semibold">No posts yet</h3>
                  <p className="text-muted-foreground">
                    {isCurrentUser ? "You haven't created any posts yet." : "This user hasn't posted anything yet."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-6">
            {reels && reels.length > 0 ? (
              <div className="space-y-6">
                {reels.map((reel) => (
                  <ReelCard key={reel.id} reel={reel} showDelete={isCurrentUser} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <img
                    src="/assets/generated/reels-icon-transparent.dim_64x64.png"
                    alt="No reels"
                    className="mb-4 h-16 w-16 opacity-50"
                  />
                  <h3 className="mb-2 text-lg font-semibold">No reels yet</h3>
                  <p className="text-muted-foreground">
                    {isCurrentUser ? "You haven't created any reels yet." : "This user hasn't posted any reels yet."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">Private Profile</h3>
            <p className="text-muted-foreground">
              This profile is private. Send a friend request to view their posts and reels.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
