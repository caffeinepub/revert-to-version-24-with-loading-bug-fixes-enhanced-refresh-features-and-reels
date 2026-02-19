import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Principal } from '@icp-sdk/core/principal';
import type { UserProfile, FeedPost, Reel, Notification, Message, ExternalBlob, SimplifiedUserProfile, FriendRequests } from '../backend';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

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
      const profile: UserProfile = {
        userId,
        name: username,
        bio,
        displayPic: displayPic || undefined,
        isPublic,
      };
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetUserProfile(userPrincipal: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      return actor.getUserProfile(userPrincipal);
    },
    enabled: !!actor && !isFetching && !!userPrincipal,
  });
}

export function useGetProfileByPrincipal(userPrincipal: Principal | null) {
  return useGetUserProfile(userPrincipal);
}

export function useGetProfileByUserId(userId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfileByUserId', userId],
    queryFn: async () => {
      if (!actor || !userId) return null;
      return actor.getUserProfileByUserId(userId);
    },
    enabled: !!actor && !isFetching && !!userId,
  });
}

export function useSearchProfiles(searchQuery: string) {
  const { actor, isFetching } = useActor();

  return useQuery<SimplifiedUserProfile[]>({
    queryKey: ['searchProfiles', searchQuery],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.searchProfiles(searchQuery);
    },
    enabled: !!actor && !isFetching && searchQuery.length > 0,
  });
}

export function useSearchUserProfiles(searchQuery: string) {
  return useSearchProfiles(searchQuery);
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ image, caption }: { image: ExternalBlob; caption: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPost(image, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

export function useDeletePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deletePost(postId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPosts'] });
      queryClient.invalidateQueries({ queryKey: ['userPosts'] });
    },
  });
}

export function useCreateReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoUrl, caption }: { videoUrl: ExternalBlob; caption: string | null }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createReel(videoUrl, caption);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allReels'] });
      queryClient.invalidateQueries({ queryKey: ['userReels'] });
    },
  });
}

export function useDeleteReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteReel(reelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allReels'] });
      queryClient.invalidateQueries({ queryKey: ['userReels'] });
    },
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.likePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['postLikeCount', postId] });
    },
  });
}

export function useUnlikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unlikePost(postId);
    },
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['postLikeCount', postId] });
    },
  });
}

export function useLikeReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.likeReel(reelId);
    },
    onSuccess: (_, reelId) => {
      queryClient.invalidateQueries({ queryKey: ['reelLikeCount', reelId] });
    },
  });
}

export function useUnlikeReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reelId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unlikeReel(reelId);
    },
    onSuccess: (_, reelId) => {
      queryClient.invalidateQueries({ queryKey: ['reelLikeCount', reelId] });
    },
  });
}

export function useAddCommentToPost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCommentToPost(postId, text);
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['postCommentCount', postId] });
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });
}

export function useAddCommentToReel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reelId, text }: { reelId: string; text: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addCommentToReel(reelId, text);
    },
    onSuccess: (_, { reelId }) => {
      queryClient.invalidateQueries({ queryKey: ['reelCommentCount', reelId] });
      queryClient.invalidateQueries({ queryKey: ['comments', reelId] });
    },
  });
}

export function useGetComments(contentId: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['comments', contentId],
    queryFn: async () => {
      if (!actor) return [];
      return [];
    },
    enabled: !!actor && !isFetching,
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
      return actor.sendMessage(recipient, text, photo, video);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useEditMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, newText }: { messageId: bigint; newText: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.editMessage(messageId, newText);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useDeleteMessage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteMessage(messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useGetMessages(otherUser: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Message[]>({
    queryKey: ['messages', otherUser?.toString()],
    queryFn: async () => {
      if (!actor || !otherUser) return [];
      return actor.getMessages(otherUser);
    },
    enabled: !!actor && !isFetching && !!otherUser,
  });
}

export function useSendFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.sendFriendRequest(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] });
    },
  });
}

export function useAcceptFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requesterPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.acceptFriendRequest(requesterPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendsList'] });
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] });
    },
  });
}

export function useDeclineFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requesterPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.declineFriendRequest(requesterPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });
}

