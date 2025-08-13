import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface SeriesNavigationProps {
    seriesId: string;
    seriesTitle: string;
    currentPostNumber: number;
    totalPosts: number;
    previousPost?: {
        slug: string;
        title: string;
    };
    nextPost?: {
        slug: string;
        title: string;
    };
}

export const SeriesNavigation: React.FC<SeriesNavigationProps> = ({
    seriesId,
    seriesTitle,
    currentPostNumber,
    totalPosts,
    previousPost,
    nextPost
}) => {
    return (
        <div className="border-t border-b border-slate-200 dark:border-slate-700 my-8 py-4">
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                <Link to={`/series/${seriesId}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                    {seriesTitle}
                </Link>
                <span className="mx-2">•</span>
                <span>Part {currentPostNumber} of {totalPosts}</span>
            </div>
            
            <div className="flex justify-between items-center">
                {previousPost ? (
                    <Link
                        to={`/post/${previousPost.slug}`}
                        className="flex items-center space-x-2 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                        <div>
                            <div className="text-xs">Previous</div>
                            <div className="text-sm font-medium">{previousPost.title}</div>
                        </div>
                    </Link>
                ) : (
                    <div /> // Empty div for spacing
                )}

                {nextPost ? (
                    <Link
                        to={`/post/${nextPost.slug}`}
                        className="flex items-center space-x-2 text-right text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                        <div>
                            <div className="text-xs">Next</div>
                            <div className="text-sm font-medium">{nextPost.title}</div>
                        </div>
                        <ChevronRightIcon className="w-5 h-5" />
                    </Link>
                ) : (
                    <div /> // Empty div for spacing
                )}
            </div>
        </div>
    );
};
