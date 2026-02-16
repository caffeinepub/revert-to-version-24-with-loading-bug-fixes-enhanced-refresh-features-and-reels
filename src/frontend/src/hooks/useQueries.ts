import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { UserProfile, Comment, Message, Notification } from '../types/backend-types';
import type { FeedPost, Reel as BackendReel, SimplifiedUserProfile } from '../backend';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';

// Helper function to check if a method exists on the actor
function hasMethod(actor: any, methodName: string): boolean {
  return actor && typeof actor[methodName] === 'function';
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();
  const { identity } = useInternetIdentity();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'getCallerUserProfile')) {
        throw new Error('Backend method getCallerUserProfile not available');
      }
      const profile = await (actor as any).getCallerUserProfile();
      return profile;
    },
    enabled: !!actor && !actorFetching && !!identity,
    retry: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && !actorFetching && query.isFetched,
  };
}

export function useGetProfileByPrincipal(principal: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['profileByPrincipal', principal?.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      if (!hasMethod(actor, 'getUserProfile')) {
        console.warn('Backend method getUserProfile not available');
        return null;
      }
      return await (actor as any).getUserProfile(principal);
    },
    enabled: !!actor && !actorFetching && !!principal,
    retry: 1,
  });
}

export function useGetProfileByUserId(userId: string | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['profileByUserId', userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      if (!hasMethod(actor, 'getUserProfileByUserId')) {
        console.warn('Backend method getUserProfileByUserId not available');
        return null;
      }
      return await (actor as any).getUserProfileByUserId(userId);
    },
    enabled: !!actor && !actorFetching && !!userId,
    retry: 1,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'saveCallerUserProfile')) {
        throw new Error('Backend method saveCallerUserProfile not available');
      }
      await (actor as any).saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save profile');
    },
  });
}

// Alias for EditProfileDialog compatibility
export function useUpdateProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      username,
      bio,
      displayPic,
      isPublic,
    }: {
      userId: string;
      username: string;
      bio: string;
      displayPic: ExternalBlob | null;
      isPublic: boolean;
    }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'saveCallerUserProfile')) {
        throw new Error('Backend method saveCallerUserProfile not available');
      }
      const profile: UserProfile = {
        userId,
        name: username,
        bio,
        displayPic,
        isPublic,
      };
      await (actor as any).saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });
}

// Search User Profiles
export function useSearchUserProfiles(searchQuery: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<SimplifiedUserProfile[]>({
    queryKey: ['searchProfiles', searchQuery],
    queryFn: async () => {
      if (!actor) {
        toast.error('Actor not available');
        return [];
      }
      if (!hasMethod(actor, 'searchProfiles')) {
        toast.error('Search feature is currently unavailable');
        return [];
      }
      try {
        const results = await (actor as any).searchProfiles(searchQuery);
        return results || [];
      } catch (error: any) {
        console.error('Search error:', error);
        toast.error('Failed to search users');
        return [];
      }
    },
    enabled: !!actor && !actorFetching && searchQuery.trim().length > 0,
    retry: 1,
    staleTime: 30 * 1000,
  });
}

// Posts Queries
export function useGetAllPosts() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FeedPost[]>({
    queryKey: ['posts'],
    queryFn: async () => {
      if (!actor) return [];
      if (!hasMethod(actor, 'getAllPosts')) {
        console.warn('Backend method getAllPosts not available');
        return [];
      }
      return await (actor as any).getAllPosts();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
  });
}

export function useGetPostsByAuthor(author: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FeedPost[]>({
    queryKey: ['postsByAuthor', author?.toString()],
    queryFn: async () => {
      if (!actor || !author) return [];
      if (!hasMethod(actor, 'getPostsByAuthor')) {
        console.warn('Backend method getPostsByAuthor not available');
        return [];
      }
      return await (actor as any).getPostsByAuthor(author);
    },
    enabled: !!actor && !actorFetching && !!author,
    retry: 1,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ image, caption }: { image: ExternalBlob; caption: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'createPost')) {
        throw new Error('Backend method createPost not available');
      }
      return await (actor as any).createPost(image, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create post');
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'deletePost')) {
        throw new Error('Backend method deletePost not available');
      }
      await (actor as any).deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['postsByAuthor'] });
      toast.success('Post deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete post');
    },
  });
}

