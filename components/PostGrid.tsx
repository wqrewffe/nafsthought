import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Post } from '../types';
import { formatPost, api } from '../hooks/useBlogData';
import { SpinnerIcon, EditIcon, TrashIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';

interface PostGridProps {
    userId: string;
}

export const PostGrid: React.FC<PostGridProps> = ({ userId }) => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadPosts = async () => {
            if (!userId) {
                setError('No user ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError('');
                const postsQuery = query(
                    collection(db, 'posts'),
                    where('authorId', '==', userId)
                );
                const postsSnap = await getDocs(postsQuery);
                const loadedPosts = postsSnap.docs
                    .map(doc => {
                        try {
                            return formatPost(doc);
                        } catch (formatError) {
                            console.error('Error formatting post:', doc.id, formatError);
                            return null;
                        }
                    })
                    .filter((post): post is Post => post !== null)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                setPosts(loadedPosts);
            } catch (err) {
                console.error('Failed to load posts:', err);
                setError(err instanceof Error ? err.message : 'Failed to load posts');
            } finally {
                setLoading(false);
            }
        };

        loadPosts();
    }, [userId]);

    const handleDelete = async (postId: string, event: React.MouseEvent) => {
        event.preventDefault(); // Prevent navigation
        if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            try {
                await api.deletePost(postId);
                setPosts(posts.filter(p => p.id !== postId));
            } catch (error) {
                console.error('Failed to delete post:', error);
                alert('Failed to delete post. Please try again.');
            }
        }
    };

    if (loading) {
        return (
            <div className="col-span-2 flex justify-center p-8">
                <SpinnerIcon className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="col-span-2 text-center p-8 text-red-600 dark:text-red-400">
                {error}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="col-span-2 text-center p-8 text-slate-600 dark:text-slate-400">
                No published posts yet
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {posts.map(post => (
                <div
                    key={post.id}
                    className="group relative bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-all"
                >
                    {/* Edit/Delete buttons overlay for admin only */}
                    {user && user.role === 'admin' && (
                        <div className="absolute top-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-lg shadow-md p-1 z-10">
                            <Link
                                to={`/edit/${post.slug}`}
                                className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <EditIcon className="w-5 h-5" />
                            </Link>
                            {user.role === 'admin' && (
                                <button
                                    onClick={(e) => handleDelete(post.id, e)}
                                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}
                    
                    <Link
                        to={`/post/${post.slug}`}
                        className="block"
                    >
                        <div className="aspect-video mb-4 overflow-hidden rounded-lg">
                            <img
                                src={post.coverImage}
                                alt={post.title}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">
                            {post.title}
                        </h3>
                        <div className="mt-2 flex items-center text-sm text-slate-600 dark:text-slate-400 space-x-4">
                            <span className="flex items-center">
                                <time dateTime={new Date(post.date).toISOString()}>{post.date}</time>
                            </span>
                            <span className="flex items-center">
                                {post.views} views
                            </span>
                            <span className="flex items-center">
                                {post.upvotes} upvotes
                            </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {post.categories.map((category, idx) => (
                                <span
                                    key={idx}
                                    className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full"
                                >
                                    {category}
                                </span>
                            ))}
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
};
