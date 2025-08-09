import { useState, useCallback, useEffect } from 'react';
import { Post, Comment, User, UserStats, Category } from '../types';
import { db } from '../firebase'; // Removed storage import

// Firebase imports for v9+ (modular)
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp, 
    increment, 
    query, 
    orderBy, 
    Timestamp,
    DocumentSnapshot,
    where,
    limit,
    setDoc,
    arrayUnion,
    writeBatch
} from 'firebase/firestore';


const postsCollection = collection(db, 'posts');
const usersCollection = collection(db, 'users');
const categoriesCollection = collection(db, 'categories');


const slugify = (text: string) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -

// --- Firebase API ---
export const formatPost = (document: DocumentSnapshot): Post => {
    const data = document.data() as any;
    if (!data) {
        throw new Error(`No data found for document ${document.id}`);
    }

    // Ensure required fields exist
    const post: Post = {
        id: document.id,
        title: data.title || 'Untitled',
        content: data.content || '',
        slug: data.slug || document.id,
        date: data.date?.toDate?.()?.toISOString() || new Date().toISOString(),
        author: data.author || '',
        authorId: data.authorId || '',
        authorPhotoURL: data.authorPhotoURL || null,
        categories: Array.isArray(data.categories) ? data.categories : [],
        coverImage: data.coverImage || '',
        views: data.views || 0,
        upvotes: data.upvotes || 0,
        comments: [],
        reports: Array.isArray(data.reports) ? data.reports : []
    };

    // Sort comments by timestamp, newest first.
    if (Array.isArray(data.comments)) {
        post.comments = data.comments.map((c: any) => ({
            id: c.id || '',
            authorId: c.authorId || '',
            author: c.author || '',
            authorPhotoURL: c.authorPhotoURL || null,
            text: c.text || '',
            timestamp: c.timestamp || new Date().toISOString(),
            parentId: c.parentId || null
        })).sort((a: Comment, b: Comment) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return post;

    return {
        id: document.id,
        slug: data.slug || '',
        title: data.title || 'Untitled',
        content: data.content || '',
        author: data.author || 'Anonymous',
        authorId: data.authorId || '',
        authorPhotoURL: data.authorPhotoURL || null,
        date: data.date instanceof Timestamp ? data.date.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString(),
        upvotes: data.upvotes || 0,
        views: data.views || 0,
        comments: post.comments,
        coverImage: data.coverImage || `https://picsum.photos/seed/${document.id}/1200/600`,
        reports: data.reports || [],
        categories: Array.isArray(data.categories) ? data.categories.filter(Boolean) : [],
    };
};

const getDetailedErrorMessage = (err: any): string => {
    const errorMessage = String(err.message || err);
    // In a real app, you might not want to expose the projectId directly in the error.
    // This is for developer convenience during setup.
    const projectId = 'naf-s-thought'; // from firebaseConfig.ts

    if (errorMessage.includes('Could not reach Cloud Firestore backend')) {
        return `Connection Timeout: Could not reach the Firestore database. This usually points to a setup issue in your Firebase project, not a code bug.

Please carefully check these things for project "${projectId}":
1. In the Firebase Console, go to "Build" > "Firestore Database". Did you click the "Create database" button and select a region? The database must be created and active. This is the most common cause.
2. In your "Project Settings", confirm the \`projectId\` in your code matches exactly.
3. Ensure your internet connection is stable and not blocking Google services.`;
    } 
    if (errorMessage.includes('permission-denied')) {
        return "Permission Denied: Your Firestore security rules are blocking this request. For initial testing, ensure your rules allow access, for example: `allow read, write: if request.time < ...`";
    }
    if (errorMessage.includes('firestore is not available') || errorMessage.includes('Firebase config is missing')) {
        return "Firebase configuration error. Please ensure you have correctly copied the `firebaseConfig` object from your Firebase project settings into `firebaseConfig.ts`.";
    }
    return `An unexpected error occurred: ${errorMessage}`;
};

const calculateReadingStreak = async (userId: string): Promise<number> => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data() as User;
    
    if (!userData.preferences?.readingHistory?.length) {
        return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const readDates = userData.preferences.readingHistory
        .map(entry => new Date(entry.timestamp))
        .map(date => {
            date.setHours(0, 0, 0, 0);
            return date.getTime();
        })
        .sort()
        .reverse();

    if (readDates[0] < today.getTime()) {
        return 0; // No reading today
    }

    let streak = 1;
    let currentDate = today.getTime();

    for (let i = 1; i < readDates.length; i++) {
        const previousDay = new Date(currentDate);
        previousDay.setDate(previousDay.getDate() - 1);
        
        if (readDates.includes(previousDay.getTime())) {
            streak++;
            currentDate = previousDay.getTime();
        } else {
            break;
        }
    }

    return streak;
};

const calculateUserStats = async (userId: string): Promise<UserStats> => {
    // Get all posts by the user
    const userPostsQuery = query(postsCollection, where('authorId', '==', userId));
    const userPostsSnap = await getDocs(userPostsQuery);
    const posts = userPostsSnap.docs.map(doc => formatPost(doc));

    // Get current date for monthly calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate total stats
    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, post) => sum + post.views, 0);
    const totalUpvotes = posts.reduce((sum, post) => sum + post.upvotes, 0);
    const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);

    // Calculate monthly stats
    const postsThisMonth = posts.filter(post => new Date(post.date) >= startOfMonth).length;
    const viewsThisMonth = posts
        .filter(post => new Date(post.date) >= startOfMonth)
        .reduce((sum, post) => sum + post.views, 0);

    // Calculate category statistics
    const categoryCount = new Map<string, number>();
    posts.forEach(post => {
        post.categories.forEach(category => {
            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        });
    });

    const mostReadCategories = Array.from(categoryCount.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        totalPosts,
        totalViews,
        totalUpvotes,
        totalComments,
        postsThisMonth,
        viewsThisMonth,
        mostReadCategories,
        readingStreak: await calculateReadingStreak(userId),
        lastActive: new Date().toISOString()
    };
};

