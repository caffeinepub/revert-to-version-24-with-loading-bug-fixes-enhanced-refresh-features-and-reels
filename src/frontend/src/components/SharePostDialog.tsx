import { useState } from 'react';
import { useGetFriends, useGetProfileByPrincipal, useSharePostToFriend } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Send } from 'lucide-react';
import type { FeedPost } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';

interface SharePostDialogProps {
  post: FeedPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SharePostDialog({ post, open, onOpenChange }: SharePostDialogProps) {
  const { data: friends } = useGetFriends();
  const [message, setMessage] = useState('');
  const sharePost = useSharePostToFriend();

  const handleShare = async (friendPrincipal: Principal) => {
    await sharePost.mutateAsync({
      friendPrincipal,
      postId: post.id,
      message: message || 'Check out this post!',
    });
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
          <DialogDescription>Share this post with your friends</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{post.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold">{post.authorName}</p>
            </div>
            <img src={post.image.getDirectURL()} alt="Post preview" className="w-full rounded object-cover max-h-32" />
            {post.caption && <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{post.caption}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Input
              id="message"
              placeholder="Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Select Friend</Label>
            <ScrollArea className="h-48 rounded-md border p-2">
              {friends && friends.length > 0 ? (
                <div className="space-y-2">
                  {friends.map((friendPrincipal) => (
                    <FriendItem
                      key={friendPrincipal.toString()}
                      friendPrincipal={friendPrincipal}
                      onShare={handleShare}
                      isSharing={sharePost.isPending}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">No friends to share with</p>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FriendItem({ friendPrincipal, onShare, isSharing }: { friendPrincipal: Principal; onShare: (p: Principal) => void; isSharing: boolean }) {
  const { data: profile } = useGetProfileByPrincipal(friendPrincipal);

  if (!profile) return null;

  const avatarUrl = profile.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  return (
    <div className="flex items-center justify-between rounded-lg p-2 hover:bg-muted">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl} alt={profile.name} />
          <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="text-sm font-medium">{profile.name}</p>
      </div>
      <Button
        size="sm"
        onClick={() => onShare(friendPrincipal)}
        disabled={isSharing}
      >
        {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
