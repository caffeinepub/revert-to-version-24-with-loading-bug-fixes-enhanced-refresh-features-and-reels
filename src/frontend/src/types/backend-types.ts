import type { Principal } from "@icp-sdk/core/principal";
import { ExternalBlob } from '../backend';

export interface UserProfile {
  userId: string;
  name: string;
  bio: string;
  displayPic: ExternalBlob | null;
  isPublic: boolean;
}

export interface SimplifiedUserProfile {
  principal: Principal;
  userId: string;
  name: string;
  displayPic: ExternalBlob | null;
  isPublic: boolean;
}

export interface Post {
  id: string;
  author: Principal;
  authorName: string;
  caption: string;
  image: ExternalBlob;
  timestamp: bigint;
}

export interface Reel {
  id: string;
  author: Principal;
  authorName: string;
  caption: string;
  videoUrl: ExternalBlob;
  timestamp: bigint;
}

export interface Comment {
  author: Principal;
  authorName: string;
  text: string;
  timestamp: bigint;
}

export interface MessageContent {
  sender: Principal;
  recipient: Principal;
  text: string;
  photo: ExternalBlob | null;
  video: ExternalBlob | null;
  timestamp: bigint;
}

export enum MessageStatus {
  normal = "normal",
  edited = "edited",
  deleted = "deleted"
}

export interface Message {
  content: MessageContent;
  status: MessageStatus;
}

export enum NotificationType {
  like = "like",
  comment = "comment",
  friendRequest = "friendRequest",
  friendAccepted = "friendAccepted",
  message = "message",
  postShared = "postShared"
}

export interface Notification {
  id: bigint;
  recipient: Principal;
  sender: Principal | null;
  senderName: string | null;
  notificationType: NotificationType;
  relatedPostId: string | null;
  message: string;
  isRead: boolean;
  timestamp: bigint;
}

export interface SharedPostMessage {
  message: MessageContent;
  post: Post;
}

export interface SearchResult {
  userId: string;
  name: string;
  isPublic: boolean;
}
