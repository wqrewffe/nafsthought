export type NotificationType = 
  | 'NEW_POST'
  | 'NEW_COMMENT'
  | 'COMMENT_REPLY'
  | 'POST_LIKE'
  | 'ADMIN_NOTICE'
  | 'MENTION'
  | 'SERIES_UPDATE'
  | 'TRENDING_POST';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  data?: {
    postId?: string;
    commentId?: string;
    userId?: string;
    url?: string;
    imageUrl?: string;
    [key: string]: any;
  };
  recipientId: string;
  senderId?: string;
}

export interface NotificationPreferences {
  newPosts: boolean;
  comments: boolean;
  likes: boolean;
  adminNotices: boolean;
  mentions: boolean;
  seriesUpdates: boolean;
  trendingPosts: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}
