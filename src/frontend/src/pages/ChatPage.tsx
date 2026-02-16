import { useState, useEffect, useRef } from 'react';
import { useGetFriends, useGetMessages, useGetSharedPostMessages, useSendMessage, useGetProfileByPrincipal, useEditMessage, useDeleteMessage } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, Loader2, MessageCircle, Image as ImageIcon, Video, X, Menu, Pencil, Trash2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ExternalBlob } from '../backend';
import { MessageStatus } from '../types/backend-types';
import type { Principal } from '@icp-sdk/core/principal';
import type { Message, SharedPostMessage } from '../types/backend-types';
import { toast } from 'sonner';

interface ChatPageProps {
  initialFriendId?: Principal;
  onViewProfile?: (userId: Principal) => void;
  onViewPost?: (postId: string) => void;
}

function FriendListItem({ friendPrincipal, isSelected, onClick }: { friendPrincipal: Principal; isSelected: boolean; onClick: () => void }) {
  const { data: profile } = useGetProfileByPrincipal(friendPrincipal);
  const avatarUrl = profile?.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      }`}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={avatarUrl} alt={profile?.name || 'User'} />
        <AvatarFallback>{profile?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <p className="truncate font-medium">{profile?.name || 'Unknown User'}</p>
      </div>
    </button>
  );
}

function SharedPostPreview({ 
  sharedPost, 
  onViewProfile, 
  onViewPost 
}: { 
  sharedPost: SharedPostMessage; 
  onViewProfile?: (userId: Principal) => void;
  onViewPost?: (postId: string) => void;
}) {
  const { data: postAuthorProfile } = useGetProfileByPrincipal(sharedPost.post.author);
  const postAuthorAvatarUrl = postAuthorProfile?.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewProfile) {
      onViewProfile(sharedPost.post.author);
    }
  };

  const handlePostClick = () => {
    if (onViewPost) {
      onViewPost(sharedPost.post.id);
    }
  };

  return (
    <div className="mt-2 rounded-lg border bg-card p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={handlePostClick}>
      <div 
        className="mb-2 flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={handleProfileClick}
      >
        <Avatar className="h-6 w-6">
          <AvatarImage src={postAuthorAvatarUrl} alt={sharedPost.post.authorName} />
          <AvatarFallback>{sharedPost.post.authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <p className="text-xs font-semibold">{sharedPost.post.authorName}</p>
      </div>
      <img 
        src={sharedPost.post.image.getDirectURL()} 
        alt="Shared post" 
        className="mb-2 w-full rounded-lg object-cover max-h-48"
      />
      <p className="text-xs text-muted-foreground line-clamp-2">{sharedPost.post.caption}</p>
    </div>
  );
}

function FriendsList({ 
  friends, 
  selectedFriend, 
  onSelectFriend 
}: { 
  friends: Principal[]; 
  selectedFriend: Principal | null; 
  onSelectFriend: (friend: Principal) => void;
}) {
  return (
    <div className="space-y-2">
      {friends.map((friend) => (
        <FriendListItem
          key={friend.toString()}
          friendPrincipal={friend}
          isSelected={selectedFriend?.toString() === friend.toString()}
          onClick={() => onSelectFriend(friend)}
        />
      ))}
    </div>
  );
}

function MessageBubble({
  message,
  isCurrentUser,
  timestamp,
  selectedProfile,
  selectedAvatarUrl,
  onEdit,
  onDelete,
  isEditing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
}: {
  message: Message;
  isCurrentUser: boolean;
  timestamp: Date;
  selectedProfile: any;
  selectedAvatarUrl: string;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [touchTimer, setTouchTimer] = useState<NodeJS.Timeout | null>(null);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const isDeleted = message.status === MessageStatus.deleted;
  const isEdited = message.status === MessageStatus.edited;

  const handleTouchStart = () => {
    if (isCurrentUser && !isDeleted) {
      const timer = setTimeout(() => {
        setShowMobileActions(true);
      }, 500);
      setTouchTimer(timer);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer);
      setTouchTimer(null);
    }
  };

  const handleMobileEdit = () => {
    setShowMobileActions(false);
    onEdit();
  };

  const handleMobileDelete = () => {
    setShowMobileActions(false);
    onDelete();
  };

  return (
    <div
      className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage
          src={isCurrentUser ? '/assets/generated/default-avatar.dim_200x200.png' : selectedAvatarUrl}
          alt="User"
        />
        <AvatarFallback className="text-xs">
          {isCurrentUser ? 'ME' : selectedProfile?.name?.slice(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
        <div className="relative group">
          {isDeleted ? (
            <div className="mt-1 max-w-[85vw] md:max-w-md rounded-2xl bg-muted/50 px-4 py-2">
              <p className="text-sm italic text-muted-foreground">Message deleted</p>
            </div>
          ) : isEditing ? (
            <div className="mt-1 max-w-[85vw] md:max-w-md">
              <div className="flex gap-2">
                <Input
                  value={editText}
                  onChange={(e) => onEditTextChange(e.target.value)}
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      onSaveEdit();
                    } else if (e.key === 'Escape') {
                      onCancelEdit();
                    }
                  }}
                />
                <Button size="icon" variant="ghost" onClick={onSaveEdit} className="h-9 w-9">
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={onCancelEdit} className="h-9 w-9">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`mt-1 max-w-[85vw] md:max-w-md overflow-hidden rounded-2xl ${
                  isCurrentUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content.photo && (
                  <img
                    src={message.content.photo.getDirectURL()}
                    alt="Shared photo"
                    className="max-h-64 w-full object-cover"
                  />
                )}
                {message.content.video && (
                  <video
                    src={message.content.video.getDirectURL()}
                    controls
                    className="max-h-64 w-full"
                  />
                )}
                {message.content.text && (
                  <p className="px-4 py-2 text-sm break-words">{message.content.text}</p>
                )}
              </div>
              {isEdited && (
                <span className="text-xs text-muted-foreground italic mt-1">(edited)</span>
              )}
              {/* Desktop hover controls */}
              {isCurrentUser && isHovered && (
                <div className={`hidden md:flex absolute top-1/2 -translate-y-1/2 gap-1 ${isCurrentUser ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full mr-2'}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background shadow-sm"
                    onClick={onEdit}
                    title="Edit message"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground shadow-sm"
                    onClick={onDelete}
                    title="Delete message"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              {/* Mobile touch actions */}
              {showMobileActions && isCurrentUser && (
                <div className="md:hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowMobileActions(false)}>
                  <div className="bg-background rounded-lg p-4 m-4 space-y-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={handleMobileEdit}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit message
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={handleMobileDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete message
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => setShowMobileActions(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SharedMessageBubble({
  sharedPost,
  isCurrentUser,
  timestamp,
  selectedProfile,
  selectedAvatarUrl,
  onViewProfile,
  onViewPost,
}: {
  sharedPost: SharedPostMessage;
  isCurrentUser: boolean;
  timestamp: Date;
  selectedProfile: any;
  selectedAvatarUrl: string;
  onViewProfile?: (userId: Principal) => void;
  onViewPost?: (postId: string) => void;
}) {
  return (
    <div className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage
          src={isCurrentUser ? '/assets/generated/default-avatar.dim_200x200.png' : selectedAvatarUrl}
          alt="User"
        />
        <AvatarFallback className="text-xs">
          {isCurrentUser ? 'ME' : selectedProfile?.name?.slice(0, 2).toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(timestamp, { addSuffix: true })}
        </span>
        <div className="relative group">
          <div
            className={`mt-1 max-w-[85vw] md:max-w-md overflow-hidden rounded-2xl ${
              isCurrentUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            {sharedPost.message.text && (
              <p className="px-4 py-2 text-sm break-words">{sharedPost.message.text}</p>
            )}
            <div className="px-4 pb-4">
              <SharedPostPreview 
                sharedPost={sharedPost} 
                onViewProfile={onViewProfile}
                onViewPost={onViewPost}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage({ initialFriendId, onViewProfile, onViewPost }: ChatPageProps) {
  const { data: friends, isLoading: friendsLoading } = useGetFriends();
  const [selectedFriend, setSelectedFriend] = useState<Principal | null>(initialFriendId || null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const { data: messages, isLoading: messagesLoading } = useGetMessages(selectedFriend);
  const { data: sharedPostMessages } = useGetSharedPostMessages(selectedFriend);
  const { data: selectedProfile } = useGetProfileByPrincipal(selectedFriend);
  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const { identity } = useInternetIdentity();
  const [messageText, setMessageText] = useState('');
  const [mediaPreview, setMediaPreview] = useState<{ type: 'photo' | 'video'; url: string; file: File } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingMessageId, setEditingMessageId] = useState<bigint | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<bigint | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sharedPostMessages]);

  useEffect(() => {
    if (initialFriendId) {
      setSelectedFriend(initialFriendId);
    } else if (friends && friends.length > 0 && !selectedFriend) {
      setSelectedFriend(friends[0]);
    }
  }, [friends, selectedFriend, initialFriendId]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      const url = URL.createObjectURL(file);
      setMediaPreview({ type: 'photo', url, file });
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file');
        return;
      }
      const url = URL.createObjectURL(file);
      setMediaPreview({ type: 'video', url, file });
    }
  };

  const clearMediaPreview = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
    }
    setMediaPreview(null);
    setUploadProgress(0);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriend) return;

    // Must have either text or media
    if (!messageText.trim() && !mediaPreview) return;

    try {
      if (mediaPreview) {
        const arrayBuffer = await mediaPreview.file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });

        await sendMessage.mutateAsync({
          recipient: selectedFriend,
          text: messageText.trim(),
          photo: mediaPreview.type === 'photo' ? blob : null,
          video: mediaPreview.type === 'video' ? blob : null,
        });
        clearMediaPreview();
      } else {
        await sendMessage.mutateAsync({
          recipient: selectedFriend,
          text: messageText.trim(),
          photo: null,
          video: null,
        });
      }
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleHeaderClick = () => {
    if (selectedFriend && onViewProfile) {
      onViewProfile(selectedFriend);
    }
  };

  const handleSelectFriend = (friend: Principal) => {
    setSelectedFriend(friend);
    setMobileSheetOpen(false);
  };

  const handleEditMessage = (messageId: bigint, currentText: string) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingText.trim()) return;

    try {
      await editMessage.mutateAsync({
        messageId: editingMessageId,
        newText: editingText.trim(),
      });
      setEditingMessageId(null);
      setEditingText('');
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleDeleteMessage = (messageId: bigint) => {
    setDeleteConfirmId(messageId);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteMessage.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const currentUserPrincipal = identity?.getPrincipal().toString();
  const selectedAvatarUrl = selectedProfile?.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png';
  const isSending = sendMessage.isPending;

  // Merge messages and shared posts, sorted by timestamp
  const allMessages: Array<{ type: 'message' | 'shared'; data: Message | SharedPostMessage; timestamp: number; messageId?: bigint }> = [];
  
  if (messages) {
    messages.forEach((msg) => {
      allMessages.push({ 
        type: 'message', 
        data: msg, 
        timestamp: Number(msg.content.timestamp),
        messageId: msg.content.timestamp
      });
    });
  }
  
  if (sharedPostMessages) {
    sharedPostMessages.forEach(shared => {
      allMessages.push({ type: 'shared', data: shared, timestamp: Number(shared.message.timestamp) });
    });
  }
  
  allMessages.sort((a, b) => a.timestamp - b.timestamp);

  if (friendsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="container mx-auto flex h-full max-w-4xl items-center justify-center px-4 py-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <img
              src="/assets/generated/chat-icon-transparent.dim_64x64.png"
              alt="No friends"
              className="mb-4 h-16 w-16 opacity-50"
            />
            <h3 className="mb-2 text-lg font-semibold">No friends to chat with</h3>
            <p className="text-muted-foreground">Add friends to start chatting!</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex h-[calc(100vh-8rem)] max-w-6xl gap-4 px-4 py-6 md:h-[calc(100vh-4rem)]">
      {/* Desktop Friends List */}
      <Card className="hidden w-80 md:block">
        <CardContent className="p-4">
          <h3 className="mb-4 font-semibold">Friends</h3>
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <FriendsList 
              friends={friends}
              selectedFriend={selectedFriend}
              onSelectFriend={handleSelectFriend}
            />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {selectedFriend && (
          <>
            {/* Chat Header with Mobile Menu Button */}
            <div className="mb-4 flex items-center gap-2 rounded-lg border bg-card p-4">
              {/* Mobile Friends List Toggle */}
              <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <SheetHeader className="border-b p-4">
                    <SheetTitle>Friends</SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-5rem)] p-4">
                    <FriendsList 
                      friends={friends}
                      selectedFriend={selectedFriend}
                      onSelectFriend={handleSelectFriend}
                    />
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Chat Header Info */}
              <button 
                onClick={handleHeaderClick}
                className="flex flex-1 items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedAvatarUrl} alt={selectedProfile?.name || 'User'} />
                  <AvatarFallback>{selectedProfile?.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <h2 className="font-semibold">{selectedProfile?.name || 'Unknown User'}</h2>
                  <p className="text-sm text-muted-foreground">Online</p>
                </div>
              </button>
            </div>

            <ScrollArea className="flex-1 rounded-lg border bg-card/50 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : allMessages.length > 0 ? (
                  allMessages.map((item, index) => {
                    if (item.type === 'message') {
                      const message = item.data as Message;
                      const isCurrentUser = message.content.sender.toString() === currentUserPrincipal;
                      const timestamp = new Date(Number(message.content.timestamp) / 1000000);
                      const messageId = item.messageId || message.content.timestamp;

                      return (
                        <MessageBubble
                          key={`msg-${index}`}
                          message={message}
                          isCurrentUser={isCurrentUser}
                          timestamp={timestamp}
                          selectedProfile={selectedProfile}
                          selectedAvatarUrl={selectedAvatarUrl}
                          onEdit={() => handleEditMessage(messageId, message.content.text)}
                          onDelete={() => handleDeleteMessage(messageId)}
                          isEditing={editingMessageId === messageId}
                          editText={editingText}
                          onEditTextChange={setEditingText}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                        />
                      );
                    } else {
                      const sharedPost = item.data as SharedPostMessage;
                      const isCurrentUser = sharedPost.message.sender.toString() === currentUserPrincipal;
                      const timestamp = new Date(Number(sharedPost.message.timestamp) / 1000000);

                      return (
                        <SharedMessageBubble
                          key={`shared-${index}`}
                          sharedPost={sharedPost}
                          isCurrentUser={isCurrentUser}
                          timestamp={timestamp}
                          selectedProfile={selectedProfile}
                          selectedAvatarUrl={selectedAvatarUrl}
                          onViewProfile={onViewProfile}
                          onViewPost={onViewPost}
                        />
                      );
                    }
                  })
                ) : (
                  <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                    <MessageCircle className="mb-2 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Media Preview */}
            {mediaPreview && (
              <div className="mt-4 rounded-lg border bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="relative flex-1">
                    {mediaPreview.type === 'photo' ? (
                      <img
                        src={mediaPreview.url}
                        alt="Preview"
                        className="max-h-32 rounded-lg object-cover"
                      />
                    ) : (
                      <video
                        src={mediaPreview.url}
                        className="max-h-32 rounded-lg"
                        controls
                      />
                    )}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                        <span className="text-sm font-medium text-white">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearMediaPreview}
                    disabled={isSending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="mt-4 flex gap-2">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => photoInputRef.current?.click()}
                disabled={isSending || !!mediaPreview}
                title="Send photo"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => videoInputRef.current?.click()}
                disabled={isSending || !!mediaPreview}
                title="Send video"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1"
                disabled={isSending}
              />
              <Button type="submit" disabled={isSending || (!messageText.trim() && !mediaPreview)}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone and the message will be removed for both participants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

