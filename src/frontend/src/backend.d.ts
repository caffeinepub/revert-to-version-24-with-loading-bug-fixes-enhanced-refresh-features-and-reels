import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Reel {
    id: string;
    authorName: string;
    author: Principal;
    timestamp: bigint;
    caption?: string;
    videoUrl: ExternalBlob;
}
export interface MessageContent {
    video?: ExternalBlob;
    text: string;
    recipient: Principal;
    sender: Principal;
    timestamp: bigint;
    photo?: ExternalBlob;
}
export interface FeedPost {
    id: string;
    authorName: string;
    author: Principal;
    timestamp: bigint;
    caption?: string;
    image: ExternalBlob;
}
export interface FriendRequests {
    incoming: Array<Principal>;
    outgoing: Array<Principal>;
}
export interface SimplifiedUserProfile {
    principal: Principal;
    userId: string;
    name: string;
    isPublic: boolean;
    displayPic?: ExternalBlob;
}
export interface Notification {
    id: bigint;
    notificationType: NotificationType;
    recipient: Principal;
    isRead: boolean;
    sender?: Principal;
    message: string;
    timestamp: bigint;
    senderName?: string;
    relatedPostId?: string;
}
export interface Message {
    status: MessageStatus;
    content: MessageContent;
}
export interface UserProfile {
    bio: string;
    userId: string;
    name: string;
    isPublic: boolean;
    displayPic?: ExternalBlob;
}
export enum MessageStatus {
    deleted = "deleted",
    normal = "normal",
    edited = "edited"
}
export enum NotificationType {
    friendAccepted = "friendAccepted",
    like = "like",
    postShared = "postShared",
    comment = "comment",
    message = "message",
    friendRequest = "friendRequest"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    acceptFriendRequest(requesterPrincipal: Principal): Promise<void>;
    addCommentToPost(postId: string, text: string): Promise<void>;
    addCommentToReel(reelId: string, text: string): Promise<void>;
    adminDeleteAccount(user: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cancelFriendRequest(targetUserId: string): Promise<void>;
    checkIfFriends(user1: Principal, user2: Principal): Promise<boolean>;
    createPost(image: ExternalBlob, caption: string | null): Promise<FeedPost>;
    createReel(videoUrl: ExternalBlob, caption: string | null): Promise<Reel>;
    declineFriendRequest(requesterPrincipal: Principal): Promise<void>;
    deleteAccount(): Promise<void>;
    deleteMessage(messageId: bigint): Promise<void>;
    deletePost(postId: string): Promise<void>;
    deleteReel(reelId: string): Promise<void>;
    editMessage(messageId: bigint, newText: string): Promise<void>;
    getAllPosts(): Promise<Array<FeedPost>>;
    getAllReels(): Promise<Array<Reel>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getFriendRequests(): Promise<FriendRequests>;
    getFriends(user: Principal): Promise<Array<Principal>>;
    getFriendsList(): Promise<Array<Principal>>;
    getMessages(otherUser: Principal): Promise<Array<Message>>;
    getNotifications(): Promise<Array<Notification>>;
    getPendingRequests(user: Principal): Promise<Array<Principal>>;
    getPostById(postId: string): Promise<FeedPost | null>;
    getPostCommentCount(postId: string): Promise<bigint>;
    getPostLikeCount(postId: string): Promise<bigint>;
    getPostsByAuthor(author: Principal): Promise<Array<FeedPost>>;
    getReelById(reelId: string): Promise<Reel | null>;
    getReelCommentCount(reelId: string): Promise<bigint>;
    getReelLikeCount(reelId: string): Promise<bigint>;
    getReelsByAuthor(author: Principal): Promise<Array<Reel>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserProfileByUserId(userId: string): Promise<UserProfile | null>;
    hasProfile(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    likePost(postId: string): Promise<void>;
    likeReel(reelId: string): Promise<void>;
    markNotificationAsRead(notificationId: bigint): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchProfiles(searchQuery: string): Promise<Array<SimplifiedUserProfile>>;
    sendFriendRequest(targetUserId: string): Promise<void>;
    sendMessage(recipient: Principal, text: string, photo: ExternalBlob | null, video: ExternalBlob | null): Promise<bigint>;
    unfriend(friendPrincipal: Principal): Promise<void>;
    unlikePost(postId: string): Promise<void>;
    unlikeReel(reelId: string): Promise<void>;
}
