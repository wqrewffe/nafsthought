import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Post } from '../types';

interface ContentMetrics {
    id: string;
    title: string;
    engagement: number;
    trending: boolean;
    recommendations: string[];
}

interface AiInsight {
    metric: string;
    insight: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
}

export const ContentAnalytics: React.FC = () => {
    const [metrics, setMetrics] = useState<ContentMetrics[]>([]);
    const [insights, setInsights] = useState<AiInsight[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const postsRef = collection(db, 'posts');
                const q = query(postsRef, orderBy('date', 'desc'), limit(50));
                const querySnapshot = await getDocs(q);
                
                const metricsData: ContentMetrics[] = querySnapshot.docs.map(doc => {
                    const post = doc.data() as Post;
                    const engagement = calculateEngagement(post);
                    
                    return {
                        id: doc.id,
                        title: post.title,
                        engagement,
                        trending: engagement > 100, // Threshold for trending content
                        recommendations: generateRecommendations(post)
                    };
                });

                setMetrics(metricsData);
                generateInsights(metricsData);
            } catch (error) {
                console.error('Error fetching metrics:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    const calculateEngagement = (post: Post): number => {
        const views = post.views || 0;
        const upvotes = post.upvotes || 0;
        const comments = post.comments?.length || 0;
        
        // Weighted engagement score
        return (views * 1) + (upvotes * 3) + (comments * 5);
    };

    const generateRecommendations = (post: Post): string[] => {
        const recommendations: string[] = [];
        
        if (!post.categories || post.categories.length === 0) {
            recommendations.push('Add relevant categories to improve discoverability');
        }
        
        if (!post.coverImage) {
            recommendations.push('Add a cover image to increase engagement');
        }
        
        if (post.content.length < 500) {
            recommendations.push('Consider expanding the content for better SEO');
        }

        return recommendations;
    };

    const generateInsights = (metricsData: ContentMetrics[]) => {
        const insights: AiInsight[] = [];
        
        // Top performing content
        const topContent = metricsData.sort((a, b) => b.engagement - a.engagement)[0];
        if (topContent) {
            insights.push({
                metric: 'Top Performing Content',
                insight: `"${topContent.title}" is your best performing content`,
                recommendation: 'Analyze what made this content successful and replicate the strategy',
                priority: 'high'
            });
        }

        // Content needing improvement
        const lowEngagement = metricsData.filter(m => m.engagement < 50);
        if (lowEngagement.length > 0) {
            insights.push({
                metric: 'Low Engagement',
                insight: `${lowEngagement.length} posts have low engagement`,
                recommendation: 'Review and update these posts with fresh content and better SEO',
                priority: 'medium'
            });
        }

        setInsights(insights);
    };

    const renderPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
        const colors = {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-green-100 text-green-800'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority]}`}>
                {priority}
            </span>
        );
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Content Analytics</h2>
            
            {/* Insights Section */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">AI Insights</h3>
                <div className="space-y-4">
                    {insights.map((insight, index) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                    {insight.metric}
                                </span>
                                {renderPriorityBadge(insight.priority)}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 mb-1">{insight.insight}</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                Recommendation: {insight.recommendation}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Metrics Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Content
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Engagement
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Recommendations
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {metrics.map((metric) => (
                            <tr key={metric.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                                    {metric.title}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                                    {metric.engagement}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {metric.trending ? (
                                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                            Trending
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">
                                            Normal
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                    <ul className="list-disc list-inside">
                                        {metric.recommendations.map((rec, idx) => (
                                            <li key={idx}>{rec}</li>
                                        ))}
                                    </ul>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