// Reels Queries
export function useGetAllReels() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<BackendReel[]>({
    queryKey: ['reels'],
    queryFn: async () => {
      if (!actor) return [];
      if (!hasMethod(actor, 'getAllReels')) {
        console.warn('Backend method getAllReels not available');
        return [];
      }
      return await (actor as any).getAllReels();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
  });
}

export function useGetReelsByAuthor(author: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<BackendReel[]>({
    queryKey: ['reelsByAuthor', author?.toString()],
    queryFn: async () => {
      if (!actor || !author) return [];
      if (!hasMethod(actor, 'getReelsByAuthor')) {
        console.warn('Backend method getReelsByAuthor not available');
        return [];
      }
      return await (actor as any).getReelsByAuthor(author);
    },
    enabled: !!actor && !actorFetching && !!author,
    retry: 1,
  });
}

export function useCreateReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoUrl, caption }: { videoUrl: ExternalBlob; caption: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'createReel')) {
        throw new Error('Backend method createReel not available');
      }
      return await (actor as any).createReel(videoUrl, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      toast.success('Reel created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create reel');
    },
  });
}

export function useDeleteReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'deleteReel')) {
        throw new Error('Backend method deleteReel not available');
      }
      await (actor as any).deleteReel(reelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      queryClient.invalidateQueries({ queryKey: ['reelsByAuthor'] });
      toast.success('Reel deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete reel');
    },
  });
}

// Likes and Comments
export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'likePost')) {
        throw new Error('Backend method likePost not available');
      }
      await (actor as any).likePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['postLikeCount', postId] });
      queryClient.invalidateQueries({ queryKey: ['hasUserLikedPost', postId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like post');
    },
  });
}

export function useUnlikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'unlikePost')) {
        throw new Error('Backend method unlikePost not available');
      }
      await (actor as any).unlikePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['postLikeCount', postId] });
      queryClient.invalidateQueries({ queryKey: ['hasUserLikedPost', postId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unlike post');
    },
  });
}

export function useLikeReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'likeReel')) {
        throw new Error('Backend method likeReel not available');
      }
      await (actor as any).likeReel(reelId);
    },
    onSuccess: (_, reelId) => {
      queryClient.invalidateQueries({ queryKey: ['reelLikeCount', reelId] });
      queryClient.invalidateQueries({ queryKey: ['hasUserLikedReel', reelId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to like reel');
    },
  });
}

export function useUnlikeReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'unlikeReel')) {
        throw new Error('Backend method unlikeReel not available');
      }
      await (actor as any).unlikeReel(reelId);
    },
    onSuccess: (_, reelId) => {
      queryClient.invalidateQueries({ queryKey: ['reelLikeCount', reelId] });
      queryClient.invalidateQueries({ queryKey: ['hasUserLikedReel', reelId] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unlike reel');
    },
  });
}

export function useAddCommentToPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'addCommentToPost')) {
        throw new Error('Backend method addCommentToPost not available');
      }
      await (actor as any).addCommentToPost(postId, text);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['postCommentCount', postId] });
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
}

// Alias for PostCard compatibility
export function useAddComment() {
  return useAddCommentToPost();
}

export function useAddCommentToReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reelId, text }: { reelId: string; text: string }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'addCommentToReel')) {
        throw new Error('Backend method addCommentToReel not available');
      }
      await (actor as any).addCommentToReel(reelId, text);
    },
    onSuccess: (_, { reelId }) => {
      queryClient.invalidateQueries({ queryKey: ['reelCommentCount', reelId] });
      queryClient.invalidateQueries({ queryKey: ['comments', reelId] });
      toast.success('Comment added');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
}

export function useGetPostLikeCount(postId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<number>({
    queryKey: ['postLikeCount', postId],
    queryFn: async () => {
      if (!actor) return 0;
      if (!hasMethod(actor, 'getPostLikeCount')) {
        console.warn('Backend method getPostLikeCount not available');
        return 0;
      }
      const count = await (actor as any).getPostLikeCount(postId);
      return Number(count);
    },
    enabled: !!actor && !actorFetching && !!postId,
    retry: 1,
  });
}

