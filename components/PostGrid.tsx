import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Post } from '../types';
import { formatPost } from '../hooks/useBlogData';
import { SpinnerIcon } from './Icons';

interface PostGridProps {
    userId: string;
}

export const PostGrid: React.FC<PostGridProps> = ({ userId }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    console.log('PostGrid: Rendering with userId:', userId); // Debug log

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
                console.log('Loading posts for user:', userId); // Debug log
                // Get all posts for the user first, then sort in memory while index is being created
                const postsQuery = query(
                    collection(db, 'posts'),
                    where('authorId', '==', userId)
                );
                const postsSnap = await getDocs(postsQuery);
                // Sort the posts by date in memory
                postsSnap.docs.sort((a, b) => {
                    const dateA = a.data().date?.toDate?.() || new Date(0);
                    const dateB = b.data().date?.toDate?.() || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });
                console.log(`Found ${postsSnap.docs.length} posts`); // Debug log
                const loadedPosts = postsSnap.docs.map(doc => {
                    try {
                        return formatPost(doc);
                    } catch (formatError) {
                        console.error('Error formatting post:', doc.id, formatError);
                        return null;
                    }
                }).filter(post => post !== null) as Post[];
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
        <>
            {posts.map(post => (
                <Link
                    key={post.id}
                    to={`/post/${post.slug}`}
                    className="block bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
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
            ))}
        </>
    );
};
