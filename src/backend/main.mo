import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Time "mo:core/Time";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import MixinStorage "blob-storage/Mixin";

actor {
  type UserProfile = {
    userId : Text;
    name : Text;
    bio : Text;
    displayPic : ?Storage.ExternalBlob;
    isPublic : Bool;
  };

  public type SimplifiedUserProfile = {
    principal : Principal;
    userId : Text;
    name : Text;
    displayPic : ?Storage.ExternalBlob;
    isPublic : Bool;
  };

  public type FeedPost = {
    id : Text;
    author : Principal;
    authorName : Text;
    caption : ?Text;
    image : Storage.ExternalBlob;
    timestamp : Int;
  };

  public type Reel = {
    id : Text;
    author : Principal;
    authorName : Text;
    caption : ?Text;
    videoUrl : Storage.ExternalBlob;
    timestamp : Int;
  };

  type Comment = {
    author : Principal;
    authorName : Text;
    text : Text;
    timestamp : Int;
  };

  public type MessageContent = {
    sender : Principal;
    recipient : Principal;
    text : Text;
    photo : ?Storage.ExternalBlob;
    video : ?Storage.ExternalBlob;
    timestamp : Int;
  };

  public type NotificationType = {
    #like;
    #comment;
    #friendRequest;
    #friendAccepted;
    #message;
    #postShared;
  };

  public type Notification = {
    id : Nat;
    recipient : Principal;
    sender : ?Principal;
    senderName : ?Text;
    notificationType : NotificationType;
    relatedPostId : ?Text;
    message : Text;
    isRead : Bool;
    timestamp : Int;
  };

  public type SharedPostMessage = {
    message : MessageContent;
    post : FeedPost;
  };

  public type MessageStatus = {
    #normal;
    #edited;
    #deleted;
  };

  public type Message = {
    content : MessageContent;
    status : MessageStatus;
  };

  public type FriendRequests = {
    incoming : [Principal];
    outgoing : [Principal];
  };

  let posts = Map.empty<Text, FeedPost>();
  let reels = Map.empty<Text, Reel>();
  let comments = Map.empty<Text, [Comment]>();
  let postLikes = Map.empty<Text, Set.Set<Principal>>();
  let reelLikes = Map.empty<Text, Set.Set<Principal>>();
  let messages = Map.empty<Int, Message>();
  let sharedPostMessages = Map.empty<Int, SharedPostMessage>();
  var notificationCounter = 0;
  var messageIdCounter = 0;

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  let profiles = Map.empty<Principal, UserProfile>();
  let userIds = Map.empty<Text, Principal>();
  let friends = Map.empty<Principal, Set.Set<Principal>>();
  let friendRequests = Map.empty<Principal, Set.Set<Principal>>();
  let notifications = Map.empty<Principal, [Notification]>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    profiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    switch (userIds.get(profile.userId)) {
      case (?existingPrincipal) {
        if (existingPrincipal != caller) {
          Runtime.trap("User ID already taken");
        };
      };
      case (null) {};
    };

    switch (profiles.get(caller)) {
      case (?oldProfile) {
        userIds.remove(oldProfile.userId);
      };
      case (null) {};
    };

    profiles.add(caller, profile);
    userIds.add(profile.userId, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };

    switch (profiles.get(user)) {
      case (?profile) {
        if (canViewProfile(caller, user)) {
          return ?profile;
        } else {
          return ?{
            userId = profile.userId;
            name = profile.name;
            bio = "";
            displayPic = profile.displayPic;
            isPublic = profile.isPublic;
          };
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func searchProfiles(searchQuery : Text) : async [SimplifiedUserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search profiles");
    };

    let normalizedQuery = searchQuery.toLower();

    if (normalizedQuery.size() == 0) {
      return [];
    };

    let list = List.empty<SimplifiedUserProfile>();

    profiles.forEach(
      func(principal, profile) {
        let normalizedUserId = profile.userId.toLower();
        let normalizedName = profile.name.toLower();

        if (
          normalizedUserId.contains(#text normalizedQuery) or
          normalizedName.contains(#text normalizedQuery)
        ) {
          list.add({
            principal;
            userId = profile.userId;
            name = profile.name;
            displayPic = profile.displayPic;
            isPublic = profile.isPublic;
          });
        };
      }
    );
    list.toArray();
  };

  public shared ({ caller }) func createPost(image : Storage.ExternalBlob, caption : ?Text) : async FeedPost {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create posts");
    };

    let verifiedCaption = verifyCaption(caption);

    let postId = Time.now().toText();
    let post : FeedPost = {
      id = postId;
      author = caller;
      authorName = getUserName(caller);
      caption = verifiedCaption;
      image;
      timestamp = Time.now();
    };

    posts.add(postId, post);
    post;
  };

  public shared ({ caller }) func deletePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete posts");
    };

    switch (posts.get(postId)) {
      case (?post) {
        if (post.author != caller) {
          Runtime.trap("Unauthorized: Only the post author can delete this post");
        };
        posts.remove(postId);
        comments.remove(postId);
        postLikes.remove(postId);
      };
      case (null) {
        Runtime.trap("Post not found");
      };
    };
  };

  public shared ({ caller }) func createReel(videoUrl : Storage.ExternalBlob, caption : ?Text) : async Reel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create reels");
    };

    let verifiedCaption = verifyCaption(caption);

    let reelId = Time.now().toText();
    let reel : Reel = {
      id = reelId;
      author = caller;
      authorName = getUserName(caller);
      caption = verifiedCaption;
      videoUrl;
      timestamp = Time.now();
    };

    reels.add(reelId, reel);
    reel;
  };

  public shared ({ caller }) func deleteReel(reelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete reels");
    };

    switch (reels.get(reelId)) {
      case (?reel) {
        if (reel.author != caller) {
          Runtime.trap("Unauthorized: Only the reel author can delete this reel");
        };
        reels.remove(reelId);
        comments.remove(reelId);
        reelLikes.remove(reelId);
      };
      case (null) {
        Runtime.trap("Reel not found");
      };
    };
  };

  public shared ({ caller }) func likePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like posts");
    };

    switch (posts.get(postId)) {
      case (?post) {
        let likes = switch (postLikes.get(postId)) {
          case (?existingLikes) { existingLikes };
          case (null) { Set.empty<Principal>() };
        };
        likes.add(caller);
        postLikes.add(postId, likes);

        if (post.author != caller) {
          addNotification(
            post.author,
            ?caller,
            ?getUserName(caller),
            #like,
            ?postId,
            getUserName(caller) # " liked your post",
          );
        };
      };
      case (null) {
        Runtime.trap("Post not found");
      };
    };
  };

  public shared ({ caller }) func unlikePost(postId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike posts");
    };

    switch (postLikes.get(postId)) {
      case (?likes) {
        likes.remove(caller);
        postLikes.add(postId, likes);
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func likeReel(reelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like reels");
    };

    switch (reels.get(reelId)) {
      case (?reel) {
        let likes = switch (reelLikes.get(reelId)) {
          case (?existingLikes) { existingLikes };
          case (null) { Set.empty<Principal>() };
        };
        likes.add(caller);
        reelLikes.add(reelId, likes);

        if (reel.author != caller) {
          addNotification(
            reel.author,
            ?caller,
            ?getUserName(caller),
            #like,
            ?reelId,
            getUserName(caller) # " liked your reel",
          );
        };
      };
      case (null) {
        Runtime.trap("Reel not found");
      };
    };
  };

  public shared ({ caller }) func unlikeReel(reelId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unlike reels");
    };

    switch (reelLikes.get(reelId)) {
      case (?likes) {
        likes.remove(caller);
        reelLikes.add(reelId, likes);
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func addCommentToPost(postId : Text, text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment");
    };

    switch (posts.get(postId)) {
      case (?post) {
        let comment : Comment = {
          author = caller;
          authorName = getUserName(caller);
          text = text;
          timestamp = Time.now();
        };

        let existingComments = switch (comments.get(postId)) {
          case (?c) { c };
          case (null) { [] };
        };

        comments.add(postId, existingComments.concat([comment]));

        if (post.author != caller) {
          addNotification(
            post.author,
            ?caller,
            ?getUserName(caller),
            #comment,
            ?postId,
            getUserName(caller) # " commented on your post",
          );
        };
      };
      case (null) {
        Runtime.trap("Post not found");
      };
    };
  };

  public shared ({ caller }) func addCommentToReel(reelId : Text, text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can comment");
    };

    switch (reels.get(reelId)) {
      case (?reel) {
        let comment : Comment = {
          author = caller;
          authorName = getUserName(caller);
          text = text;
          timestamp = Time.now();
        };

        let existingComments = switch (comments.get(reelId)) {
          case (?c) { c };
          case (null) { [] };
        };

        comments.add(reelId, existingComments.concat([comment]));

        if (reel.author != caller) {
          addNotification(
            reel.author,
            ?caller,
            ?getUserName(caller),
            #comment,
            ?reelId,
            getUserName(caller) # " commented on your reel",
          );
        };
      };
      case (null) {
        Runtime.trap("Reel not found");
      };
    };
  };

  public shared ({ caller }) func sendMessage(
    recipient : Principal,
    text : Text,
    photo : ?Storage.ExternalBlob,
    video : ?Storage.ExternalBlob,
  ) : async Int {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send messages");
    };

    if (not areFriends(caller, recipient)) {
      Runtime.trap("Unauthorized: Can only send messages to friends");
    };

    let messageContent : MessageContent = {
      sender = caller;
      recipient = recipient;
      text = text;
      photo = photo;
      video = video;
      timestamp = Time.now();
    };

    let message : Message = {
      content = messageContent;
      status = #normal;
    };

    let messageId = messageIdCounter;
    messageIdCounter += 1;
    messages.add(messageId, message);

    addNotification(
      recipient,
      ?caller,
      ?getUserName(caller),
      #message,
      null,
      getUserName(caller) # " sent you a message",
    );

    messageId;
  };

  public shared ({ caller }) func editMessage(messageId : Int, newText : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can edit messages");
    };

    switch (messages.get(messageId)) {
      case (?message) {
        if (message.content.sender != caller) {
          Runtime.trap("Unauthorized: Only the message sender can edit this message");
        };

        let updatedContent : MessageContent = {
          sender = message.content.sender;
          recipient = message.content.recipient;
          text = newText.trim(#char ' ');
          photo = message.content.photo;
          video = message.content.video;
          timestamp = message.content.timestamp;
        };

        let updatedMessage : Message = {
          content = updatedContent;
          status = #edited;
        };

        messages.add(messageId, updatedMessage);
      };
      case (null) {
        Runtime.trap("Message not found");
      };
    };
  };

  public shared ({ caller }) func deleteMessage(messageId : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete messages");
    };

    switch (messages.get(messageId)) {
      case (?message) {
        if (message.content.sender != caller) {
          Runtime.trap("Unauthorized: Only the message sender can delete this message");
        };

        let updatedMessage : Message = {
          content = message.content;
          status = #deleted;
        };

        messages.add(messageId, updatedMessage);
      };
      case (null) {
        Runtime.trap("Message not found");
      };
    };
  };

  public query ({ caller }) func getMessages(otherUser : Principal) : async [Message] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view messages");
    };

    if (not areFriends(caller, otherUser)) {
      Runtime.trap("Unauthorized: Can only view messages with friends");
    };

    messages.values()
      .filter(func(msg) {
        (msg.content.sender == caller and msg.content.recipient == otherUser) or
        (msg.content.sender == otherUser and msg.content.recipient == caller)
      })
      .toArray();
  };

  public shared ({ caller }) func sendFriendRequest(targetUserId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can send friend requests");
    };

    switch (userIds.get(targetUserId)) {
      case (?targetPrincipal) {
        if (targetPrincipal == caller) {
          Runtime.trap("Cannot send friend request to yourself");
        };

        if (areFriends(caller, targetPrincipal)) {
          Runtime.trap("Already friends with this user");
        };

        switch (friendRequests.get(targetPrincipal)) {
          case (?requests) {
            if (requests.contains(caller)) {
              Runtime.trap("Friend request already sent");
            };
            requests.add(caller);
            friendRequests.add(targetPrincipal, requests);
          };
          case (null) {
            let newRequests = Set.empty<Principal>();
            newRequests.add(caller);
            friendRequests.add(targetPrincipal, newRequests);
          };
        };

        addNotification(
          targetPrincipal,
          ?caller,
          ?getUserName(caller),
          #friendRequest,
          null,
          getUserName(caller) # " sent you a friend request",
        );
      };
      case (null) {
        Runtime.trap("Target user does not exist");
      };
    };
  };

  public shared ({ caller }) func acceptFriendRequest(requesterPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can accept friend requests");
    };

    switch (friendRequests.get(caller)) {
      case (?requests) {
        if (not requests.contains(requesterPrincipal)) {
          Runtime.trap("No friend request from this user");
        };

        requests.remove(requesterPrincipal);
        friendRequests.add(caller, requests);

        let callerFriends = switch (friends.get(caller)) {
          case (?f) { f };
          case (null) { Set.empty<Principal>() };
        };
        callerFriends.add(requesterPrincipal);
        friends.add(caller, callerFriends);

        let requesterFriends = switch (friends.get(requesterPrincipal)) {
          case (?f) { f };
          case (null) { Set.empty<Principal>() };
        };
        requesterFriends.add(caller);
        friends.add(requesterPrincipal, requesterFriends);

        addNotification(
          requesterPrincipal,
          ?caller,
          ?getUserName(caller),
          #friendAccepted,
          null,
          getUserName(caller) # " accepted your friend request",
        );
      };
      case (null) {
        Runtime.trap("No friend requests");
      };
    };
  };

  public shared ({ caller }) func declineFriendRequest(requesterPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can decline friend requests");
    };

    switch (friendRequests.get(caller)) {
      case (?requests) {
        requests.remove(requesterPrincipal);
        friendRequests.add(caller, requests);
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func cancelFriendRequest(targetUserId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can cancel friend requests");
    };

    switch (userIds.get(targetUserId)) {
      case (?targetPrincipal) {
        switch (friendRequests.get(targetPrincipal)) {
          case (?requests) {
            requests.remove(caller);
            friendRequests.add(targetPrincipal, requests);
          };
          case (null) {};
        };
      };
      case (null) {
        Runtime.trap("Target user does not exist");
      };
    };
  };

  public shared ({ caller }) func unfriend(friendPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can unfriend");
    };

    switch (friends.get(caller)) {
      case (?callerFriends) {
        callerFriends.remove(friendPrincipal);
        friends.add(caller, callerFriends);
      };
      case (null) {};
    };

    switch (friends.get(friendPrincipal)) {
      case (?friendFriends) {
        friendFriends.remove(caller);
        friends.add(friendPrincipal, friendFriends);
      };
      case (null) {};
    };
  };

  public query ({ caller }) func getNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    switch (notifications.get(caller)) {
      case (?notifs) { notifs };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func markNotificationAsRead(notificationId : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    switch (notifications.get(caller)) {
      case (?notifs) {
        let updatedNotifs = notifs.map(func(n : Notification) : Notification {
          if (n.id == notificationId) {
            if (n.recipient != caller) {
              Runtime.trap("Unauthorized: Can only mark your own notifications as read");
            };
            return {
              id = n.id;
              recipient = n.recipient;
              sender = n.sender;
              senderName = n.senderName;
              notificationType = n.notificationType;
              relatedPostId = n.relatedPostId;
              message = n.message;
              isRead = true;
              timestamp = n.timestamp;
            };
          };
          n;
        });
        notifications.add(caller, updatedNotifs);
      };
      case (null) {};
    };
  };

  public shared ({ caller }) func deleteAccount() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete accounts");
    };

    deleteAccountByPrincipal(caller);
  };

  public shared ({ caller }) func adminDeleteAccount(user : Principal) : async () {
    if (not (AccessControl.isAdmin(accessControlState, caller))) {
      Runtime.trap("Unauthorized: Only admins can delete accounts");
    };
    deleteAccountByPrincipal(user);
  };

  func deleteAccountByPrincipal(user : Principal) {
    switch (profiles.get(user)) {
      case (?profile) {
        userIds.remove(profile.userId);
      };
      case (null) {};
    };
    profiles.remove(user);

    for ((postId, post) in posts.entries()) {
      if (post.author == user) {
        posts.remove(postId);
        comments.remove(postId);
        postLikes.remove(postId);
      };
    };

    for ((reelId, reel) in reels.entries()) {
      if (reel.author == user) {
        reels.remove(reelId);
        comments.remove(reelId);
        reelLikes.remove(reelId);
      };
    };

    for ((msgId, msg) in messages.entries()) {
      if (msg.content.sender == user) {
        messages.remove(msgId);
      };
    };

    friends.remove(user);
    for ((userKey, friendSet) in friends.entries()) {
      friendSet.remove(user);
    };

    friendRequests.remove(user);
    for ((userKey, requestSet) in friendRequests.entries()) {
      requestSet.remove(user);
    };

    notifications.remove(user);
  };

  private func getUserName(caller : Principal) : Text {
    switch (profiles.get(caller)) {
      case (?profile) { profile.name };
      case (null) { "Unknown User" };
    };
  };

  private func areFriends(user1 : Principal, user2 : Principal) : Bool {
    switch (friends.get(user1)) {
      case (?friendSet) { friendSet.contains(user2) };
      case (null) { false };
    };
  };

  private func canViewProfile(viewer : Principal, profileOwner : Principal) : Bool {
    if (viewer == profileOwner) { return true };

    switch (profiles.get(profileOwner)) {
      case (?profile) {
        if (profile.isPublic) { return true };
        return areFriends(viewer, profileOwner);
      };
      case (null) { false };
    };
  };

  private func addNotification(
    recipient : Principal,
    sender : ?Principal,
    senderName : ?Text,
    notifType : NotificationType,
    relatedPostId : ?Text,
    message : Text,
  ) {
    let notif : Notification = {
      id = notificationCounter;
      recipient = recipient;
      sender = sender;
      senderName = senderName;
      notificationType = notifType;
      relatedPostId = relatedPostId;
      message = message;
      isRead = false;
      timestamp = Time.now();
    };
    notificationCounter += 1;

    switch (notifications.get(recipient)) {
      case (?existingNotifs) {
        notifications.add(recipient, existingNotifs.concat([notif]));
      };
      case (null) {
        notifications.add(recipient, [notif]);
      };
    };
  };

  public query ({ caller }) func getUserProfileByUserId(userId : Text) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };

    switch (userIds.get(userId)) {
      case (?principal) {
        switch (profiles.get(principal)) {
          case (?profile) {
            if (canViewProfile(caller, principal)) {
              return ?profile;
            } else {
              return ?{
                userId = profile.userId;
                name = profile.name;
                bio = "";
                displayPic = profile.displayPic;
                isPublic = profile.isPublic;
              };
            };
          };
          case (null) { null };
        };
      };
      case (null) { null };
    };
  };

  func verifyCaption(caption : ?Text) : ?Text {
    switch (caption) {
      case (?text) { if (text.trim(#char ' ').size() == 0) { null } else { ?text } };
      case (null) { null };
    };
  };

  public query ({ caller }) func getAllPosts() : async [FeedPost] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access posts");
    };
    posts.values().toArray();
  };

  public query ({ caller }) func getAllReels() : async [Reel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access reels");
    };
    reels.values().toArray();
  };

  public query ({ caller }) func getPostsByAuthor(author : Principal) : async [FeedPost] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access posts");
    };

    posts.values().filter(func(post) { post.author == author }).toArray();
  };

  public query ({ caller }) func getReelsByAuthor(author : Principal) : async [Reel] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access reels");
    };

    reels.values().filter(func(reel) { reel.author == author }).toArray();
  };

  public query ({ caller }) func getPostById(postId : Text) : async ?FeedPost {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view posts");
    };
    posts.get(postId);
  };

  public query ({ caller }) func getReelById(reelId : Text) : async ?Reel {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view reels");
    };
    reels.get(reelId);
  };

  public query ({ caller }) func hasProfile() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      return false;
    };
    profiles.containsKey(caller);
  };

  public query ({ caller }) func getPostLikeCount(postId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view like counts");
    };
    switch (postLikes.get(postId)) {
      case (?likeSet) { likeSet.size() };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getPostCommentCount(postId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view comment counts");
    };
    switch (comments.get(postId)) {
      case (?postComments) { postComments.size() };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getReelLikeCount(reelId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view like counts");
    };
    switch (reelLikes.get(reelId)) {
      case (?likeSet) { likeSet.size() };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getReelCommentCount(reelId : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view comment counts");
    };
    switch (comments.get(reelId)) {
      case (?reelComments) { reelComments.size() };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getFriendsList() : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their friends list");
    };
    switch (friends.get(caller)) {
      case (?friendSet) {
        friendSet.toArray();
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getFriends(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view friends");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      switch (profiles.get(user)) {
        case (?profile) {
          if (not profile.isPublic and not areFriends(caller, user)) {
            Runtime.trap("Unauthorized: Can only view friends list of public profiles or your friends");
          };
        };
        case (null) {
          Runtime.trap("User profile not found");
        };
      };
    };

    switch (friends.get(user)) {
      case (?friends) {
        friends.toArray();
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func getFriendRequests() : async FriendRequests {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view friend requests");
    };

    let incoming = switch (friendRequests.get(caller)) {
      case (?requests) {
        requests.filter(func(p) { p != caller }).toArray();
      };
      case (null) { [] };
    };

    let outgoingIter = friendRequests.entries();
    let outgoingList = List.empty<Principal>();

    for ((principal, requests) in outgoingIter) {
      if (requests.contains(caller)) {
        outgoingList.add(principal);
      };
    };

    let outgoing = outgoingList.toArray();

    {
      incoming;
      outgoing;
    };
  };

  public query ({ caller }) func checkIfFriends(user1 : Principal, user2 : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check if users are friends");
    };
    areFriends(user1, user2);
  };

  public query ({ caller }) func getPendingRequests(user : Principal) : async [Principal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get pending requests");
    };

    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own pending requests");
    };

    switch (friendRequests.get(user)) {
      case (?requests) {
        requests.toArray();
      };
      case (null) { [] };
    };
  };
};