export function useGetPostCommentCount(postId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<number>({
    queryKey: ['postCommentCount', postId],
    queryFn: async () => {
      if (!actor) return 0;
      if (!hasMethod(actor, 'getPostCommentCount')) {
        console.warn('Backend method getPostCommentCount not available');
        return 0;
      }
      const count = await (actor as any).getPostCommentCount(postId);
      return Number(count);
    },
    enabled: !!actor && !actorFetching && !!postId,
    retry: 1,
  });
}

export function useGetReelLikeCount(reelId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<number>({
    queryKey: ['reelLikeCount', reelId],
    queryFn: async () => {
      if (!actor) return 0;
      if (!hasMethod(actor, 'getReelLikeCount')) {
        console.warn('Backend method getReelLikeCount not available');
        return 0;
      }
      const count = await (actor as any).getReelLikeCount(reelId);
      return Number(count);
    },
    enabled: !!actor && !actorFetching && !!reelId,
    retry: 1,
  });
}

export function useGetReelCommentCount(reelId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<number>({
    queryKey: ['reelCommentCount', reelId],
    queryFn: async () => {
      if (!actor) return 0;
      if (!hasMethod(actor, 'getReelCommentCount')) {
        console.warn('Backend method getReelCommentCount not available');
        return 0;
      }
      const count = await (actor as any).getReelCommentCount(reelId);
      return Number(count);
    },
    enabled: !!actor && !actorFetching && !!reelId,
    retry: 1,
  });
}

// Check if user has liked post/reel (client-side stub - backend doesn't have this method)
export function useHasUserLikedPost(postId: string) {
  return useQuery<boolean>({
    queryKey: ['hasUserLikedPost', postId],
    queryFn: async () => {
      // Backend doesn't have this method, return false as default
      return false;
    },
    enabled: false,
  });
}

export function useHasUserLikedReel(reelId: string) {
  return useQuery<boolean>({
    queryKey: ['hasUserLikedReel', reelId],
    queryFn: async () => {
      // Backend doesn't have this method, return false as default
      return false;
    },
    enabled: false,
  });
}

// Get comments (stub - backend doesn't expose this method)
export function useGetComments(contentId: string) {
  return useQuery<Comment[]>({
    queryKey: ['comments', contentId],
    queryFn: async () => {
      // Backend doesn't expose getComments method
      return [];
    },
    enabled: false,
  });
}

// Messages
export function useGetMessages(otherUser: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Message[]>({
    queryKey: ['messages', otherUser?.toString()],
    queryFn: async () => {
      if (!actor || !otherUser) return [];
      if (!hasMethod(actor, 'getMessages')) {
        console.warn('Backend method getMessages not available');
        return [];
      }
      return await (actor as any).getMessages(otherUser);
    },
    enabled: !!actor && !actorFetching && !!otherUser,
    retry: 1,
    refetchInterval: 3000,
  });
}

// Stub for shared post messages (backend doesn't have this feature)
export function useGetSharedPostMessages(otherUser: Principal | null) {
  return useQuery<any[]>({
    queryKey: ['sharedPostMessages', otherUser?.toString()],
    queryFn: async () => {
      // Backend doesn't have shared post messages feature
      return [];
    },
    enabled: false,
  });
}

export function useSendMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recipient,
      text,
      photo,
      video,
    }: {
      recipient: Principal;
      text: string;
      photo: ExternalBlob | null;
      video: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'sendMessage')) {
        throw new Error('Backend method sendMessage not available');
      }
      return await (actor as any).sendMessage(recipient, text, photo, video);
    },
    onSuccess: (_, { recipient }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', recipient.toString()] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    },
  });
}

export function useEditMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, newText }: { messageId: bigint; newText: string }) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'editMessage')) {
        throw new Error('Backend method editMessage not available');
      }
      await (actor as any).editMessage(messageId, newText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message edited');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to edit message');
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'deleteMessage')) {
        throw new Error('Backend method deleteMessage not available');
      }
      await (actor as any).deleteMessage(messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete message');
    },
  });
}

// Friends
export function useGetFriends() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['friends'],
    queryFn: async () => {
      if (!actor) return [];
      console.warn('Backend method getFriends not available - friends feature not implemented');
      return [];
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useGetPendingRequests() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile[]>({
    queryKey: ['pendingRequests'],
    queryFn: async () => {
      if (!actor) return [];
      console.warn('Backend method getPendingRequests not available - friend requests feature not implemented');
      return [];
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useSendFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'sendFriendRequest')) {
        throw new Error('Backend method sendFriendRequest not available');
      }
      await (actor as any).sendFriendRequest(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      toast.success('Friend request sent');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send friend request');
    },
  });
}

