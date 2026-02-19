import React, { useState, useEffect, useRef } from 'react';
import { useActor } from '../hooks/useActor';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useSendMessage, useGetMessages, useEditMessage, useDeleteMessage, useGetFriendsList, useGetCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Loader2, Send, Image as ImageIcon, Video as VideoIcon, Edit2, Trash2, X } from 'lucide-react';
import { ExternalBlob, MessageStatus } from '../backend';
import type { Principal } from '@icp-sdk/core/principal';
import type { Message, UserProfile } from '../backend';

export default function ChatPage() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const [selectedFriend, setSelectedFriend] = useState<Principal | null>(null);
  const [messageText, setMessageText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [editingMessageId, setEditingMessageId] = useState<bigint | null>(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: friendsList = [], isLoading: friendsLoading, error: friendsError } = useGetFriendsList();
  const { data: messages = [], isLoading: messagesLoading, refetch: refetchMessages } = useGetMessages(selectedFriend);
  const sendMessageMutation = useSendMessage();
  const editMessageMutation = useEditMessage();
  const deleteMessageMutation = useDeleteMessage();
  const { data: userProfile } = useGetCallerUserProfile();

  const [friendProfiles, setFriendProfiles] = useState<Map<string, UserProfile>>(new Map());

  useEffect(() => {
    const loadFriendProfiles = async () => {
      if (!actor || friendsList.length === 0) return;

      const profiles = new Map<string, UserProfile>();
      for (const friendPrincipal of friendsList) {
        try {
          const profile = await actor.getUserProfile(friendPrincipal);
          if (profile) {
            profiles.set(friendPrincipal.toString(), profile);
          }
        } catch (error) {
          console.error('Error loading friend profile:', error);
        }
      }
      setFriendProfiles(profiles);
    };

    loadFriendProfiles();
  }, [actor, friendsList]);

  useEffect(() => {
    if (selectedFriend) {
      const interval = setInterval(() => {
        refetchMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedFriend, refetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setVideoFile(null);
      setVideoPreview(null);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  };

  const clearMedia = () => {
    setPhotoFile(null);
    setVideoFile(null);
    setPhotoPreview(null);
    setVideoPreview(null);
    setUploadProgress(0);
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSendMessage = async () => {
    if (!selectedFriend || (!messageText.trim() && !photoFile && !videoFile)) return;

    try {
      let photoBlob: ExternalBlob | null = null;
      let videoBlob: ExternalBlob | null = null;

      if (photoFile) {
        const arrayBuffer = await photoFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        photoBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      if (videoFile) {
        const arrayBuffer = await videoFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        videoBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
          setUploadProgress(percentage);
        });
      }

      await sendMessageMutation.mutateAsync({
        recipient: selectedFriend,
        text: messageText.trim() || '',
        photo: photoBlob,
        video: videoBlob,
      });

      setMessageText('');
      clearMedia();
      refetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEditMessage = async (messageId: bigint) => {
    if (!editText.trim()) return;

    try {
      await editMessageMutation.mutateAsync({
        messageId,
        newText: editText.trim(),
      });
      setEditingMessageId(null);
      setEditText('');
      refetchMessages();
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: bigint) => {
    try {
      await deleteMessageMutation.mutateAsync(messageId);
      refetchMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const startEditing = (message: Message, messageId: bigint) => {
    setEditingMessageId(messageId);
    setEditText(message.content.text);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const getMessageStatus = (message: Message) => {
    if (message.status === MessageStatus.deleted) return '(deleted)';
    if (message.status === MessageStatus.edited) return '(edited)';
    return '';
  };

  const selectedFriendProfile = selectedFriend ? friendProfiles.get(selectedFriend.toString()) : null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Friends Sidebar */}
      <Card className="w-80 p-4 flex flex-col">
        <h2 className="text-xl font-bold mb-4">Friends</h2>
        {friendsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : friendsError ? (
          <div className="text-center py-8 text-destructive">
            Error loading friends
          </div>
        ) : friendsList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No friends yet. Add friends to start chatting!
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {friendsList.map((friendPrincipal) => {
                const profile = friendProfiles.get(friendPrincipal.toString());
                const isSelected = selectedFriend?.toString() === friendPrincipal.toString();
                
                return (
                  <button
                    key={friendPrincipal.toString()}
                    onClick={() => setSelectedFriend(friendPrincipal)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      {profile?.displayPic ? (
                        <AvatarImage src={profile.displayPic.getDirectURL()} alt={profile.name} />
                      ) : null}
                      <AvatarFallback>
                        {profile?.name?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="font-medium truncate">
                        {profile?.name || 'Loading...'}
                      </p>
                      <p className="text-sm opacity-70 truncate">
                        @{profile?.userId || friendPrincipal.toString().slice(0, 8)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {!selectedFriend ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a friend to start chatting
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {selectedFriendProfile?.displayPic ? (
                  <AvatarImage src={selectedFriendProfile.displayPic.getDirectURL()} alt={selectedFriendProfile.name} />
                ) : null}
                <AvatarFallback>
                  {selectedFriendProfile?.name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedFriendProfile?.name || 'Loading...'}</p>
                <p className="text-sm text-muted-foreground">
                  @{selectedFriendProfile?.userId || selectedFriend.toString().slice(0, 8)}
                </p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isOwnMessage = msg.content.sender.toString() === identity?.getPrincipal().toString();
                    const messageId = BigInt(index);
                    const isDeleted = msg.status === MessageStatus.deleted;

                    return (
                      <div
                        key={index}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {isDeleted ? (
                            <p className="italic opacity-70">{getMessageStatus(msg)}</p>
                          ) : (
                            <>
                              {msg.content.photo && (
                                <img
                                  src={msg.content.photo.getDirectURL()}
                                  alt="Shared photo"
                                  className="rounded-lg mb-2 max-w-full"
                                />
                              )}
                              {msg.content.video && (
                                <video
                                  src={msg.content.video.getDirectURL()}
                                  controls
                                  className="rounded-lg mb-2 max-w-full"
                                />
                              )}
                              {editingMessageId === messageId ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="min-h-[60px]"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => handleEditMessage(messageId)}
                                      disabled={editMessageMutation.isPending}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEditing}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="whitespace-pre-wrap break-words">
                                    {msg.content.text}
                                  </p>
                                  {msg.status === MessageStatus.edited && (
                                    <p className="text-xs opacity-70 mt-1">{getMessageStatus(msg)}</p>
                                  )}
                                </>
                              )}
                              {isOwnMessage && !isDeleted && editingMessageId !== messageId && (
                                <div className="flex gap-2 mt-2">
                                  <button
                                    onClick={() => startEditing(msg, messageId)}
                                    className="opacity-70 hover:opacity-100"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMessage(messageId)}
                                    className="opacity-70 hover:opacity-100"
                                    disabled={deleteMessageMutation.isPending}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t space-y-3">
              {(photoPreview || videoPreview) && (
                <div className="relative inline-block">
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="max-h-32 rounded-lg" />
                  )}
                  {videoPreview && (
                    <video src={videoPreview} className="max-h-32 rounded-lg" controls />
                  )}
                  <button
                    onClick={clearMedia}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="absolute bottom-2 left-2 right-2 bg-background/80 rounded-full h-2">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={sendMessageMutation.isPending}
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={sendMessageMutation.isPending}
                >
                  <VideoIcon className="h-5 w-5" />
                </Button>
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sendMessageMutation.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || (!messageText.trim() && !photoFile && !videoFile)}
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
