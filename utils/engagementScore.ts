import { Post } from '../types';

export interface EngagementScore {
    viewScore: number;
    upvoteScore: number;
    commentScore: number;
    recencyBoost: number;
    velocityBoost: number;
    totalScore: number;
}


// --- Algorithm Constants ---
const HOURS_IN_DAY = 24;
const DECAY_FACTOR = 1.5;
const VIEW_WEIGHT = 1.0;
const UPVOTE_WEIGHT = 3.0;
const COMMENT_WEIGHT = 2.0;
const RECENCY_WEIGHT = 2.0;
const VELOCITY_WEIGHT = 2.0;
const FRESHNESS_BOOST_HOURS = 6; // Extra boost for very new posts
const FRESHNESS_BOOST = 1.2;


// --- Time Decay: Posts lose weight as they age, but not linearly ---
const calculateTimeDecay = (post: Post): number => {
    const postDate = new Date(post.date);
    const now = new Date();
    const hoursSincePost = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
    return Math.pow(DECAY_FACTOR, -Math.log(hoursSincePost + 1) / Math.log(HOURS_IN_DAY));
};


// --- Velocity: Sudden spikes in engagement (simulate with recent vs. total) ---
const calculateVelocity = (post: Post): number => {
    // If you have historical data, use it. Here, we simulate with last 24h vs. total.
    // Assume post has recentViews, recentUpvotes, recentComments for last 24h (else fallback to 0.1*total)
    const recentViews = (post as any).recentViews ?? Math.max(1, Math.round(post.views * 0.1));
    const recentUpvotes = (post as any).recentUpvotes ?? Math.max(1, Math.round(post.upvotes * 0.1));
    const recentComments = (post as any).recentComments ?? Math.max(1, Math.round(post.comments.length * 0.1));
    // Calculate velocity as ratio of recent to total, clamped
    const viewVelocity = Math.min(Math.max(recentViews / (post.views || 1), 0.5), 2);
    const upvoteVelocity = Math.min(Math.max(recentUpvotes / (post.upvotes || 1), 0.5), 2);
    const commentVelocity = Math.min(Math.max(recentComments / ((post.comments?.length || 1)), 0.5), 2);
    // Weighted average
    return (viewVelocity * 0.5 + upvoteVelocity * 0.3 + commentVelocity * 0.2);
};


// --- Normalization: Prevent domination by high numbers ---
const normalizeMetric = (value: number, max: number): number => {
    if (max === 0) return 0;
    return Math.log(value + 1) / Math.log(max + 1);
};


/**
 * STRONG ENGAGEMENT ALGORITHM (YouTube-like)
 * - Recency boost for new posts
 * - Time decay for older posts
 * - Velocity boost for trending posts
 * - Normalized metrics for fairness
 * - Extensible for personalization
 */
export const calculateEngagementScore = (post: Post, allPosts: Post[]): EngagementScore => {
    // Find maximum values for normalization
    const maxViews = Math.max(...allPosts.map(p => p.views));
    const maxUpvotes = Math.max(...allPosts.map(p => p.upvotes));
    const maxComments = Math.max(...allPosts.map(p => p.comments.length));

    // Normalized metrics
    const normalizedViews = normalizeMetric(post.views, maxViews);
    const normalizedUpvotes = normalizeMetric(post.upvotes, maxUpvotes);
    const normalizedComments = normalizeMetric(post.comments.length, maxComments);

    // Time decay
    const timeDecay = calculateTimeDecay(post);

    // Recency boost (extra boost for very new posts)
    const postDate = new Date(post.date);
    const now = new Date();
    const hoursSincePost = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
    const recencyBoost = hoursSincePost < FRESHNESS_BOOST_HOURS ? FRESHNESS_BOOST : 1;

    // Velocity boost (recent engagement spike)
    const velocityBoost = calculateVelocity(post);

    // Individual scores
    const viewScore = normalizedViews * VIEW_WEIGHT * timeDecay;
    const upvoteScore = normalizedUpvotes * UPVOTE_WEIGHT * timeDecay;
    const commentScore = normalizedComments * COMMENT_WEIGHT * timeDecay;

    // Total score: combine all, with recency and velocity
    let totalScore = (
        (viewScore + upvoteScore + commentScore)
        * recencyBoost * (1 + (velocityBoost - 1) * VELOCITY_WEIGHT)
    );

    // Optionally: Penalize overexposed posts (shown too often), or boost diversity
    // Optionally: Add personalization (user history, preferences)

    return {
        viewScore,
        upvoteScore,
        commentScore,
        recencyBoost,
        velocityBoost,
        totalScore
    };
};


/**
 * Helper: Is Trending (score much higher than average, and velocity boost)
 */
export const isTrending = (post: Post, allPosts: Post[]): boolean => {
    const score = calculateEngagementScore(post, allPosts);
    const averageScore = allPosts.reduce((acc, p) => 
        acc + calculateEngagementScore(p, allPosts).totalScore, 0
    ) / (allPosts.length || 1);
    return score.totalScore > averageScore * 1.5 && score.velocityBoost > 1.2;
};
