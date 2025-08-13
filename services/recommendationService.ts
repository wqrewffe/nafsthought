import { Post } from '../types';

interface PostVector {
    id: string;
    vector: number[];
}

interface UserPreference {
    categories: { [category: string]: number };
    authors: { [author: string]: number };
    readPosts: Set<string>;
    lastReadTimestamp: { [postId: string]: number };
}

export class RecommendationService {
    private static instance: RecommendationService;
    private postVectors: Map<string, PostVector> = new Map();
    private userPreferences: Map<string, UserPreference> = new Map();
    private cache: Map<string, Post[]> = new Map();
    private cacheTimeout: number = 1000 * 60 * 15; // 15 minutes cache

    private constructor() {}

    public static getInstance(): RecommendationService {
        if (!RecommendationService.instance) {
            RecommendationService.instance = new RecommendationService();
        }
        return RecommendationService.instance;
    }

    // Convert post content to TF-IDF vector
    private async computePostVector(post: Post): Promise<number[]> {
        const text = `${post.title} ${post.content}`.toLowerCase();
        const words = text.split(/\W+/);
        
        // Create word frequency map
        const wordFreq: { [key: string]: number } = {};
        words.forEach(word => {
            if (word.length > 2) { // Ignore very short words
                wordFreq[word] = (wordFreq[word] || 0) + 1;
            }
        });

        // Convert to TF-IDF vector (simplified version)
        const vector = Object.values(wordFreq).map(freq => 
            Math.log(1 + freq) // Term frequency with log normalization
        );

        return vector;
    }

    // Calculate similarity between two vectors using cosine similarity
    private cosineSimilarity(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) return 0;
        
        const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
        const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        
        return dotProduct / (mag1 * mag2) || 0;
    }

    // Update user preferences based on reading behavior
    public async updateUserPreference(userId: string, post: Post, readTime: number = 0) {
        let userPref = this.userPreferences.get(userId) || {
            categories: {},
            authors: {},
            readPosts: new Set(),
            lastReadTimestamp: {}
        };

        // Update category preferences
        post.categories.forEach(category => {
            userPref.categories[category] = (userPref.categories[category] || 0) + 1;
        });

        // Update author preferences
        userPref.authors[post.author] = (userPref.authors[post.author] || 0) + 1;

        // Track read posts
        userPref.readPosts.add(post.id);
        userPref.lastReadTimestamp[post.id] = Date.now();

        this.userPreferences.set(userId, userPref);
        this.invalidateCache(userId);
    }

    private invalidateCache(userId: string) {
        this.cache.delete(userId);
    }

    // Get personalized recommendations for a user
    public async getRecommendations(userId: string, posts: Post[], limit: number = 10): Promise<Post[]> {
        // Check cache first
        const cachedRecommendations = this.cache.get(userId);
        if (cachedRecommendations) {
            return cachedRecommendations.slice(0, limit);
        }

        const userPref = this.userPreferences.get(userId) || {
            categories: {},
            authors: {},
            readPosts: new Set(),
            lastReadTimestamp: {}
        };

        // Calculate scores for each post
        const scoredPosts = await Promise.all(posts.map(async post => {
            if (userPref.readPosts.has(post.id)) {
                return { post, score: -1 }; // Already read posts get lowest priority
            }

            let score = 0;

            // Category preference score (30% weight)
            const categoryScore = post.categories.reduce((sum, category) => 
                sum + (userPref.categories[category] || 0), 0);
            score += (categoryScore * 0.3);

            // Author preference score (20% weight)
            const authorScore = userPref.authors[post.author] || 0;
            score += (authorScore * 0.2);

            // Content similarity score (30% weight)
            let similarityScore = 0;
            const postVector = await this.computePostVector(post);
            this.postVectors.set(post.id, { id: post.id, vector: postVector });

            // Compare with recently read posts
            const recentPosts = Array.from(userPref.readPosts)
                .sort((a, b) => (userPref.lastReadTimestamp[b] || 0) - (userPref.lastReadTimestamp[a] || 0))
                .slice(0, 5); // Consider last 5 read posts

            for (const recentPostId of recentPosts) {
                const recentPostVector = this.postVectors.get(recentPostId);
                if (recentPostVector) {
                    similarityScore += this.cosineSimilarity(postVector, recentPostVector.vector);
                }
            }
            score += (similarityScore * 0.3);

            // Engagement score (20% weight)
            const engagementScore = (post.upvotes * 2 + post.views + post.comments.length * 3) / 100;
            score += (engagementScore * 0.2);

            return { post, score };
        }));

        // Sort by score and get top recommendations
        const recommendations = scoredPosts
            .sort((a, b) => b.score - a.score)
            .map(item => item.post)
            .slice(0, limit);

        // Cache the results
        this.cache.set(userId, recommendations);
        setTimeout(() => this.invalidateCache(userId), this.cacheTimeout);

        return recommendations;
    }
}

export const recommendationService = RecommendationService.getInstance();