export function useCancelFriendRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.cancelFriendRequest(targetUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] });
    },
  });
}

export function useRemoveFriend() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendPrincipal: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.unfriend(friendPrincipal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendsList'] });
      queryClient.invalidateQueries({ queryKey: ['friendshipStatus'] });
    },
  });
}

export function useGetFriendsList() {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['friendsList'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFriendsList();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFriends() {
  return useGetFriendsList();
}

export function useGetFriendRequests() {
  const { actor, isFetching } = useActor();

  return useQuery<FriendRequests>({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getFriendRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCheckFriendshipStatus(userPrincipal: Principal | null) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery({
    queryKey: ['friendshipStatus', userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal || !identity) {
        return { 
          areFriends: false, 
          hasIncomingRequest: false, 
          hasOutgoingRequest: false,
          isFriend: false,
          isPendingReceived: false,
          isPendingSent: false,
          isCurrentUser: false
        };
      }

      const currentPrincipal = identity.getPrincipal();
      const isCurrentUser = currentPrincipal.toString() === userPrincipal.toString();

      const [areFriends, friendRequests] = await Promise.all([
        actor.checkIfFriends(currentPrincipal, userPrincipal),
        actor.getFriendRequests(),
      ]);

      const hasIncomingRequest = friendRequests.incoming.some(
        (p) => p.toString() === userPrincipal.toString()
      );
      const hasOutgoingRequest = friendRequests.outgoing.some(
        (p) => p.toString() === userPrincipal.toString()
      );

      return { 
        areFriends, 
        hasIncomingRequest, 
        hasOutgoingRequest,
        isFriend: areFriends,
        isPendingReceived: hasIncomingRequest,
        isPendingSent: hasOutgoingRequest,
        isCurrentUser
      };
    },
    enabled: !!actor && !isFetching && !!userPrincipal && !!identity,
  });
}

export function useGetNotifications() {
  const { actor, isFetching } = useActor();

  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getNotifications();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUnseenNotifications() {
  const { data: notifications = [], ...rest } = useGetNotifications();
  const unseenNotifications = notifications.filter(n => !n.isRead);
  
  return {
    data: unseenNotifications,
    ...rest,
  };
}

export function useMarkNotificationAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markNotificationAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { data: notifications = [] } = useGetNotifications();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      const unseenNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unseenNotifications.map(n => actor.markNotificationAsRead(n.id))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteAccount() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteAccount();
    },
  });
}

export function useGetAllPosts() {
  const { actor, isFetching } = useActor();

  return useQuery<FeedPost[]>({
    queryKey: ['allPosts'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllPosts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllReels() {
  const { actor, isFetching } = useActor();

  return useQuery<Reel[]>({
    queryKey: ['allReels'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAllReels();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPostsByAuthor(author: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<FeedPost[]>({
    queryKey: ['userPosts', author?.toString()],
    queryFn: async () => {
      if (!actor || !author) return [];
      return actor.getPostsByAuthor(author);
    },
    enabled: !!actor && !isFetching && !!author,
  });
}

export function useGetReelsByAuthor(author: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<Reel[]>({
    queryKey: ['userReels', author?.toString()],
    queryFn: async () => {
      if (!actor || !author) return [];
      return actor.getReelsByAuthor(author);
    },
    enabled: !!actor && !isFetching && !!author,
  });
}

export function useGetPostLikeCount(postId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['postLikeCount', postId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPostLikeCount(postId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPostCommentCount(postId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['postCommentCount', postId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getPostCommentCount(postId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReelLikeCount(reelId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['reelLikeCount', reelId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getReelLikeCount(reelId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReelCommentCount(reelId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['reelCommentCount', reelId],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getReelCommentCount(reelId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useHasUserLikedReel(reelId: string) {
  return useQuery<boolean>({
    queryKey: ['hasUserLikedReel', reelId],
    queryFn: async () => false,
    enabled: false,
  });
}

export function useSharePostToFriend() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendPrincipal, postId, message }: { friendPrincipal: Principal; postId: string; message: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.sendMessage(friendPrincipal, message, null, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

import { useInternetIdentity } from './useInternetIdentity';
