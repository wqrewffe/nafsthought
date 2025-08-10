import { Post } from '../types';

interface EngagementScore {
    viewScore: number;
    upvoteScore: number;
    totalScore: number;
}

// Constants for time decay calculation
const HOURS_IN_DAY = 24;
const DECAY_FACTOR = 1.5;
const VIEW_WEIGHT = 1;
const UPVOTE_WEIGHT = 3;
const COMMENT_WEIGHT = 2;

/**
 * Calculate time decay factor
 * Posts get less weight as they age, but the decay is logarithmic
 */
const calculateTimeDecay = (post: Post): number => {
    const postDate = new Date(post.date);
    const now = new Date();
    const hoursSincePost = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
    return Math.pow(DECAY_FACTOR, -Math.log(hoursSincePost + 1) / Math.log(HOURS_IN_DAY));
};

/**
 * Calculate velocity of engagement
 * Sudden spikes in views/upvotes increase the score
 */
const calculateVelocity = (current: number, previous: number): number => {
    if (previous === 0) return 1;
    const ratio = current / previous;
    return Math.min(Math.max(ratio, 0.5), 2); // Clamp between 0.5 and 2
};

/**
 * Calculate normalized engagement metrics
 * This prevents posts with very high numbers from completely dominating
 */
const normalizeMetric = (value: number, max: number): number => {
    return Math.log(value + 1) / Math.log(max + 1);
};

/**
 * Calculate engagement score considering:
 * - Time decay (older posts get less weight)
 * - Engagement velocity (sudden increases boost score)
 * - Balanced weighting of different metrics
 * - Normalized values to prevent domination by high numbers
 */
export const calculateEngagementScore = (post: Post, allPosts: Post[]): EngagementScore => {
    // Find maximum values for normalization
    const maxViews = Math.max(...allPosts.map(p => p.views));
    const maxUpvotes = Math.max(...allPosts.map(p => p.upvotes));
    const maxComments = Math.max(...allPosts.map(p => p.comments.length));

    // Calculate normalized metrics
    const normalizedViews = normalizeMetric(post.views, maxViews);
    const normalizedUpvotes = normalizeMetric(post.upvotes, maxUpvotes);
    const normalizedComments = normalizeMetric(post.comments.length, maxComments);

    // Calculate engagement velocity (if historical data available)
    // This is a placeholder - you would need to store historical data
    const viewVelocity = 1;  // calculateVelocity(currentViews, previousViews);
    const upvoteVelocity = 1; // calculateVelocity(currentUpvotes, previousUpvotes);

    // Calculate time decay
    const timeDecay = calculateTimeDecay(post);

    // Calculate individual scores
    const viewScore = normalizedViews * VIEW_WEIGHT * viewVelocity * timeDecay;
    const upvoteScore = normalizedUpvotes * UPVOTE_WEIGHT * upvoteVelocity * timeDecay;
    const commentScore = normalizedComments * COMMENT_WEIGHT * timeDecay;

    // Calculate total score
    const totalScore = viewScore + upvoteScore + commentScore;

    return {
        viewScore,
        upvoteScore,
        totalScore
    };
};

/**
 * Helper function to determine if a post is trending
 */
export const isTrending = (post: Post, allPosts: Post[]): boolean => {
    const score = calculateEngagementScore(post, allPosts);
    const averageScore = allPosts.reduce((acc, p) => 
        acc + calculateEngagementScore(p, allPosts).totalScore, 0
    ) / allPosts.length;

    return score.totalScore > averageScore * 1.5; // 50% above average
};
