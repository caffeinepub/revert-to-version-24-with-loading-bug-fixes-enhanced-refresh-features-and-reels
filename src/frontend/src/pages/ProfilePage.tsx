import { useState } from 'react';
import { useGetCallerUserProfile, useGetPostsByAuthor, useGetReelsByAuthor, useDeleteAccount } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Edit, Globe, Lock, Trash2 } from 'lucide-react';
import EditProfileDialog from '../components/EditProfileDialog';
import DeleteAccountDialog from '../components/DeleteAccountDialog';
import PostCard from '../components/PostCard';
import ReelCard from '../components/ReelCard';

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading } = useGetCallerUserProfile();
  const currentPrincipal = identity?.getPrincipal() || null;
  const { data: userPosts, isLoading: postsLoading, error: postsError } = useGetPostsByAuthor(currentPrincipal);
  const { data: userReels, isLoading: reelsLoading, error: reelsError } = useGetReelsByAuthor(currentPrincipal);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (profileLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  const avatarUrl = userProfile.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';
  const postCount = userPosts?.length || 0;
  const reelCount = userReels?.length || 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
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
              <p className="mb-4 text-muted-foreground">{userProfile.bio || 'No bio yet'}</p>

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

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => setEditDialogOpen(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <PostCard key={post.id} post={post} showDelete={true} />
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
                <p className="text-muted-foreground">Share your first post!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reels" className="mt-6">
          {reelsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reelsError ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-muted-foreground">Failed to load reels</p>
              </CardContent>
            </Card>
          ) : userReels && userReels.length > 0 ? (
            <div className="space-y-6">
              {userReels.map((reel) => (
                <ReelCard key={reel.id} reel={reel} showDelete={true} />
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
                <p className="text-muted-foreground">Create your first reel!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <EditProfileDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} />
      <DeleteAccountDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen} />
    </div>
  );
}