export const api = {
    recordPostView: async (userId: string, postId: string, categories: string[]) => {
        const userRef = doc(db, 'users', userId);
        const now = new Date();
        
        // Update reading history
        await updateDoc(userRef, {
            'preferences.readingHistory': arrayUnion({
                postId,
                timestamp: now.toISOString(),
                timeSpent: 0, // This would be updated later
                completed: false,
                categories
            }),
            'preferences.lastReadPosts': arrayUnion(postId),
            'stats.lastActive': now.toISOString()
        });

        // Update user's category scores
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data() as User;
        const categoryScores = userData.preferences?.categoryScores || {};
        
        categories.forEach(category => {
            categoryScores[category] = (categoryScores[category] || 0) + 1;
        });

        await updateDoc(userRef, {
            'preferences.categoryScores': categoryScores
        });

        // Recalculate stats
        const stats = await calculateUserStats(userId);
        await updateDoc(userRef, { stats });
    },

    getUserProfile: async (usernameOrId: string): Promise<User | null> => {
        try {
            // First try to find by username (which is the normalized name)
            const userQuery = query(
                usersCollection, 
                where('name', '==', usernameOrId.toLowerCase().replace(/-/g, ' ')),
                limit(1)
            );
            const userSnap = await getDocs(userQuery);
            
            let userData: User | null = null;
            let userId: string;

            if (!userSnap.empty) {
                userData = userSnap.docs[0].data() as User;
                userId = userSnap.docs[0].id;
            } else {
                // If not found by username, try to find by uid
                const userDoc = await getDoc(doc(db, 'users', usernameOrId));
                if (userDoc.exists()) {
                    userData = userDoc.data() as User;
                    userId = userDoc.id;
                }
            }

            if (!userData) {
                return null;
            }

            // Calculate fresh stats for the user
            const stats = await calculateUserStats(userId);

            // Update the user document with new stats
            await updateDoc(doc(db, 'users', userId), { stats });

            return {
                ...userData,
                uid: userId,
                stats: stats // Use the freshly calculated stats
            };
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw error;
        }
    },

    updateUserProfile: async (userId: string, userData: Partial<User>): Promise<void> => {
        const userDoc = doc(db, 'users', userId);
        await updateDoc(userDoc, {
            ...userData,
            lastUpdated: serverTimestamp()
        });
    },
    addPost: async (title: string, content: string, user: User, categories: string[] | undefined): Promise<Post> => {
        const safeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];
        
        // Ensure categories exist in the categories collection
        const batch = writeBatch(db);
        for (const category of safeCategories) {
            const slug = category.toLowerCase().replace(/\s+/g, '-');
            const categoryRef = doc(db, 'categories', slug);
            batch.set(categoryRef, { name: category }, { merge: true });
        }
        await batch.commit();

        const newPostData = {
            slug: slugify(title),
            title,
            content,
            author: user.name.trim() || 'Anonymous',
            authorId: user.uid,
            authorPhotoURL: user.photoURL || null,
            date: serverTimestamp(),
            upvotes: 0,
            views: 0,
            comments: [],
            reports: [],
            categories: safeCategories,
            coverImage: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/1200/600`
        };
        const docRef = await addDoc(postsCollection, newPostData);
        return {
            ...newPostData,
            id: docRef.id,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        } as Post;
    },
    checkConnection: async (): Promise<{success: boolean; error?: string}> => {
        try {
            const healthCheckDoc = doc(db, '_internal', 'healthcheck');
            await getDoc(healthCheckDoc);
            return { success: true };
        } catch (err: any) {
            const detailedError = getDetailedErrorMessage(err);
            return { success: false, error: detailedError };
        }
    },
    getPosts: async (): Promise<Post[]> => {
        const q = query(postsCollection, orderBy('date', 'desc'));
        const postSnapshot = await getDocs(q);
        return postSnapshot.docs.map(formatPost);
    },

    getPostBySlug: async (slug: string): Promise<Post | null> => {
        const q = query(postsCollection, where('slug', '==', slug), limit(1));
        const postSnapshot = await getDocs(q);
        if (postSnapshot.empty) return null;
        return formatPost(postSnapshot.docs[0]);
    },

    getPost: async (postId: string): Promise<Post | null> => {
        const docRef = doc(db, 'posts', postId);
        const postSnapshot = await getDoc(docRef);
        if (!postSnapshot.exists()) return null;
        return formatPost(postSnapshot);
    },

    updatePost: async (postId: string, title: string, content: string, categories: string[]): Promise<void> => {
        const safeCategories = categories.filter(Boolean);
        
        // Ensure categories exist in the categories collection
        const batch = writeBatch(db);
        for (const category of safeCategories) {
            const slug = category.toLowerCase().replace(/\s+/g, '-');
            const categoryRef = doc(db, 'categories', slug);
            batch.set(categoryRef, { name: category }, { merge: true });
        }
        await batch.commit();

        const postDoc = doc(db, 'posts', postId);
        await updateDoc(postDoc, { title, content, slug: slugify(title), categories: safeCategories });
    },
    
    deletePost: async (postId: string): Promise<void> => {
        const postDoc = doc(db, 'posts', postId);
        await deleteDoc(postDoc);
    },

    addComment: async (postId: string, user: User, text: string, parentId: string | null = null): Promise<Comment> => {
        if (user.isBlocked) {
            throw new Error('You are blocked and cannot post comments.');
        }

        const postDocRef = doc(db, 'posts', postId);
        const newComment: Comment = { 
            id: new Date().getTime().toString(),
            authorId: user.uid,
            author: user.name,
            authorPhotoURL: user.photoURL,
            text, 
            timestamp: new Date().toISOString(),
            parentId,
        };
        
        await updateDoc(postDocRef, {
            comments: arrayUnion(newComment)
        });
        return newComment;
    },
    
    deleteComment: async (postId: string, commentId: string): Promise<void> => {
        const postDocRef = doc(db, 'posts', postId);
        const postSnapshot = await getDoc(postDocRef);
        if (!postSnapshot.exists()) throw new Error("Post not found to delete comment from");
        
        const updatedComments = postSnapshot.data()?.comments.filter((c: any) => c.id !== commentId);
        await updateDoc(postDocRef, { comments: updatedComments });
    },
    
    upvotePost: async (postId: string): Promise<void> => {
        const postDoc = doc(db, 'posts', postId);
        await updateDoc(postDoc, { upvotes: increment(1) });
    },
    
    incrementViewCount: async (postId: string): Promise<void> => {
        const postDoc = doc(db, 'posts', postId);
        try {
            await updateDoc(postDoc, { views: increment(1) });
        } catch (e: any) {
            const errorMessage = getDetailedErrorMessage(e);
            console.warn(`Failed to increment view count. Reason: ${errorMessage}`);
        }
    },
    
    reportPost: async (postId: string, reporterId: string, reason: string): Promise<void> => {
        const postDocRef = doc(db, 'posts', postId);
        await updateDoc(postDocRef, {
            reports: arrayUnion({
                reporterId,
                reason,
                timestamp: new Date().toISOString()
            })
        });
    },
    
    dismissReport: async (postId: string): Promise<void> => {
        const postDocRef = doc(db, 'posts', postId);
        await updateDoc(postDocRef, { reports: [] });
    },

    getUsers: async (): Promise<User[]> => {
        const q = query(usersCollection, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));
    },

    toggleUserBlock: async (uid: string, isBlocked: boolean): Promise<void> => {
        const userDoc = doc(db, 'users', uid);
        await updateDoc(userDoc, { isBlocked: !isBlocked });
    },
    
    getCategories: async (): Promise<Category[]> => {
        const q = query(categoriesCollection, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, name: d.data().name } as Category));
    },

    addCategory: async (name: string): Promise<void> => {
        const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
        if (!name.trim()) throw new Error("Category name cannot be empty.");
        await setDoc(doc(db, 'categories', slug), { name: name.trim() });
    },
    
    seedInitialCategories: async (): Promise<void> => {
        const initialCategories = [
            'Technology', 'Programming', 'Lifestyle', 'Travel', 'Food',
            'Health & Fitness', 'Finance', 'Personal Development', 'Book Reviews', 'Entertainment'
        ];
        const batch = writeBatch(db);
        initialCategories.forEach(name => {
            const slug = name.toLowerCase().replace(/\s+/g, '-');
            const docRef = doc(db, 'categories', slug);
            batch.set(docRef, { name });
        });
        await batch.commit();
    },
};

export const useBlogData = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize categories if they don't exist
    useEffect(() => {
        const initCategories = async () => {
            try {
                const categories = await api.getCategories();
                if (categories.length === 0) {
                    await api.seedInitialCategories();
                }
            } catch (err) {
                console.warn('Failed to initialize categories:', err);
            }
        };
        initCategories();
    }, []);

    const refreshPosts = useCallback(async () => {
        try {
            setError(null);
            const data = await api.getPosts();
            setPosts(data);
        } catch (err: any) {
            const detailedError = getDetailedErrorMessage(err);
            console.error("Failed to refresh posts:", detailedError);
            setError(detailedError);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await refreshPosts();
            setLoading(false);
        };
        loadData();
    }, [refreshPosts]);

    const createAction = <T extends any[]>(action: (...args: T) => Promise<any>) =>
        useCallback(async (...args: T) => {
            try {
                setError(null);
                const result = await action(...args);
                await refreshPosts();
                return result;
            } catch (err: any) {
                const detailedError = getDetailedErrorMessage(err);
                console.error("Action failed:", detailedError);
                setError(detailedError);
                throw new Error(detailedError);
            }
        }, [refreshPosts]);
    
    const addPost = createAction(api.addPost);
    const updatePost = createAction(api.updatePost);
    const deletePost = createAction(api.deletePost);
    const addComment = createAction(api.addComment);
    const deleteComment = createAction(api.deleteComment);
    const reportPost = createAction(api.reportPost);
    const dismissReport = createAction(api.dismissReport);
    
    const upvotePost = useCallback(async (postId: string) => {
        setPosts(prevPosts => prevPosts.map(p => 
            p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p
        ));
        try {
            await api.upvotePost(postId);
        } catch (err: any) {
            const detailedError = getDetailedErrorMessage(err);
            console.error("Upvote failed:", detailedError);
            setError(detailedError);
            setPosts(prevPosts => prevPosts.map(p => 
                p.id === postId ? { ...p, upvotes: p.upvotes - 1 } : p
            ));
        }
    }, []);

    const incrementViewCount = useCallback(async (postId: string) => {
        setPosts(prevPosts => prevPosts.map(p => 
            p.id === postId ? { ...p, views: (p.views || 0) + 1 } : p
        ));
        await api.incrementViewCount(postId);
    }, []);

    return { posts, loading, error, addPost, addComment, upvotePost, incrementViewCount, updatePost, deletePost, deleteComment, reportPost, dismissReport };
};