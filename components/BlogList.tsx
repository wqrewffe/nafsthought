

import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { HeartIcon, CommentIcon, EyeIcon } from './Icons';
import { AuthorAvatar } from './AuthorAvatar';

interface BlogListProps {
  posts: Post[];
}

const StatIcon: React.FC<{ icon: React.ReactNode; value: number | string }> = ({ icon, value }) => (
  <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
    {icon}
    <span className="text-xs font-medium">{value}</span>
  </div>
);

export const BlogList: React.FC<BlogListProps> = ({ posts }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid gap-10 md:grid-cols-2 lg:gap-12">
        {posts.map(post => (
          <Link to={`/post/${post.slug}`} key={post.id} className="group block animate-fade-in">
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
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">{post.category}</span>
                </div>
                <h3 className="text-xl font-semibold font-serif text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {post.title}
                </h3>
                <div className="mt-auto pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <AuthorAvatar className="w-9 h-9" name={post.author} photoURL={post.authorPhotoURL} />
                            <div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{post.author}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{post.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <StatIcon icon={<HeartIcon className="w-4 h-4" />} value={post.upvotes} />
                            <StatIcon icon={<CommentIcon className="w-4 h-4" />} value={post.comments.length} />
                            <StatIcon icon={<EyeIcon className="w-4 h-4" />} value={post.views.toLocaleString()} />
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};