export function useAcceptFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requesterPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'acceptFriendRequest')) {
        throw new Error('Backend method acceptFriendRequest not available');
      }
      await (actor as any).acceptFriendRequest(requesterPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      toast.success('Friend request accepted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to accept friend request');
    },
  });
}

export function useDeclineFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requesterPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'declineFriendRequest')) {
        throw new Error('Backend method declineFriendRequest not available');
      }
      await (actor as any).declineFriendRequest(requesterPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      toast.success('Friend request declined');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to decline friend request');
    },
  });
}

export function useCancelFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'cancelFriendRequest')) {
        throw new Error('Backend method cancelFriendRequest not available');
      }
      await (actor as any).cancelFriendRequest(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingRequests'] });
      toast.success('Friend request cancelled');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel friend request');
    },
  });
}

export function useRemoveFriend() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'unfriend')) {
        throw new Error('Backend method unfriend not available');
      }
      await (actor as any).unfriend(friendPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend removed');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove friend');
    },
  });
}

export function useCheckFriendshipStatus(userPrincipal: Principal | null) {
  const { identity } = useInternetIdentity();
  const { data: friends } = useGetFriends();

  const currentUserPrincipal = identity?.getPrincipal();
  const isCurrentUser = userPrincipal && currentUserPrincipal ? userPrincipal.toString() === currentUserPrincipal.toString() : false;
  const isFriend = userPrincipal && friends ? friends.some((f) => f.toString() === userPrincipal.toString()) : false;

  return {
    isFriend,
    isPendingReceived: false,
    isPendingSent: false,
    isCurrentUser,
  };
}

// Notifications
export function useGetNotifications() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) return [];
      if (!hasMethod(actor, 'getNotifications')) {
        console.warn('Backend method getNotifications not available');
        return [];
      }
      return await (actor as any).getNotifications();
    },
    enabled: !!actor && !actorFetching,
    retry: 1,
    refetchInterval: 5000,
  });
}

export function useGetUnseenNotifications() {
  const { data: allNotifications } = useGetNotifications();

  return useQuery<Notification[]>({
    queryKey: ['unseenNotifications'],
    queryFn: async () => {
      if (!allNotifications) return [];
      return allNotifications.filter((n) => !n.isRead);
    },
    enabled: !!allNotifications,
  });
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'markNotificationAsRead')) {
        throw new Error('Backend method markNotificationAsRead not available');
      }
      await (actor as any).markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unseenNotifications'] });
    },
    onError: (error: any) => {
      console.error('Failed to mark notification as read:', error);
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const { data: unseenNotifications } = useGetUnseenNotifications();
  const markAsRead = useMarkNotificationAsRead();

  return useMutation({
    mutationFn: async () => {
      if (!unseenNotifications || unseenNotifications.length === 0) return;
      
      // Mark all unseen notifications as read
      for (const notification of unseenNotifications) {
        await markAsRead.mutateAsync(notification.id);
      }
    },
    onError: (error: any) => {
      console.error('Failed to mark all notifications as read:', error);
    },
  });
}

// Account Management
export function useDeleteAccount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { clear } = useInternetIdentity();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      if (!hasMethod(actor, 'deleteAccount')) {
        throw new Error('Backend method deleteAccount not available');
      }
      await (actor as any).deleteAccount();
    },
    onSuccess: async () => {
      queryClient.clear();
      await clear();
      toast.success('Account deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete account');
    },
  });
}

export function useSharePostToFriend() {
  const sendMessage = useSendMessage();

  return useMutation({
    mutationFn: async ({
      recipient,
      postId,
      messageText,
    }: {
      recipient: Principal;
      postId: string;
      messageText: string;
    }) => {
      const text = messageText || `Check out this post: ${postId}`;
      return await sendMessage.mutateAsync({
        recipient,
        text,
        photo: null,
        video: null,
      });
    },
    onSuccess: () => {
      toast.success('Post shared successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to share post');
    },
  });
}
