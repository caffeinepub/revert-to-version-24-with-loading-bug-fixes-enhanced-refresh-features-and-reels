import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { useLikePost, useUnlikePost, useGetPostLikeCount, useGetPostCommentCount, useDeletePost, useGetCallerUserProfile } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import SharePostDialog from './SharePostDialog';
import type { FeedPost } from '../backend';

interface PostCardProps {
  post: FeedPost;
  showDelete?: boolean;
}

export function PostCard({ post, showDelete = false }: PostCardProps) {
  const { identity } = useInternetIdentity();
  const [isLiked, setIsLiked] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const likePostMutation = useLikePost();
  const unlikePostMutation = useUnlikePost();
  const deletePostMutation = useDeletePost();

  const { data: likeCount = 0n } = useGetPostLikeCount(post.id);
  const { data: commentCount = 0n } = useGetPostCommentCount(post.id);
  const { data: userProfile } = useGetCallerUserProfile();

  const isOwnPost = identity?.getPrincipal().toString() === post.author.toString();

  const handleLike = async () => {
    try {
      if (isLiked) {
        await unlikePostMutation.mutateAsync(post.id);
        setIsLiked(false);
      } else {
        await likePostMutation.mutateAsync(post.id);
        setIsLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deletePostMutation.mutateAsync(post.id);
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const imageUrl = post.image.getDirectURL();

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-3 pb-3">
          <Avatar className="h-10 w-10">
            {userProfile?.displayPic ? (
              <AvatarImage src={userProfile.displayPic.getDirectURL()} alt={post.authorName} />
            ) : null}
            <AvatarFallback>{post.authorName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold">
              {post.authorName}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(Number(post.timestamp) / 1000000).toLocaleDateString()}
            </p>
          </div>
          {showDelete && isOwnPost && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={deletePostMutation.isPending}
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <div className="relative bg-muted">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}
            {imageError ? (
              <div className="flex items-center justify-center h-64 bg-muted text-muted-foreground">
                Failed to load image
              </div>
            ) : (
              <img
                src={imageUrl}
                alt={post.caption || 'Post image'}
                className={`w-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            )}
          </div>
          {post.caption && (
            <div className="p-4">
              <p className="whitespace-pre-wrap break-words">{post.caption}</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center gap-4 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={likePostMutation.isPending || unlikePostMutation.isPending}
            className="gap-2"
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
            <span>{Number(likeCount)}</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <MessageCircle className="h-5 w-5" />
            <span>{Number(commentCount)}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowShareDialog(true)}
            className="gap-2"
          >
            <Share2 className="h-5 w-5" />
          </Button>
        </CardFooter>
      </Card>

      <SharePostDialog
        post={post}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </>
  );
}

export default PostCard;
