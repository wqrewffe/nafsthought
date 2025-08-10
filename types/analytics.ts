export interface BlogStats {
    totalPosts: number;
    totalViews: number;
    totalUpvotes: number;
    totalComments: number;
    topCategories: { category: string; count: number }[];
    mostViewedPosts: { id: string; title: string; views: number }[];
    userStats: {
        totalUsers: number;
        activeUsers: number;
        blockedUsers: number;
        roleDistribution: Record<string, number>;
    };
    activityTimeline: {
        date: string;
        posts: number;
        comments: number;
        views: number;
    }[];
}

export interface ReportedContent {
    id: string;
    postId: string;
    postTitle: string;
    reporterId: string;
    reporterName: string;
    reason: string;
    timestamp: string;
    status: 'pending' | 'reviewed' | 'dismissed';
    reviewedBy?: string;
    reviewedAt?: string;
    actionTaken?: string;
}
