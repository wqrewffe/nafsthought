

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
  category: string;
  reports: {
    reporterId: string;
    reason: string;
    timestamp: any;
  }[];
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  photoURL: string | null;
}

export interface Category {
  id: string;
  name: string;
}