import React from 'react';
import { Link } from 'react-router-dom';
import { Series } from '../types/series';

interface SeriesCardProps {
    series: Series;
    compact?: boolean;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({ series, compact = false }) => {
    return (
        <Link 
            to={`/series/${series.slug}`}
            className="block bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
        >
            {series.coverImage && !compact && (
                <div className="relative h-48 rounded-t-lg overflow-hidden">
                    <img 
                        src={series.coverImage} 
                        alt={series.title}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
            <div className="p-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {series.title}
                </h3>
                {!compact && (
                    <p className="text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                        {series.description}
                    </p>
                )}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-blue-600 dark:text-blue-400">
                        {series.totalPosts} posts
                    </span>
                    <span className="text-slate-500 dark:text-slate-500">
                        by {series.authorName}
                    </span>
                </div>
            </div>
        </Link>
    );
};
