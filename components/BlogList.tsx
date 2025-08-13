import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { HeartIcon, CommentIcon, EyeIcon, ClockIcon } from './Icons';
import { AuthorAvatar } from './AuthorAvatar';
import { useAuth } from '../hooks/useAuth';
import { useUserPreferences } from '../hooks/useUserPreferences';
import { useNotifications } from '../context/NotificationsContext';
import { websocketService } from '../services/websocketService';
import { recommendationService } from '../services/recommendationService';
import { calculateReadingTime, formatReadingTime } from '../utils/readingTime';

interface BlogListProps {
  posts: Post[];
}

interface StatIconProps {
  icon: React.ReactNode;
  value: string | number;
  highlight?: boolean;
}

const StatIcon: React.FC<StatIconProps> = ({ icon, value, highlight }) => (
  <div
    className={`flex items-center space-x-1.5 ${
      highlight ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
    }`}
  >
    {icon}
    <span className={`text-xs ${highlight ? 'font-bold' : 'font-medium'}`}>{value}</span>
  </div>
);

export const BlogList: React.FC<BlogListProps> = ({ posts }) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'views' | 'upvotes' | 'comments' | 'category'>('date');
  const [viewMode, setViewMode] = useState<'recommended' | 'all'>('recommended');
  const [newPosts, setNewPosts] = useState<Post[]>([]);
  const [recommendedPosts, setRecommendedPosts] = useState<Post[]>([]);

  const { user } = useAuth();
  const { getPostScore } = useUserPreferences(user);
  const { showNotification } = useNotifications();

  // Get personalized recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (user && viewMode === 'recommended') {
        const recommendations = await recommendationService.getRecommendations(user.uid, posts);
        setRecommendedPosts(recommendations);
      }
    };

    fetchRecommendations();
  }, [user, posts, viewMode]);

  // Track post views and update recommendations
  const handlePostClick = useCallback((post: Post) => {
    if (user) {
      recommendationService.updateUserPreference(user.uid, post);
    }
  }, [user]);

  // WebSocket subscription for new posts
  useEffect(() => {
    if (!user) return;

    const unsubscribe = websocketService.subscribe('post', (data) => {
      if (data.type === 'new' && data.post.author !== user.name) {
        setNewPosts((prev) => [...prev, data.post]);
        showNotification({
          title: 'New Post',
          message: `${data.post.author} just published "${data.post.title}"`,
          type: 'info',
        });
      }
    });

    return () => unsubscribe();
  }, [user, showNotification]);

  // Handle newPosts notifications
  useEffect(() => {
    if (!user || newPosts.length === 0) return;

    localStorage.setItem('lastViewedPostTime', Date.now().toString());

    if (newPosts.length === 1) {
      showNotification({
        type: 'NEW_POST',
        title: 'New Blog Post',
        message: `${newPosts[0].author} published "${newPosts[0].title}"`,
        recipientId: user.uid,
        data: { postId: newPosts[0].id },
      });
    } else {
      showNotification({
        type: 'NEW_POST',
        title: 'New Blog Posts',
        message: `${newPosts.length} new posts have been published`,
        recipientId: user.uid,
      });
    }
  }, [newPosts, user, showNotification]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    const searchLower = search.toLowerCase();
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchLower) ||
        post.content.toLowerCase().includes(searchLower) ||
        (post.categories && post.categories.some((cat) => cat.toLowerCase().includes(searchLower)))
    );
  }, [posts, search]);

  // Organize posts
  const organizedPosts = useMemo(() => {
    if (!filteredPosts.length) return [];

    // If in recommended mode and we have recommendations, use them
    if (viewMode === 'recommended' && recommendedPosts.length > 0) {
      return recommendedPosts.filter(post => 
        filteredPosts.some(fp => fp.id === post.id)
      );
    }

    // Otherwise, fall back to basic sorting
    return filteredPosts.sort((a, b) => {
      switch (sortBy) {
        case 'views':
          return b.views - a.views;
        case 'upvotes':
          return b.upvotes - a.upvotes;
        case 'comments':
          return b.comments.length - a.comments.length;
        case 'category': {
          const aCat = (a.categories && a.categories[0]) || '';
          const bCat = (b.categories && b.categories[0]) || '';
          return aCat.localeCompare(bCat);
        }
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [filteredPosts, sortBy, viewMode, getPostScore]);

  const renderPost = (post: Post) => (
        <Link
      to={`/post/${post.slug}`}
      key={post.id}
      className="block bg-white dark:bg-slate-900 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 mb-6"
      onClick={() => handlePostClick(post)}
    >
      <div className="flex flex-col h-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
        <div className="h-52 overflow-hidden">
          <img
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            src={post.coverImage}
            alt={post.title}
          />
        </div>
        <div className="p-6 flex flex-col flex-grow">
          <div className="mb-3">
            {post.categories && post.categories.length > 0 ? (
              post.categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300"
                >
                  {cat}
                </span>
              ))
            ) : (
              <span className="inline-block bg-gray-100 text-gray-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full dark:bg-gray-900 dark:text-gray-300">
                Uncategorized
              </span>
            )}
          </div>
          <h3 className="text-xl font-semibold font-serif text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {post.title}
          </h3>
          <p className="mt-3 text-slate-600 dark:text-slate-400 text-sm line-clamp-3">
            {post.content.replace(/<[^>]+>/g, '').substring(0, 200)}...
          </p>
          <div className="mt-auto pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
                <AuthorAvatar
                  className="w-9 h-9"
                  name={post.author}
                  photoURL={post.authorPhotoURL}
                  clickable
                  onClick={() =>
                    (window.location.href = `/profile/${post.author.toLowerCase().replace(/\s+/g, '-')}`)
                  }
                />
                <div>
                  <button
                    onClick={() =>
                      (window.location.href = `/profile/${post.author.toLowerCase().replace(/\s+/g, '-')}`)
                    }
                    className="text-sm font-semibold text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 bg-transparent border-none cursor-pointer p-0"
                  >
                    {post.author}
                  </button>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{post.date}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <StatIcon icon={<HeartIcon className="w-4 h-4" />} value={post.upvotes} />
                <StatIcon icon={<CommentIcon className="w-4 h-4" />} value={post.comments.length} />
                <StatIcon icon={<EyeIcon className="w-4 h-4" />} value={post.views} />
                <StatIcon
                  icon={<ClockIcon className="w-4 h-4" />}
                  value={formatReadingTime(calculateReadingTime(post))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 w-full md:w-1/2"
        />
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('recommended')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'recommended'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Posts
          </button>
          {viewMode === 'all' && (
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2"
            >
              <option value="date">Newest</option>
              <option value="views">Most Viewed</option>
              <option value="upvotes">Most Upvoted</option>
              <option value="comments">Most Commented</option>
              <option value="category">Category</option>
            </select>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          {viewMode === 'recommended' ? 'Recommended for You' : 'All Posts'}
        </h2>
        <div className="grid gap-10 md:grid-cols-2 lg:gap-12">
          {organizedPosts.map((post) => renderPost(post))}
        </div>
      </div>
    </div>
  );
};
