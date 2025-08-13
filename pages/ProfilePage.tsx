import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Hooks
import { useAuth } from '../hooks/useAuth';
import { useUserPreferences } from '../hooks/useUserPreferences';

// Types
import { User, UserStats, UserAchievement, UserBookmark } from '../types';

// Components
import { PostGrid } from '../components/PostGrid';
import { AuthorAvatar } from '../components/AuthorAvatar';
import { 
    HeartIcon, EyeIcon, CommentIcon, PlusIcon, SpinnerIcon,
    EditIcon, BookmarkIcon, ChartIcon, AchievementIcon, SettingsIcon,
    TwitterIcon, GitHubIcon, LinkedInIcon, GlobeIcon, CheckCircleIcon 
} from '../components/Icons';


// Helper Components
const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            </div>
        </div>
    </div>
);

const AchievementCard: React.FC<{ achievement: UserAchievement }> = ({ achievement }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
        <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${achievement.unlockedAt ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-100 dark:bg-slate-700'}`}>
                <AchievementIcon className="w-6 h-6" />
            </div>
            <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{achievement.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{achievement.description}</p>
                {achievement.unlockedAt && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                )}
            </div>
        </div>
    </div>
);

const BookmarkCard: React.FC<{ bookmark: UserBookmark }> = ({ bookmark }) => (
    <Link to={`/post/${bookmark.postId}`} className="block hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm flex justify-between items-start">
            <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{bookmark.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Saved on {new Date(bookmark.savedAt).toLocaleDateString()}
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
            <BookmarkIcon className="w-5 h-5 text-blue-600" />
        </div>
    </Link>
);


const ReadingChart: React.FC<{ data: { date: string; count: number }[] }> = ({ data }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Reading Activity</h3>
        <div className="h-48 flex items-end space-x-1">
            {data.map((day, idx) => (
                <div
                    key={idx}
                    className="flex-1 bg-blue-500 dark:bg-blue-600 rounded-t hover:bg-blue-600 dark:hover:bg-blue-500 transition-colors"
                    style={{ height: `${(day.count / Math.max(1, ...data.map(d => d.count))) * 100}%` }}
                    title={`${day.date}: ${day.count} articles`}
                />
            ))}
        </div>
    </div>
);

// FollowersList Component
const FollowersList: React.FC<{ userIds: string[] }> = ({ userIds }) => {
    const [users, setUsers] = useState<Array<{ id: string; name: string; photoURL: string | null }>>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            if (userIds.length === 0) {
                setUsers([]);
                setLoading(false);
                return;
            }

            try {
                const usersData = await Promise.all(
                    userIds.map(async (userId) => {
                        const userDoc = await getDoc(doc(db, 'users', userId));
                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            return {
                                id: userId,
                                name: userData.name,
                                photoURL: userData.photoURL
                            };
                        }
                        return null;
                    })
                );

                setUsers(usersData.filter((user): user is { id: string; name: string; photoURL: string | null } => user !== null));
            } catch (err) {
                console.error('Error fetching users:', err);
                setError('Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [userIds]);

    if (loading) {
        return <div className="col-span-2 text-center p-8">
            <SpinnerIcon className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        </div>;
    }

    if (error) {
        return <div className="col-span-2 text-center p-8 text-red-600 dark:text-red-400">{error}</div>;
    }

    if (users.length === 0) {
        return <div className="md:col-span-2 text-center p-8 text-slate-600 dark:text-slate-400">No users found.</div>;
    }

    return <>
        {users.map(user => (
            <Link 
                to={`/profile/${user.name.toLowerCase().replace(/\s+/g, '-')}`}
                key={user.id} 
                className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm flex items-center space-x-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <AuthorAvatar name={user.name} photoURL={user.photoURL} className="w-12 h-12" />
                <div>
                    <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">View Profile</p>
                </div>
            </Link>
        ))}
    </>;
};

const ShareButton: React.FC<{ username: string; onShare: () => void }> = ({ username, onShare }) => {
    const handleShare = () => {
        // Using the correct URL format with hash routing
        const url = `${window.location.origin}/#/profile/${username}`;
        navigator.clipboard.writeText(url);
        onShare();
    };

    return (
        <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Share profile"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
        </button>
    );
};

// Main Component
export const ProfilePage: React.FC = () => {
    const { user, loading: authLoading, updateUserProfile } = useAuth();
    const { username } = useParams<{ username: string }>();
    
    const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'bookmarks' | 'achievements' | 'settings' | 'followers' | 'following'>('overview');
    const [loading, setLoading] = useState(true);
    const [profileDataLoading, setProfileDataLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [isEditing, setIsEditing] = useState(false);
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [profileUserId, setProfileUserId] = useState<string>('');
    const [isFollowing, setIsFollowing] = useState(false);
    
    const isOwner = user?.uid === profileUserId || user?.role === 'admin';

    // Fetch profile user data
    useEffect(() => {
        const loadUserData = async () => {
            if (!username || authLoading) return;

            setLoading(true);
            setError('');
            try {
                console.log('Looking for user:', username); // Debug log

                // If profile is the current user's, use the context data directly
                const normalizedInputUsername = username.toLowerCase().replace(/\s+/g, '-');
                
                if (user) {
                    const normalizedUserName = user.name.toLowerCase().replace(/\s+/g, '-');
                    if (normalizedUserName === normalizedInputUsername) {
                        console.log('Found current user match');
                        setEditedUser(user);
                        setProfileUserId(user.uid);
                        return;
                    }
                }

                // Otherwise, query Firestore for the user by username
                const usersRef = collection(db, 'users');
                
                // Try exact match first
                let usersQuery = query(usersRef, where('name', '==', username));
                let userSnap = await getDocs(usersQuery);

                // If no exact match, try normalized name
                if (userSnap.empty) {
                    console.log('No exact match, trying normalized search');
                    const usersSnapshot = await getDocs(usersRef);
                    const matchingDoc = usersSnapshot.docs.find(doc => {
                        const userData = doc.data();
                        const normalizedName = userData.name.toLowerCase().replace(/\s+/g, '-');
                        return normalizedName === normalizedInputUsername;
                    });
                    
                    if (matchingDoc) {
                        userSnap = {
                            empty: false,
                            docs: [matchingDoc]
                        } as any;
                    }
                }

                if (!userSnap.empty) {
                    const userDoc = userSnap.docs[0];
                    const userData = userDoc.data() as User;
                    userData.uid = userDoc.id;
                    setEditedUser(userData);
                    setProfileUserId(userDoc.id);
                } else {
                    setError('User not found');
                }
            } catch (err: any) {
                console.error('Failed to load user data:', err);
                setError('Failed to load user data');
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [username, user, authLoading]);

    // Check if the current user is following the profile user
    useEffect(() => {
        if (user && editedUser && user.uid !== editedUser.uid) {
            setIsFollowing(editedUser.followers?.includes(user.uid) || false);
        }
    }, [user, editedUser]);
    
    // Reset tab if a restricted tab is selected on another user's profile
    useEffect(() => {
        if (!isOwner && (activeTab === 'bookmarks' || activeTab === 'settings')) {
            setActiveTab('overview');
        }
    }, [isOwner, activeTab]);

    const handleFollow = async () => {
        if (!user || !editedUser) return;
        setProfileDataLoading(true);
        try {
            const userDocRef = doc(db, 'users', editedUser.uid);
            const currentUserDocRef = doc(db, 'users', user.uid);

            // Update profile user's followers
            const updatedFollowers = [...(editedUser.followers || []), user.uid];
            await updateDoc(userDocRef, { 
                followers: updatedFollowers 
            });
            
            // Update current user's following list
            const updatedFollowing = [...(user.following || []), editedUser.uid];
            await updateDoc(currentUserDocRef, { 
                following: updatedFollowing 
            });

            setEditedUser(prev => prev ? { ...prev, followers: updatedFollowers } : null);
            // Update local user state
            if (user) {
                user.following = updatedFollowing;
            }
            setIsFollowing(true);
        } catch (error) {
            console.error('Failed to follow user:', error);
            setError('Failed to follow user');
        } finally {
            setProfileDataLoading(false);
        }
    };

    const handleUnfollow = async () => {
        if (!user || !editedUser) return;
        setProfileDataLoading(true);
        try {
            const userDocRef = doc(db, 'users', editedUser.uid);
            const currentUserDocRef = doc(db, 'users', user.uid);

            // Update profile user's followers
            const updatedFollowers = (editedUser.followers || []).filter(uid => uid !== user.uid);
            await updateDoc(userDocRef, {
                followers: updatedFollowers
            });

            // Update current user's following list
            const updatedFollowing = (user.following || []).filter(uid => uid !== editedUser.uid);
            await updateDoc(currentUserDocRef, {
                following: updatedFollowing
            });

            setEditedUser(prev => prev ? { ...prev, followers: updatedFollowers } : null);
            // Update local user state
            if (user) {
                user.following = updatedFollowing;
            }
            setIsFollowing(false);
        } catch (error) {
            console.error('Failed to unfollow user:', error);
            setError('Failed to unfollow user');
        } finally {
            setProfileDataLoading(false);
        }
    };
    
    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !editedUser) return;

        setProfileDataLoading(true);
        setError('');
        setSuccess('');
        try {
            await updateUserProfile(user.uid, {
                name: editedUser.name,
                bio: editedUser.bio,
                socialLinks: editedUser.socialLinks,
            });
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update profile');
        } finally {
            setProfileDataLoading(false);
            setIsEditing(false);
        }
    };
    
    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <SpinnerIcon className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen text-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{error}</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Sorry, we couldn't find or load the user you're looking for.
                    </p>
                    <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        Return Home
                    </Link>
                </div>
            </div>
        );
    }

    if (!editedUser) {
        return null; // Should be handled by loading/error states
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Profile Header */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 shadow-sm mb-8">
                <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                    <AuthorAvatar 
                        name={editedUser.name} 
                        photoURL={editedUser.photoURL} 
                        className="w-24 h-24 text-3xl flex-shrink-0"
                    />
                    <div className="flex-grow">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                                {editedUser.name}
                            </h1>
                            {editedUser.role === 'admin' && (
                                <span className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                                    Admin
                                </span>
                            )}
                            <ShareButton 
                                username={username} 
                                onShare={() => {
                                    setSuccess('Profile link copied to clipboard!');
                                    setTimeout(() => setSuccess(''), 3000);
                                }} 
                            />
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-2">{editedUser.bio || 'No bio yet.'}</p>
                        <div className="flex items-center space-x-6 mt-4">
                            <button onClick={() => setActiveTab('followers')} className="text-sm text-blue-600 hover:underline">{editedUser.followers?.length || 0} Followers</button>
                            <button onClick={() => setActiveTab('following')} className="text-sm text-blue-600 hover:underline">{editedUser.following?.length || 0} Following</button>
                        </div>
                        <div className="flex items-center space-x-4 mt-4">
                            {editedUser.socialLinks?.twitter && <a href={editedUser.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-blue-500"><TwitterIcon className="w-5 h-5" /></a>}
                            {editedUser.socialLinks?.github && <a href={editedUser.socialLinks.github} target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><GitHubIcon className="w-5 h-5" /></a>}
                            {editedUser.socialLinks?.linkedin && <a href={editedUser.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-blue-700"><LinkedInIcon className="w-5 h-5" /></a>}
                            {editedUser.socialLinks?.website && <a href={editedUser.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-green-600"><GlobeIcon className="w-5 h-5" /></a>}
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {isOwner ? (
                            <button onClick={() => setActiveTab('settings')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                                <EditIcon className="w-4 h-4" />
                                <span>Edit Profile</span>
                            </button>
                        ) : user && (
                            isFollowing ? (
                                <button onClick={handleUnfollow} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors" disabled={profileDataLoading}>
                                    {profileDataLoading ? 'Unfollowing...' : 'Unfollow'}
                                </button>
                            ) : (
                                <button onClick={handleFollow} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors" disabled={profileDataLoading}>
                                    {profileDataLoading ? 'Following...' : 'Follow'}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
                <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Overview</button>
                <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'posts' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Posts</button>
                <button onClick={() => setActiveTab('followers')} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'followers' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Followers</button>
                <button onClick={() => setActiveTab('following')} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'following' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Following</button>
                {isOwner && <button onClick={() => setActiveTab('bookmarks')} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'bookmarks' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Bookmarks</button>}
                <button onClick={() => setActiveTab('achievements')} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'achievements' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Achievements</button>
                {isOwner && <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>Settings</button>}
            </div>

            {/* Tab Content */}
            <div className="space-y-8">
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard title="Total Posts" value={editedUser.stats?.totalPosts || 0} icon={<PlusIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />} />
                            <StatCard title="Total Views" value={editedUser.stats?.totalViews || 0} icon={<EyeIcon className="w-6 h-6 text-green-600 dark:text-green-400" />} />
                            <StatCard title="Total Upvotes" value={editedUser.stats?.totalUpvotes || 0} icon={<HeartIcon className="w-6 h-6 text-red-600 dark:text-red-400" />} />
                            <StatCard title="Reading Streak" value={`${editedUser.stats?.readingStreak || 0} days`} icon={<ChartIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />} />
                        </div>
                        {editedUser.stats?.readingActivity && <ReadingChart data={editedUser.stats.readingActivity} />}
                        {editedUser.stats?.mostReadCategories && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Categories</h3>
                                <div className="space-y-4">
                                    {editedUser.stats.mostReadCategories.map((cat, idx) => (
                                        <div key={idx} className="flex items-center">
                                            <div className="flex-grow">
                                                <div className="text-sm font-medium text-slate-900 dark:text-white">{cat.category}</div>
                                                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full mt-1">
                                                    <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${(cat.count / Math.max(1, editedUser.stats.mostReadCategories[0].count)) * 100}%` }} />
                                                </div>
                                            </div>
                                            <span className="ml-4 text-sm text-slate-600 dark:text-slate-400">{cat.count} posts</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'posts' && profileUserId && (
                    <PostGrid authorId={profileUserId} />
                )}

                {activeTab === 'bookmarks' && isOwner && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bookmarks</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            {editedUser.bookmarks?.length > 0 ? (
                                editedUser.bookmarks.map(bookmark => <BookmarkCard key={bookmark.postId} bookmark={bookmark} />)
                            ) : (
                                <div className="col-span-1 md:col-span-2 text-center p-8 text-slate-600 dark:text-slate-400">No saved posts yet.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'followers' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Followers</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <FollowersList userIds={editedUser.followers || []} />
                        </div>
                    </div>
                )}

                {activeTab === 'following' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Following</h2>
                        <div className="grid gap-4 md:grid-cols-2">
                            <FollowersList userIds={editedUser.following || []} />
                        </div>
                    </div>
                )}

                {activeTab === 'achievements' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Achievements</h2>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {editedUser.achievements?.length > 0 ? (
                                editedUser.achievements.map(achievement => <AchievementCard key={achievement.id} achievement={achievement} />)
                            ) : (
                                <div className="col-span-1 md:col-span-3 text-center p-8 text-slate-600 dark:text-slate-400">No achievements earned yet.</div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && isOwner && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Profile Settings</h2>
                        <form onSubmit={handleSettingsSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Display Name</label>
                                <input type="text" value={editedUser.name || ''} onChange={(e) => setEditedUser(prev => ({ ...prev!, name: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Bio</label>
                                <textarea value={editedUser.bio || ''} onChange={(e) => setEditedUser(prev => ({ ...prev!, bio: e.target.value }))} rows={4} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Twitter URL</label>
                                    <input type="text" value={editedUser.socialLinks?.twitter || ''} onChange={(e) => setEditedUser(prev => ({ ...prev!, socialLinks: { ...prev!.socialLinks, twitter: e.target.value }}))} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">GitHub URL</label>
                                    <input type="text" value={editedUser.socialLinks?.github || ''} onChange={(e) => setEditedUser(prev => ({ ...prev!, socialLinks: { ...prev!.socialLinks, github: e.target.value }}))} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"/>
                                </div>
                            </div>
                            {error && <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md" role="alert"><p>{error}</p></div>}
                            {success && <div className="bg-green-100 dark:bg-green-900/50 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 rounded-md" role="alert"><p>{success}</p></div>}
                            <div className="pt-4">
                                <button type="submit" className="w-full flex items-center justify-center space-x-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400" disabled={profileDataLoading}>
                                    {profileDataLoading && <SpinnerIcon className="w-5 h-5 animate-spin" />}
                                    <span>{profileDataLoading ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};