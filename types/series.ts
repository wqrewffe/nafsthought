export interface PostSeries {
    id: string;
    title: string;
    description: string;
    coverImage?: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    posts: {
        postId: string;
        order: number;
    }[];
    isPublished: boolean;
    slug: string;
    totalPosts: number;
    estimatedReadingTime: number;
}
