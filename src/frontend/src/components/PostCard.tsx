import { useState } from 'react';
import { useGetPostLikeCount, useGetPostCommentCount, useHasUserLikedPost, useLikePost, useUnlikePost, useGetComments, useAddComment, useDeletePost, useGetFriends, useGetProfileByPrincipal } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
import { Heart, MessageCircle, Trash2, Send, Loader2, Share2 } from 'lucide-react';
import type { FeedPost } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';
import SharePostDialog from './SharePostDialog';

interface PostCardProps {
  post: FeedPost;
  showDelete: boolean;
  onViewProfile?: (userId: Principal) => void;
}

export default function PostCard({ post, showDelete, onViewProfile }: PostCardProps) {
  const { identity } = useInternetIdentity();
  const { data: likeCount = 0 } = useGetPostLikeCount(post.id);
  const { data: commentCount = 0 } = useGetPostCommentCount(post.id);
  const { data: hasLiked } = useHasUserLikedPost(post.id);
  const { data: comments } = useGetComments(post.id);
  const { data: friends } = useGetFriends();
  const { data: authorProfile } = useGetProfileByPrincipal(post.author);
  const likePost = useLikePost();
  const unlikePost = useUnlikePost();
  const addComment = useAddComment();
  const deletePost = useDeletePost();
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const isAuthor = identity?.getPrincipal().toString() === post.author.toString();
  const imageUrl = post.image.getDirectURL();
  const hasFriends = friends && friends.length > 0;
  const authorAvatarUrl = authorProfile?.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  const handleLike = async () => {
    if (hasLiked) {
      await unlikePost.mutateAsync(post.id);
    } else {
      await likePost.mutateAsync(post.id);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync({ postId: post.id, text: commentText });
    setCommentText('');
  };

  const handleDelete = async () => {
    await deletePost.mutateAsync(post.id);
  };

  const handleAuthorClick = () => {
    if (onViewProfile && !isAuthor) {
      onViewProfile(post.author);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div 
              className={`flex items-center gap-3 ${!isAuthor ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
              onClick={handleAuthorClick}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={authorAvatarUrl} alt={post.authorName} />
                <AvatarFallback>{post.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{post.authorName}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(Number(post.timestamp) / 1000000).toLocaleDateString()}
                </p>
              </div>
            </div>
            {showDelete && isAuthor && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <img src={imageUrl} alt="Post" className="mb-4 w-full rounded-lg object-cover" />

          {post.caption && <p className="mb-4 text-sm">{post.caption}</p>}

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`gap-2 ${hasLiked ? 'text-red-500' : ''}`}
              disabled={likePost.isPending || unlikePost.isPending}
            >
              {likePost.isPending || unlikePost.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart className={`h-4 w-4 ${hasLiked ? 'fill-current' : ''}`} />
              )}
              {likeCount}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowComments(!showComments)} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {commentCount}
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowShareDialog(true)}
              className="gap-2"
              disabled={!hasFriends}
              title={hasFriends ? 'Share post' : 'Add friends to share posts'}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </CardContent>

        {showComments && (
          <CardFooter className="flex-col items-stretch border-t p-4">
            <div className="mb-4 max-h-60 space-y-3 overflow-y-auto">
              {comments && comments.length > 0 ? (
                comments.map((comment, index) => (
                  <div key={index} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/assets/generated/default-avatar.dim_200x200.png" alt={comment.authorName} />
                      <AvatarFallback>{comment.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{comment.authorName}</span> {comment.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(Number(comment.timestamp) / 1000000).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground">No comments yet</p>
              )}
            </div>
            <Separator className="mb-4" />
            <div className="flex gap-2">
              <Input
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <Button onClick={handleAddComment} disabled={!commentText.trim() || addComment.isPending} size="icon">
                {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>

      <SharePostDialog 
        post={post}
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </>
  );
}
