import { useState, useEffect } from 'react';
import { User, UserPreferences, ReadingHistory } from '../types';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Scoring weights
const WEIGHTS = {
  CATEGORY_MATCH: 3,          // Base weight for category matches
  CATEGORY_TREND: 2,         // Weight for trending categories in user's history
  READING_TIME: 2,           // Weight for posts similar to ones user spends time on
  COMPLETION_BONUS: 1.5,     // Bonus for categories user typically reads to completion
  ENGAGEMENT: 1.8,           // Weight for user engagement (comments, upvotes)
  TIME_DECAY: 0.8,          // Factor for time decay in relevance
  DIVERSITY_BONUS: 1.2,     // Bonus for introducing some content variety
  RECENCY_PENALTY: 0.7      // Penalty for recently viewed content
};

const MAX_HISTORY = 100;     // Keep more history for better analysis
const TREND_WINDOW = 7;      // Days to look back for trending analysis
const MAX_CATEGORY_BOOST = 5; // Maximum boost for any single category

export const useUserPreferences = (user: User | null) => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setPreferences(null);
        setLoading(false);
        return;
      }

      try {
        const prefsDoc = await getDoc(doc(db, 'userPreferences', user.uid));
        if (prefsDoc.exists()) {
          setPreferences(prefsDoc.data() as UserPreferences);
        } else {
          // Initialize preferences if they don't exist
          const initialPrefs: UserPreferences = {
            categoryScores: {},
            lastReadPosts: [],
            readingHistory: []
          };
          await setDoc(doc(db, 'userPreferences', user.uid), initialPrefs);
          setPreferences(initialPrefs);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const updateReadingHistory = async (postId: string, categories: string[], timeSpent: number, completed: boolean) => {
    if (!user || !preferences) return;

    try {
      const timestamp = new Date().toISOString();
      const newHistory: ReadingHistory = {
        postId,
        timestamp,
        timeSpent,
        completed,
        categories
      };

      // Calculate time-based engagement score
      const engagementScore = Math.min(timeSpent / 180, 1); // Cap at 3 minutes for max score

      // Update category scores with sophisticated weighting
      const updatedScores = { ...preferences.categoryScores };
      categories.forEach(category => {
        // Base score from current interaction
        const baseScore = completed ? WEIGHTS.CATEGORY_MATCH : WEIGHTS.CATEGORY_MATCH * 0.5;
        
        // Time spent bonus
        const timeBonus = engagementScore * WEIGHTS.READING_TIME;
        
        // Analyze category trend
        const recentHistory = preferences.readingHistory
          .filter(h => new Date(h.timestamp) > new Date(Date.now() - TREND_WINDOW * 24 * 60 * 60 * 1000));
        const categoryTrend = recentHistory
          .filter(h => h.categories.includes(category))
          .length / Math.max(recentHistory.length, 1);
        
        // Calculate completion rate for this category
        const categoryHistory = recentHistory.filter(h => h.categories.includes(category));
        const completionRate = categoryHistory.length > 0
          ? categoryHistory.filter(h => h.completed).length / categoryHistory.length
          : 0;
        
        // Combine all factors with trend and completion bonuses
        const totalScore = (
          baseScore +
          timeBonus +
          (categoryTrend * WEIGHTS.CATEGORY_TREND) +
          (completionRate * WEIGHTS.COMPLETION_BONUS)
        );

        // Apply score with time decay for older interactions
        updatedScores[category] = Math.min(
          (updatedScores[category] || 0) * WEIGHTS.TIME_DECAY + totalScore,
          MAX_CATEGORY_BOOST
        );
      });

      // Update last read posts with more history
      const updatedLastRead = [
        postId,
        ...preferences.lastReadPosts.filter(id => id !== postId)
      ].slice(0, 30); // Keep last 30 posts

      // Update reading history
      const updatedHistory = [
        newHistory,
        ...preferences.readingHistory
      ].slice(0, MAX_HISTORY);

      const updatedPrefs: UserPreferences = {
        categoryScores: updatedScores,
        lastReadPosts: updatedLastRead,
        readingHistory: updatedHistory
      };

      const prefsToUpdate = {
        'categoryScores': updatedPrefs.categoryScores,
        'lastReadPosts': updatedPrefs.lastReadPosts,
        'readingHistory': updatedPrefs.readingHistory
      };
      await updateDoc(doc(db, 'userPreferences', user.uid), prefsToUpdate);
      setPreferences(updatedPrefs);
    } catch (error) {
      console.error('Error updating reading history:', error);
    }
  };

  const getPostScore = (post: { 
    id: string; 
    categories: string[]; 
    upvotes?: number; 
    views?: number; 
    comments?: any[];
    date?: string;
  }) => {
    if (!preferences) return 0;

    let score = 0;

    // 1. Category Relevance Score
    const categoryScores = post.categories.map(category => {
      const baseScore = (preferences.categoryScores[category] || 0) * WEIGHTS.CATEGORY_MATCH;
      
      // Get trend score for this category
      const recentHistory = preferences.readingHistory
        .filter(h => new Date(h.timestamp) > new Date(Date.now() - TREND_WINDOW * 24 * 60 * 60 * 1000));
      const categoryTrend = recentHistory
        .filter(h => h.categories.includes(category))
        .length / Math.max(recentHistory.length, 1);
      
      return baseScore * (1 + categoryTrend * WEIGHTS.CATEGORY_TREND);
    });

    // Use the top 2 category scores to prevent over-emphasis on multiple categories
    score += categoryScores
      .sort((a, b) => b - a)
      .slice(0, 2)
      .reduce((sum, score) => sum + score, 0);

    // 2. Content Diversity Bonus
    const uniqueCategories = new Set(post.categories);
    if (uniqueCategories.size > 1) {
      score *= WEIGHTS.DIVERSITY_BONUS;
    }

    // 3. Engagement Score (if available)
    if (post.upvotes !== undefined || post.views !== undefined || post.comments !== undefined) {
      const engagementScore = (
        ((post.upvotes || 0) * 2) +
        ((post.views || 0) / 10) +
        ((post.comments?.length || 0) * 3)
      ) * WEIGHTS.ENGAGEMENT;
      score += Math.min(engagementScore, 10); // Cap engagement boost
    }

    // 4. Time-based Adjustments
    if (post.date) {
      const postAge = Date.now() - new Date(post.date).getTime();
      const daysSincePost = postAge / (1000 * 60 * 60 * 24);
      const timeDecay = Math.exp(-daysSincePost / 30); // 30-day half-life
      score *= timeDecay;
    }

    // 5. Recency Penalty (avoid showing same content repeatedly)
    const lastReadIndex = preferences.lastReadPosts.indexOf(post.id);
    if (lastReadIndex !== -1) {
      const recencyPenalty = (30 - lastReadIndex) * WEIGHTS.RECENCY_PENALTY;
      score = Math.max(0, score - recencyPenalty);
    }

    // 6. Reading Pattern Analysis
    const userReadingPatterns = preferences.readingHistory.slice(-20);
    const averageReadTime = userReadingPatterns.reduce((sum, h) => sum + h.timeSpent, 0) / userReadingPatterns.length;
    const completionRate = userReadingPatterns.filter(h => h.completed).length / userReadingPatterns.length;

    // Boost posts in categories user tends to complete
    const categoryCompletionBoost = post.categories.some(category => {
      const categoryHistory = userReadingPatterns.filter(h => h.categories.includes(category));
      const categoryCompletionRate = categoryHistory.length > 0
        ? categoryHistory.filter(h => h.completed).length / categoryHistory.length
        : 0;
      return categoryCompletionRate > completionRate;
    });

    if (categoryCompletionBoost) {
      score *= WEIGHTS.COMPLETION_BONUS;
    }

    return score;
  };

  return {
    preferences,
    loading,
    updateReadingHistory,
    getPostScore
  };
};
