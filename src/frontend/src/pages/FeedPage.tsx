import { useState, useEffect } from 'react';
import { useGetAllPosts } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PostCard from '../components/PostCard';
import CreatePostDialog from '../components/CreatePostDialog';

export default function FeedPage() {
  const { data: posts, isLoading, isFetching, error } = useGetAllPosts();
  const [showCreatePost, setShowCreatePost] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
    }, 30000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['allPosts'] });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Feed</h2>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="icon"
            disabled={isFetching}
            title="Refresh feed"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreatePost(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Backend Feature Unavailable</AlertTitle>
          <AlertDescription>
            The posts feed feature is currently unavailable. The backend needs to be updated with the required methods.
          </AlertDescription>
        </Alert>
      )}

      {posts && posts.length > 0 ? (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showDelete={false} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <img
            src="/assets/generated/no-posts-illustration.dim_400x300.png"
            alt="No posts"
            className="mb-4 h-32 w-auto opacity-50"
          />
          <h3 className="mb-2 text-lg font-semibold">No posts yet</h3>
          <p className="mb-4 text-muted-foreground">
            {error ? 'Posts feature is currently unavailable.' : 'Be the first to share something!'}
          </p>
          {!error && (
            <Button onClick={() => setShowCreatePost(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Post
            </Button>
          )}
        </div>
      )}

      <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} />
    </div>
  );
}
