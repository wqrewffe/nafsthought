import { Timestamp } from 'firebase/firestore';

export interface Series {
    id: string;
    title: string;
    description: string;
    coverImage?: string;
    authorId: string;
    authorName: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    postIds: string[];
    slug: string;
    status: 'draft' | 'published';
    totalPosts: number;
}

export interface SeriesWithPosts extends Series {
    posts: {
        id: string;
        title: string;
        slug: string;
        order: number;
    }[];
}
