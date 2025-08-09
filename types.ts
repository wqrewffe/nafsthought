

export interface Comment {
  id: string;
  authorId: string;
  author: string;
  authorPhotoURL: string | null;
  text: string;
  timestamp: string;
  parentId: string | null;
}

export interface Post {
  id:string;
  slug: string;
  title: string;
  content: string;
  author: string;
  authorId: string;
  authorPhotoURL: string | null;
  date: string;
  upvotes: number;
  views: number;
  comments: Comment[];
  coverImage: string;
  categories: string[];
  reports: {
    reporterId: string;
    reason: string;
    timestamp: any;
  }[];
}

export interface ReadingHistory {
  postId: string;
  timestamp: string;
  timeSpent: number;
  completed: boolean;
  categories: string[];
}

export interface UserPreferences {
  categoryScores: { [category: string]: number };
  lastReadPosts: string[];
  readingHistory: ReadingHistory[];
}

import { UserRole, UserPermissions, ModerationAction } from './types/moderation';

export interface User {
  id?: string;
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  bio?: string;
  role: UserRole;
  permissions?: UserPermissions;
  isBlocked: boolean;
  blockExpiration?: string;
  joinedAt?: string;
  lastActive?: string;
  moderationHistory?: ModerationAction[];
  socialLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  stats?: UserStats;
  achievements?: UserAchievement[];
  drafts?: UserDraft[];
  bookmarks?: UserBookmark[];
  followingCategories?: string[];
  followingUsers?: string[];
  followers?: string[];
  preferences?: UserPreferences;
  notificationPreferences?: {
    email: boolean;
    push: boolean;
    commentReplies: boolean;
    newFollowers: boolean;
    achievementUnlocks: boolean;
  };
}

export interface UserStats {
  totalPosts: number;
  totalViews: number;
  totalUpvotes: number;
  totalComments: number;
  postsThisMonth: number;
  viewsThisMonth: number;
  mostReadCategories: { category: string; count: number }[];
  readingStreak: number;
  lastActive: string;
}

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface UserDraft {
  id: string;
  title: string;
  content: string;
  lastEdited: string;
  categories: string[];
}

export interface UserBookmark {
  postId: string;
  addedAt: string;
  note?: string;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
}