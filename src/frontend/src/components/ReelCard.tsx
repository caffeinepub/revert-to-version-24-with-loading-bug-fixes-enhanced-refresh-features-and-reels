import { useState, useRef } from 'react';
import { useGetReelLikeCount, useGetReelCommentCount, useHasUserLikedReel, useLikeReel, useUnlikeReel, useGetComments, useAddCommentToReel, useDeleteReel, useGetProfileByPrincipal } from '../hooks/useQueries';
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
import { Heart, MessageCircle, Trash2, Send, Loader2 } from 'lucide-react';
import type { Reel } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

interface ReelCardProps {
  reel: Reel;
  showDelete: boolean;
  onViewProfile?: (userId: Principal) => void;
}

export default function ReelCard({ reel, showDelete, onViewProfile }: ReelCardProps) {
  const { identity } = useInternetIdentity();
  const { data: likeCount = 0 } = useGetReelLikeCount(reel.id);
  const { data: commentCount = 0 } = useGetReelCommentCount(reel.id);
  const { data: hasLiked } = useHasUserLikedReel(reel.id);
  const { data: comments } = useGetComments(reel.id);
  const { data: authorProfile } = useGetProfileByPrincipal(reel.author);
  const likeReel = useLikeReel();
  const unlikeReel = useUnlikeReel();
  const addComment = useAddCommentToReel();
  const deleteReel = useDeleteReel();
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isAuthor = identity?.getPrincipal().toString() === reel.author.toString();
  const videoUrl = reel.videoUrl.getDirectURL();
  const authorAvatarUrl = authorProfile?.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  const handleLike = async () => {
    if (hasLiked) {
      await unlikeReel.mutateAsync(reel.id);
    } else {
      await likeReel.mutateAsync(reel.id);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addComment.mutateAsync({ reelId: reel.id, text: commentText });
    setCommentText('');
  };

  const handleDelete = async () => {
    await deleteReel.mutateAsync(reel.id);
  };

  const handleAuthorClick = () => {
    if (onViewProfile && !isAuthor) {
      onViewProfile(reel.author);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div 
            className={`flex items-center gap-3 ${!isAuthor ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
            onClick={handleAuthorClick}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={authorAvatarUrl} alt={reel.authorName} />
              <AvatarFallback>{reel.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{reel.authorName}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(Number(reel.timestamp) / 1000000).toLocaleDateString()}
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
                  <AlertDialogTitle>Delete Reel</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this reel? This action cannot be undone.
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

        <div className="relative mb-4 w-full overflow-hidden rounded-lg bg-black" style={{ maxHeight: '600px' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full object-contain"
            controls
            loop
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

        {reel.caption && <p className="mb-4 text-sm">{reel.caption}</p>}

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={`gap-2 ${hasLiked ? 'text-red-500' : ''}`}
            disabled={likeReel.isPending || unlikeReel.isPending}
          >
            {likeReel.isPending || unlikeReel.isPending ? (
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
  );
}
