import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Post, Comment, User, Category } from '../types';
import { EyeIcon, CommentIcon, HeartIcon, TrashIcon, EditIcon, SpinnerIcon, FlagIcon, CheckCircleIcon, UserIcon, PlusIcon } from '../components/Icons';
import { Link } from 'react-router-dom';
import { api } from '../hooks/useBlogData';
import { useAuth } from '../hooks/useAuth';

interface DashboardPageProps {
  posts: Post[];
  onEditPost: (post: Post) => void;
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => Promise<void>;
  onDismissReport: (postId: string) => Promise<void>;
  onBlockUser: (userId: string) => Promise<void>;
}

const Stat: React.FC<{ icon: React.ReactNode; value: string | number }> = ({ icon, value }) => (
  <div className="flex items-center space-x-1.5 text-slate-500 dark:text-slate-400">
    {icon}
    <span className="text-sm font-medium">{value}</span>
  </div>
);

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; label: string; className?: string }> = ({ onClick, icon, label, className }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${className}`}
        aria-label={label}
    >
        {icon}
        <span>{label}</span>
    </button>
);

const ReportManagement: React.FC<Pick<DashboardPageProps, 'posts' | 'onDeletePost' | 'onDismissReport'>> = ({ posts, onDeletePost, onDismissReport }) => {
    const reportedPosts = useMemo(() => posts.filter(p => p.reports && p.reports.length > 0), [posts]);

    const handleBlockUser = async (uid: string) => {
        if (window.confirm('Are you sure you want to block this user? They will not be able to log in or comment.')) {
            await api.toggleUserBlock(uid, false); // false means 'isBlocked' is currently false, so we block them
        }
    };
    
    if (reportedPosts.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                <CheckCircleIcon className="w-12 h-12 mx-auto text-green-500" />
                <h2 className="mt-4 text-xl font-semibold text-slate-800 dark:text-white">All Clear!</h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">There are no reported posts to review.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {reportedPosts.map(post => (
                <div key={post.id} className="bg-white dark:bg-slate-800/50 border-l-4 border-red-500 rounded-r-lg shadow-sm">
                    <div className="p-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <Link to={`/post/${post.slug}`} className="hover:underline">
                                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{post.title}</h3>
                                </Link>
                                <p className="text-sm text-slate-500 dark:text-slate-400">by {post.author}</p>
                            </div>
                            <span className="flex items-center text-sm font-bold text-red-500 bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-full">
                                <FlagIcon className="w-4 h-4 mr-1.5" />
                                {post.reports.length} {post.reports.length > 1 ? 'Reports' : 'Report'}
                            </span>
                        </div>
                        <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Reasons for Report:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                                {post.reports.map((report, index) => (
                                    <li key={index}>"{report.reason}"</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg flex flex-wrap gap-2 justify-end">
                        <ActionButton onClick={() => onDismissReport(post.id)} icon={<CheckCircleIcon className="w-4 h-4" />} label="Dismiss Report" className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900"/>
                        <ActionButton onClick={() => handleBlockUser(post.authorId)} icon={<UserIcon className="w-4 h-4" />} label="Block Author" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900"/>
                        <ActionButton onClick={() => onDeletePost(post.id)} icon={<TrashIcon className="w-4 h-4" />} label="Delete Post" className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"/>
                    </div>
                </div>
            ))}
        </div>
    );
};

const UserManagement: React.FC = () => {
    const { user: adminUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const fetchedUsers = await api.getUsers();
            setUsers(fetchedUsers.filter(u => u.uid !== adminUser?.uid));
        } catch (err: any) {
            setError('Failed to load users.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [adminUser]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleToggleBlock = async (userToToggle: User) => {
        setUsers(currentUsers => currentUsers.map(u => u.uid === userToToggle.uid ? { ...u, isBlocked: !u.isBlocked } : u));
        try {
            await api.toggleUserBlock(userToToggle.uid, userToToggle.isBlocked);
        } catch (err: any) {
            console.error('Failed to toggle block status:', err);
            setError(`Failed to update ${userToToggle.name}. Please refresh.`);
            setUsers(currentUsers => currentUsers.map(u => u.uid === userToToggle.uid ? { ...u, isBlocked: userToToggle.isBlocked } : u));
        }
    };
    
    if (loading) return <div className="flex justify-center items-center py-10"><SpinnerIcon className="w-8 h-8" /></div>;
    if (error) return <div className="text-red-500 text-center py-10">{error}</div>;

    return (
        <div className="overflow-x-auto">
            <div className="min-w-full bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl">
                 <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Name</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Email</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {users.map(user => (
                            <tr key={user.uid}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{user.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {user.isBlocked ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Blocked</span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Active</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => handleToggleBlock(user)} className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${user.isBlocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                                        {user.isBlocked ? 'Unblock' : 'Block'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const PostsManagement: React.FC<Omit<DashboardPageProps, 'onDismissReport' | 'onBlockUser'>> = ({ posts, onEditPost, onDeletePost, onDeleteComment }) => {
    const { user } = useAuth();
    const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

    if (!user) {
        return <div className="flex justify-center items-center py-10"><SpinnerIcon className="w-8 h-8" /></div>;
    }
    
    const displayedPosts = user.role === 'admin'
        ? posts
        : posts.filter(post => post.authorId === user.uid);

    return (
        <div className="space-y-8">
            {displayedPosts.map(post => (
                <div key={post.id} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-sm transition-all duration-300">
                    <div className="p-6">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-start">
                            <div>
                                <Link to={`/post/${post.slug}`} className="hover:underline">
                                    <h2 className="text-2xl font-semibold font-serif text-slate-900 dark:text-white">{post.title}</h2>
                                </Link>
                                <div className="flex items-center space-x-2 mt-1">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">By {post.author} on {post.date}</p>
                                    <span className="text-gray-400 dark:text-gray-600">&bull;</span>
                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">{post.category}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 mt-4 sm:mt-0 flex-shrink-0">
                                <ActionButton onClick={() => onEditPost(post)} icon={<EditIcon className="w-4 h-4" />} label="Edit" className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900"/>
                                <ActionButton onClick={() => onDeletePost(post.id)} icon={<TrashIcon className="w-4 h-4" />} label="Delete" className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"/>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center space-x-6 border-t border-slate-200 dark:border-slate-700 pt-4">
                            <Stat icon={<EyeIcon className="w-4 h-4" />} value={post.views.toLocaleString()} />
                            <Stat icon={<HeartIcon className="w-4 h-4" />} value={post.upvotes} />
                            <Stat icon={<CommentIcon className="w-4 h-4" />} value={post.comments.length} />
                        </div>

                         {post.comments.length > 0 && user?.role === 'admin' && (
                            <div className="mt-4">
                                <button onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                    {expandedPostId === post.id ? 'Hide Comments' : `Show Comments (${post.comments.length})`}
                                </button>
                            </div>
                         )}
                    </div>

                    {expandedPostId === post.id && user?.role === 'admin' && (
                         <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/20 px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Comments</h3>
                            <div className="space-y-4">
                                {post.comments.map(comment => (
                                    <div key={comment.id} className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{comment.author}</p>
                                            <p className="text-slate-600 dark:text-slate-400">{comment.text}</p>
                                        </div>
                                        <button onClick={() => onDeleteComment(post.id, comment.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 transition-colors p-1 rounded-full" aria-label="Delete comment">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {displayedPosts.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-white">You haven't posted anything yet!</h2>
                    <p className="mt-2 text-slate-500 dark:text-slate-400">Click "New Post" in the header to get started.</p>
                </div>
            )}
        </div>
    );
};

const CategoryManagement: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchCategories = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            let fetchedCategories = await api.getCategories();
            if (fetchedCategories.length === 0) {
                await api.seedInitialCategories();
                fetchedCategories = await api.getCategories();
            }
            setCategories(fetchedCategories);
        } catch (err: any) {
            setError('Failed to load categories.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) {
            setError("Category name cannot be empty.");
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await api.addCategory(newCategory);
            setNewCategory('');
            await fetchCategories();
        } catch (err: any) {
            setError(err.message || "Failed to add category.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center py-10"><SpinnerIcon className="w-8 h-8" /></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Existing Categories</h3>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex flex-wrap gap-3">
                    {categories.map(cat => (
                        <span key={cat.id} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium px-4 py-2 rounded-lg">
                            {cat.name}
                        </span>
                    ))}
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700/50">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add New Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4">
                    <div>
                        <label htmlFor="new-category" className="sr-only">Category Name</label>
                        <input
                            id="new-category"
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            placeholder="e.g., Productivity"
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        />
                    </div>
                    <button type="submit" className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400" disabled={isSubmitting}>
                        {isSubmitting ? <SpinnerIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                        <span>{isSubmitting ? 'Adding...' : 'Add Category'}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};


export const DashboardPage: React.FC<DashboardPageProps> = (props) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'posts' | 'users' | 'reports' | 'categories'>('posts');
    
    const TabButton: React.FC<{tabName: typeof activeTab, label: string, count?: number}> = ({tabName, label, count}) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors relative ${
                activeTab === tabName 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {count}
                </span>
            )}
        </button>
    );

    const reportCount = useMemo(() => props.posts.filter(p => p.reports && p.reports.length > 0).length, [props.posts]);

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <header className="mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
                 <div className="flex flex-wrap gap-4 justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-bold font-serif text-slate-900 dark:text-white">
                            {user?.role === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}
                        </h1>
                        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
                             {user?.role === 'admin' ? 'Manage all posts, comments, and users.' : 'Manage your posts and profile.'}
                        </p>
                    </div>
                     {user?.role === 'admin' && <Link 
                        to="/admin/status" 
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 dark:focus:ring-offset-slate-900 transition-colors"
                    >
                        Check Firebase Connection
                    </Link>}
                </div>
            </header>
            
            <div className="mb-8 flex space-x-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-2">
                <TabButton tabName='posts' label={user?.role === 'admin' ? "All Posts" : "My Posts"}/>
                {user?.role === 'admin' && <TabButton tabName='users' label="User Management"/>}
                {user?.role === 'admin' && <TabButton tabName='reports' label="Reports" count={reportCount} />}
                {user?.role === 'admin' && <TabButton tabName='categories' label="Categories" />}
            </div>

            {activeTab === 'posts' && <PostsManagement {...props} />}
            {activeTab === 'users' && user?.role === 'admin' && <UserManagement />}
            {activeTab === 'reports' && user?.role === 'admin' && <ReportManagement {...props} />}
            {activeTab === 'categories' && user?.role === 'admin' && <CategoryManagement />}
            
        </div>
    );
};
