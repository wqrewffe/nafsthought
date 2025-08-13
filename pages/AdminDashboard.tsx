import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, addDoc, where, Timestamp, deleteDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { UserRole, rolePermissions, ModerationAction } from '../types/moderation';
import { SpinnerIcon, ChartIcon, FlagIcon } from '../components/Icons';
import AutoBlogPostSystem from '../components/AutoBlogPostSystem';
import { SeriesManagement } from '../components/SeriesManagement';
import { ContentAnalytics } from '../components/ContentAnalytics';
import { UserEngagementManager } from '../components/UserEngagementManager';
import { BlogStats, ReportedContent } from '../types/analytics';

interface Post {
    id: string;
    title: string;
    views: number;
    createdAt: string;
    categories?: string[];
    comments?: any[];
    upvotes?: number;
}
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions,
    ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import MaintenanceMode from '../components/MaintenanceMode';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const StatCard: React.FC<{ title: string; value: string | number; icon?: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">{value}</p>
            </div>
            {icon && <div className="text-blue-600 dark:text-blue-400">{icon}</div>}
        </div>
    </div>
);

const ReportCard: React.FC<{ report: ReportedContent; onReview: (id: string, action: string) => void }> = ({ report, onReview }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm mb-4">
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{report.postTitle}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Reported by {report.reporterName}</p>
            </div>
            <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {report.status}
            </span>
        </div>
        <p className="text-slate-700 dark:text-slate-300 mb-4">{report.reason}</p>
        <div className="flex space-x-4">
            <button
                onClick={() => onReview(report.id, 'dismiss')}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
                Dismiss
            </button>
            <button
                onClick={() => onReview(report.id, 'delete')}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
                Delete Post
            </button>
        </div>
    </div>
);

