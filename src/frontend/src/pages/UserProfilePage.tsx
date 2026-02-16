import { useState, useEffect } from 'react';
import { useGetProfileByPrincipal, useGetProfileByUserId, useGetPostsByAuthor, useGetReelsByAuthor, useSendFriendRequest, useRemoveFriend, useCheckFriendshipStatus, useCancelFriendRequest } from '../hooks/useQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, UserMinus, Globe, Lock, X, ArrowLeft } from 'lucide-react';
import PostCard from '../components/PostCard';
import ReelCard from '../components/ReelCard';
import { Principal } from '@icp-sdk/core/principal';

interface UserProfilePageProps {
  userId?: string;
  userPrincipal?: Principal;
  onBack?: () => void;
}

export default function UserProfilePage({ userId, userPrincipal, onBack }: UserProfilePageProps) {
  const [effectivePrincipal, setEffectivePrincipal] = useState<Principal | null>(userPrincipal || null);

  const { data: profileByUserId } = useGetProfileByUserId(userId || null);
  const { data: profileByPrincipal } = useGetProfileByPrincipal(effectivePrincipal);

  useEffect(() => {
    if (userId && profileByUserId) {
      // We don't have a way to get Principal from userId in the frontend
      // So we'll just use the profile data we have
    } else if (userPrincipal) {
      setEffectivePrincipal(userPrincipal);
    }
  }, [userId, profileByUserId, userPrincipal]);

  const userProfile = profileByPrincipal || profileByUserId;

  const { data: userPosts, isLoading: postsLoading, error: postsError } = useGetPostsByAuthor(effectivePrincipal || null);
  const { data: userReels, isLoading: reelsLoading } = useGetReelsByAuthor(effectivePrincipal || null);

  const { isFriend, isPendingSent, isCurrentUser } = useCheckFriendshipStatus(effectivePrincipal);
  const sendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const cancelRequest = useCancelFriendRequest();

  const handleSendRequest = async () => {
    if (userProfile?.userId) {
      await sendRequest.mutateAsync(userProfile.userId);
    }
  };

  const handleRemoveFriend = async () => {
    if (effectivePrincipal) {
      await removeFriend.mutateAsync(effectivePrincipal);
    }
  };

  const handleCancelRequest = async () => {
    if (userProfile?.userId) {
      await cancelRequest.mutateAsync(userProfile.userId);
    }
  };

  if (!userProfile) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const avatarUrl = userProfile.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';
  const postCount = userPosts?.length || 0;
  const reelCount = userReels?.length || 0;

  const canViewContent = userProfile.isPublic || isFriend || isCurrentUser;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <Avatar className="h-32 w-32">
              <AvatarImage src={avatarUrl} alt={userProfile.name} />
              <AvatarFallback className="text-3xl">{userProfile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="mb-2 flex flex-col items-center gap-2 md:flex-row md:items-center">
                <h2 className="text-2xl font-bold">{userProfile.name}</h2>
                <Badge variant={userProfile.isPublic ? 'default' : 'secondary'} className="gap-1">
                  {userProfile.isPublic ? (
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
              <p className="mb-4 text-sm text-muted-foreground">@{userProfile.userId}</p>
              {canViewContent && <p className="mb-4 text-muted-foreground">{userProfile.bio || 'No bio yet'}</p>}

              {canViewContent && (
                <div className="mb-4 flex justify-center gap-6 md:justify-start">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{postCount}</p>
                    <p className="text-sm text-muted-foreground">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{reelCount}</p>
                    <p className="text-sm text-muted-foreground">Reels</p>
                  </div>
                </div>
              )}

              {!isCurrentUser && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  {isFriend ? (
                    <Button variant="outline" onClick={handleRemoveFriend} disabled={removeFriend.isPending} className="gap-2">
                      {removeFriend.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                      Remove Friend
                    </Button>
                  ) : isPendingSent ? (
                    <Button variant="outline" onClick={handleCancelRequest} disabled={cancelRequest.isPending} className="gap-2">
                      {cancelRequest.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Cancel Request
                    </Button>
                  ) : (
                    <Button onClick={handleSendRequest} disabled={sendRequest.isPending} className="gap-2">
                      {sendRequest.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Add Friend
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!canViewContent ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="mb-4 h-16 w-16 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">Private Profile</h3>
            <p className="text-muted-foreground">This profile is private. Add them as a friend to see their posts.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts">Posts ({postCount})</TabsTrigger>
            <TabsTrigger value="reels">Reels ({reelCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {postsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : postsError ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-muted-foreground">Failed to load posts</p>
                </CardContent>
              </Card>
            ) : userPosts && userPosts.length > 0 ? (
              <div className="space-y-6">
                {userPosts.map((post) => (
                  <PostCard key={post.id} post={post} showDelete={false} />
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
                  <p className="text-muted-foreground">This user hasn't shared any posts.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reels" className="mt-6">
            {reelsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userReels && userReels.length > 0 ? (
              <div className="space-y-6">
                {userReels.map((reel) => (
                  <ReelCard key={reel.id} reel={reel} showDelete={false} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <img
                    src="/assets/generated/reels-icon-transparent.dim_64x64.png"
                    alt="No reels"
                    className="mb-4 h-32 w-32 opacity-50"
                  />
                  <h3 className="mb-2 text-lg font-semibold">No reels yet</h3>
                  <p className="text-muted-foreground">This user hasn't created any reels.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
