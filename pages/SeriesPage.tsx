import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SeriesWithPosts } from '../types/series';
import { useSeriesManagement } from '../hooks/useSeriesManagement';
import { ChevronLeftIcon, ChevronRightIcon } from '../components/Icons';

export const SeriesPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { getSeriesWithPosts } = useSeriesManagement();
    const [series, setSeries] = useState<SeriesWithPosts | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSeries = async () => {
            try {
                if (!slug) {
                    setError('Series not found');
                    setLoading(false);
                    return;
                }
                const seriesData = await getSeriesWithPosts(slug);
                if (!seriesData) {
                    setError('Series not found');
                } else {
                    setSeries(seriesData);
                }
                setLoading(false);
            } catch (err: any) {
                console.error('Error loading series:', err);
                setError(err.message || 'Error loading series');
                setLoading(false);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadSeries();
    }, [slug, getSeriesWithPosts]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
                    <p className="text-red-600 dark:text-red-300">{error}</p>
                    <Link to="/" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    if (!series) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Series not found</h2>
                    <p className="text-slate-600 dark:text-slate-400">The series you're looking for doesn't exist or has been removed.</p>
                    <Link to="/" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Series Header */}
            <div className="mb-8">
                {series.coverImage && (
                    <div className="relative h-64 rounded-xl overflow-hidden mb-6">
                        <img 
                            src={series.coverImage} 
                            alt={series.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                    {series.title}
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">
                    {series.description}
                </p>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-500">
                    <span>By {series.authorName}</span>
                    <span className="mx-2">•</span>
                    <span>{series.totalPosts} posts</span>
                </div>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
                {series.posts.map((post, index) => (
                    <Link
                        key={post.id}
                        to={`/post/${post.slug}`}
                        className="block bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                        <div className="flex items-center">
                            <div className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-400 font-semibold mr-4">
                                {index + 1}
                            </div>
                            <div className="flex-grow">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {post.title}
                                </h3>
                            </div>
                            <ChevronRightIcon className="w-5 h-5 text-slate-400" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};