const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top' as const,
        },
        title: {
            display: true,
            text: 'Site Activity'
        }
    },
    scales: {
        y: {
            beginAtZero: true
        }
    }
};

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'reports' | 'auto-blog' | 'series' | 'content-analytics' | 'user-engagement'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionType, setActionType] = useState<'block' | 'role_change' | 'permissions'>('block');
    const [blockDuration, setBlockDuration] = useState(1);
    const [newRole, setNewRole] = useState<UserRole>('user');
    const [actionReason, setActionReason] = useState('');
    const [blogStats, setBlogStats] = useState<BlogStats | null>(null);
    const [reportedContent, setReportedContent] = useState<ReportedContent[]>([]);
    const [chartData, setChartData] = useState<ChartData<'line'>>({
        labels: [],
        datasets: [
            {
                label: 'Views',
                data: [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
            },
            {
                label: 'Posts',
                data: [],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
            }
        ]
    });
    const [selectedPermissions, setSelectedPermissions] = useState({
        canCreatePosts: true,
        canEditOwnPosts: true,
        canDeleteOwnPosts: true,
        canModerateComments: false,
        canManageCategories: false,
    });
    const [showModerationHistory, setShowModerationHistory] = useState(false);
    const [recentPosts, setRecentPosts] = useState<any[]>([]);
    const [recentComments, setRecentComments] = useState<any[]>([]);

    // Load analytics data
    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30));
                const postsSnapshot = await getDocs(postsQuery);
                const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];

                // Process posts for chart data
                const dates = posts.map(post => {
                    const date = new Date(post.createdAt);
                    return date.toLocaleDateString();
                });
                const uniqueDates = Array.from(new Set(dates)).sort();
                
                const viewsData = uniqueDates.map(date => {
                    return posts
                        .filter(post => new Date(post.createdAt).toLocaleDateString() === date)
                        .reduce((sum, post) => sum + (post.views || 0), 0);
                });

                const postsData = uniqueDates.map(date => {
                    return posts.filter(post => new Date(post.createdAt).toLocaleDateString() === date).length;
                });

                setChartData({
                    labels: uniqueDates,
                    datasets: [
                        {
                            label: 'Views',
                            data: viewsData,
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        },
                        {
                            label: 'Posts',
                            data: postsData,
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.5)',
                        }
                    ]
                });

                // Calculate statistics
                const stats: BlogStats = {
                    totalPosts: posts.length,
                    totalViews: posts.reduce((sum: number, post: any) => sum + (post.views || 0), 0),
                    totalUpvotes: posts.reduce((sum: number, post: any) => sum + (post.upvotes || 0), 0),
                    totalComments: posts.reduce((sum: number, post: any) => sum + (post.comments?.length || 0), 0),
                    topCategories: [],
                    mostViewedPosts: posts
                        .sort((a: any, b: any) => (b.views || 0) - (a.views || 0))
                        .slice(0, 5)
                        .map((post: any) => ({
                            id: post.id,
                            title: post.title,
                            views: post.views || 0
                        })),
                    userStats: {
                        totalUsers: users.length,
                        activeUsers: users.filter(u => !u.isBlocked).length,
                        blockedUsers: users.filter(u => u.isBlocked).length,
                        roleDistribution: users.reduce((acc: Record<string, number>, user) => {
                            acc[user.role] = (acc[user.role] || 0) + 1;
                            return acc;
                        }, {})
                    },
                    activityTimeline: []
                };

                // Calculate category statistics
                const categoryCount: Record<string, number> = {};
                posts.forEach((post: any) => {
                    post.categories?.forEach((cat: string) => {
                        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                    });
                });
                stats.topCategories = Object.entries(categoryCount)
                    .map(([category, count]) => ({ category, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                setBlogStats(stats);
            } catch (err) {
                console.error('Error loading analytics:', err);
                setError('Failed to load analytics data');
            }
        };

        if (users.length > 0) {
            loadAnalytics();
        }
    }, [users]);

    // Load reported content
    useEffect(() => {
        const loadReportedContent = async () => {
            try {
                const reportsQuery = query(collection(db, 'reports'), where('status', '==', 'pending'));
                const reportsSnapshot = await getDocs(reportsQuery);
                const reports = reportsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ReportedContent[];
                setReportedContent(reports);
            } catch (err) {
                console.error('Error loading reports:', err);
                setError('Failed to load reported content');
            }
        };

        loadReportedContent();
    }, []);

    // Handle report review
    const handleReportReview = async (reportId: string, action: string) => {
        try {
            const reportRef = doc(db, 'reports', reportId);
            const report = reportedContent.find(r => r.id === reportId);
            
            if (!report) return;

            if (action === 'delete') {
                // Delete the post
                await deleteDoc(doc(db, 'posts', report.postId));
                // Update report status
                await updateDoc(reportRef, {
                    status: 'reviewed',
                    reviewedBy: 'current-admin-id', // Replace with actual admin ID
                    reviewedAt: new Date().toISOString(),
                    actionTaken: 'post_deleted'
                });
            } else {
                // Dismiss the report
                await updateDoc(reportRef, {
                    status: 'dismissed',
                    reviewedBy: 'current-admin-id', // Replace with actual admin ID
                    reviewedAt: new Date().toISOString(),
                    actionTaken: 'dismissed'
                });
            }

            // Update local state
            setReportedContent(reportedContent.filter(r => r.id !== reportId));
        } catch (err) {
            console.error('Error handling report:', err);
            setError('Failed to process report');
        }
    };

    // Load users
    useEffect(() => {
        const loadUsers = async () => {
            try {
                setLoading(true);
                const usersQuery = query(collection(db, 'users'));
                const snapshot = await getDocs(usersQuery);
                const loadedUsers = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                })) as User[];
                setUsers(loadedUsers);
            } catch (err) {
                console.error('Error loading users:', err);
                setError('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        loadUsers();
    }, []);

    // Load recent posts
    useEffect(() => {
        const loadRecentPosts = async () => {
            try {
                const postsQuery = query(
                    collection(db, 'posts'),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );
                const postsSnapshot = await getDocs(postsQuery);
                const loadedPosts = postsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRecentPosts(loadedPosts);
            } catch (err) {
                console.error('Error loading recent posts:', err);
                setError('Failed to load recent posts');
            }
        };

        loadRecentPosts();
    }, []);

    // Load recent comments
    useEffect(() => {
        const loadRecentComments = async () => {
            try {
                const commentsQuery = query(
                    collection(db, 'comments'),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                );
                const commentsSnapshot = await getDocs(commentsQuery);
                const loadedComments = commentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRecentComments(loadedComments);
            } catch (err) {
                console.error('Error loading recent comments:', err);
                setError('Failed to load recent comments');
            }
        };

        loadRecentComments();
    }, []);

    const handleAction = async () => {
        if (!selectedUser || !actionReason) return;

        try {
            setLoading(true);
            const userRef = doc(db, 'users', selectedUser.id);
            const now = new Date();
            const moderationAction: ModerationAction = {
                id: Math.random().toString(36).substring(2),
                userId: selectedUser.id,
                adminId: 'current-admin-id', // Replace with actual admin ID
                type: actionType,
                reason: actionReason,
                timestamp: now.toISOString()
            };

            if (actionType === 'block') {
                const expirationDate = new Date(now.getTime() + blockDuration * 24 * 60 * 60 * 1000);
                moderationAction.duration = blockDuration;
                moderationAction.expiresAt = expirationDate.toISOString();

                await updateDoc(userRef, {
                    isBlocked: true,
                    blockExpiration: expirationDate.toISOString(),
                    moderationHistory: [...(selectedUser.moderationHistory || []), moderationAction]
                });
            } else if (actionType === 'role_change') {
                moderationAction.newRole = newRole;
                moderationAction.newPermissions = rolePermissions[newRole];

                await updateDoc(userRef, {
                    role: newRole,
                    permissions: rolePermissions[newRole],
                    moderationHistory: [...(selectedUser.moderationHistory || []), moderationAction]
                });
            } else if (actionType === 'permissions') {
                moderationAction.type = 'permission_change';
                moderationAction.newPermissions = selectedPermissions;

                await updateDoc(userRef, {
                    permissions: selectedPermissions,
                    moderationHistory: [...(selectedUser.moderationHistory || []), moderationAction]
                });
            }

            // Refresh user list
            setUsers(users.map(user => 
                user.id === selectedUser.id 
                    ? { 
                        ...user, 
                        isBlocked: actionType === 'block' ? true : user.isBlocked,
                        blockExpiration: actionType === 'block' ? moderationAction.expiresAt : user.blockExpiration,
                        role: actionType === 'role_change' ? newRole : user.role,
                        permissions: actionType === 'role_change' ? rolePermissions[newRole] : user.permissions,
                        moderationHistory: [...(user.moderationHistory || []), moderationAction]
                    } 
                    : user
            ));

            // Reset form
            setSelectedUser(null);
            setActionReason('');
            setBlockDuration(1);
            setNewRole('user');
        } catch (err) {
            console.error('Error performing action:', err);
            setError('Failed to perform action');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <SpinnerIcon className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
        };

    if (error) {
        return (
            <div className="text-red-600 text-center p-4">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Admin Dashboard
                </h1>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'analytics'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('series')}
                        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                            activeTab === 'series'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <span>Series</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('content-analytics')}
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'content-analytics'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        Content Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('user-engagement')}
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'user-engagement'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        User Engagement
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'users'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                            activeTab === 'reports'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <span>Reports</span>
                        {reportedContent.length > 0 && (
                            <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                                {reportedContent.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('auto-blog')}
                        className={`px-4 py-2 rounded-lg ${
                            activeTab === 'auto-blog'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <span>Auto Blog</span>
                    </button>
                </div>
            </div>

            {/* Analytics Dashboard */}
            {activeTab === 'analytics' && blogStats && (
                <div className="space-y-8">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Posts" value={blogStats.totalPosts} />
                        <StatCard title="Total Views" value={blogStats.totalViews.toLocaleString()} />
                        <StatCard title="Total Upvotes" value={blogStats.totalUpvotes.toLocaleString()} />
                        <StatCard title="Total Comments" value={blogStats.totalComments.toLocaleString()} />
                    </div>

                    {/* Top Posts and Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Most Viewed Posts</h3>
                            <div className="space-y-4">
                                {blogStats.mostViewedPosts.map(post => (
                                    <div key={post.id} className="flex justify-between items-center">
                                        <span className="text-slate-600 dark:text-slate-400 truncate">{post.title}</span>
                                        <span className="text-blue-600 dark:text-blue-400">{post.views.toLocaleString()} views</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Categories</h3>
                            <div className="space-y-4">
                                {blogStats.topCategories.map(cat => (
                                    <div key={cat.category} className="flex justify-between items-center">
                                        <span className="text-slate-600 dark:text-slate-400">{cat.category}</span>
                                        <span className="text-blue-600 dark:text-blue-400">{cat.count} posts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* User Stats */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">User Statistics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <StatCard title="Total Users" value={blogStats.userStats.totalUsers} />
                            <StatCard title="Active Users" value={blogStats.userStats.activeUsers} />
                            <StatCard title="Blocked Users" value={blogStats.userStats.blockedUsers} />
                        </div>
                    </div>

                    {/* Activity Timeline */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Activity Timeline</h3>
                        <Line options={chartOptions} data={chartData} />
                    </div>
                </div>
            )}

            {/* Reports Queue */}
            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                            Content Reports
                            {reportedContent.length > 0 && (
                                <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                    {reportedContent.length} pending
                                </span>
                            )}
                        </h2>
                        {reportedContent.length === 0 ? (
                            <p className="text-slate-600 dark:text-slate-400">No pending reports</p>
                        ) : (
                            <div className="space-y-4">
                                {reportedContent.map(report => (
                                    <ReportCard
                                        key={report.id}
                                        report={report}
                                        onReview={handleReportReview}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* User Management */}
            {activeTab === 'users' && (
                <div>
                    {/* User List */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 mb-8">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Users</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">History</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {users.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                                    user.role === 'moderator' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.isBlocked ? (
                                                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full">
                                                        Blocked until {new Date(user.blockExpiration!).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setShowModerationHistory(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                                                >
                                                    View History
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}

            {/* Action Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-lg w-full p-6">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                            Manage User: {selectedUser.name}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Action Type
                                </label>
                                <select
                                    value={actionType}
                                    onChange={(e) => setActionType(e.target.value as 'block' | 'role_change' | 'permissions')}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2"
                                >
                                    <option value="block">Block User</option>
                                    <option value="role_change">Change Role</option>
                                    <option value="permissions">Manage Post Permissions</option>
                                </select>
                            </div>

                            {actionType === 'block' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Block Duration (days)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={blockDuration}
                                        onChange={(e) => setBlockDuration(parseInt(e.target.value))}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2"
                                    />
                                </div>
                            )}

                            {actionType === 'role_change' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        New Role
                                    </label>
                                    <select
                                        value={newRole}
                                        onChange={(e) => {
                                            const role = e.target.value as UserRole;
                                            setNewRole(role);
                                            setSelectedPermissions(rolePermissions[role]);
                                        }}
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2"
                                    >
                                        <option value="user">User</option>
                                        <option value="contributor">Contributor</option>
                                        <option value="moderator">Moderator</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            )}
                            
                            {actionType === 'permissions' && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                        Post Permissions
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.canCreatePosts}
                                                onChange={(e) => setSelectedPermissions({
                                                    ...selectedPermissions,
                                                    canCreatePosts: e.target.checked
                                                })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Can Create Posts</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.canEditOwnPosts}
                                                onChange={(e) => setSelectedPermissions({
                                                    ...selectedPermissions,
                                                    canEditOwnPosts: e.target.checked
                                                })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Can Edit Own Posts</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.canDeleteOwnPosts}
                                                onChange={(e) => setSelectedPermissions({
                                                    ...selectedPermissions,
                                                    canDeleteOwnPosts: e.target.checked
                                                })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Can Delete Own Posts</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.canModerateComments}
                                                onChange={(e) => setSelectedPermissions({
                                                    ...selectedPermissions,
                                                    canModerateComments: e.target.checked
                                                })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Can Moderate Comments</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={selectedPermissions.canManageCategories}
                                                onChange={(e) => setSelectedPermissions({
                                                    ...selectedPermissions,
                                                    canManageCategories: e.target.checked
                                                })}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300">Can Manage Categories</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Reason
                                </label>
                                <textarea
                                    value={actionReason}
                                    onChange={(e) => setActionReason(e.target.value)}
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2"
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={!actionReason}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showModerationHistory && selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-3xl w-full p-6">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                            Moderation History for {selectedUser.name}
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {selectedUser.moderationHistory?.map(history => (
                                        <tr key={history.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{history.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{history.reason}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(history.timestamp).toLocaleDateString()}</td>
                                        </tr>
                                    )) || <tr><td colSpan={3} className="text-center p-4">No history available</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => setShowModerationHistory(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto Blog System */}
            {activeTab === 'auto-blog' && (
                <div className="space-y-6">
                    <AutoBlogPostSystem />
                </div>
            )}

            {/* Series Management */}
            {activeTab === 'series' && (
                <div className="space-y-6">
                    <SeriesManagement />
                </div>
            )}

            {/* Content Analytics */}
            {activeTab === 'content-analytics' && (
                <div className="space-y-6">
                    <ContentAnalytics />
                </div>
            )}

            {/* User Engagement */}
            {activeTab === 'user-engagement' && (
                <div className="space-y-6">
                    <UserEngagementManager />
                </div>
            )}

            {/* Maintenance Mode Section */}
            <div className="mb-6">
                <MaintenanceMode />
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                        Recent Activity
                    </h2>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Recent Posts</h3>
                        {recentPosts.length === 0 ? (
                            <p className="text-slate-600 dark:text-slate-400">No recent posts</p>
                        ) : (
                            <ul>
                                {recentPosts.map(post => (
                                    <li key={post.id} className="py-2 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-slate-700 dark:text-slate-300">{post.title}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="mt-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Recent Comments</h3>
                        {recentComments.length === 0 ? (
                            <p className="text-slate-600 dark:text-slate-400">No recent comments</p>
                        ) : (
                            <ul>
                                {recentComments.map(comment => (
                                    <li key={comment.id} className="py-2 border-b border-slate-200 dark:border-slate-700">
                                        <span className="text-slate-700 dark:text-slate-300">{comment.text}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
