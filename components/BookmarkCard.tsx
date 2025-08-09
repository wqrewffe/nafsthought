import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserBookmark, Post } from '../types';
import { api } from '../hooks/useBlogData';

interface BookmarkCardProps {
    bookmark: UserBookmark;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark }) => {
    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPost = async () => {
            try {
                const postData = await api.getPost(bookmark.postId);
                if (postData) {
                    setPost(postData);
                }
            } catch (error) {
                console.error('Failed to load post:', error);
            } finally {
                setLoading(false);
            }
        };

        loadPost();
    }, [bookmark.postId]);

    if (loading) {
        return (
            <div className="block bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow animate-pulse">
                <div className="space-y-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="block bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                <div className="text-slate-600 dark:text-slate-400">
                    This post is no longer available
                </div>
            </div>
        );
    }

    return (
        <Link to={`/post/${post.slug}`} className="block bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{post.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Saved {new Date(bookmark.addedAt).toLocaleDateString()}
                    </p>
                    {bookmark.note && (
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 italic">
                            "{bookmark.note}"
                        </p>
                    )}
                    {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {bookmark.tags.map((tag, idx) => (
                                <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2 py-1 rounded-full">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
};
