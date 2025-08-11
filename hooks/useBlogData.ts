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
import { getAuth } from 'firebase/auth';


const postsCollection = collection(db, 'posts');
const usersCollection = collection(db, 'users');
const categoriesCollection = collection(db, 'categories');


const slugify = (text: string) => {
    if (!text) return '';
    
    // Handle Bengali text differently
    const isBengali = /[\u0980-\u09FF]/.test(text);
    
    if (isBengali) {
        // For Bengali text, create a more URL-friendly version while preserving Bengali characters
        return text
            .toString()
            .trim()
            // Replace specific Bengali punctuation marks with spaces
            .replace(/[,।'"!@#$%^&*()।,.।'":।?]/g, ' ')
            // Replace multiple spaces with single hyphen
            .replace(/\s+/g, '-')
            // Remove consecutive hyphens
            .replace(/-+/g, '-')
            // Remove hyphens from start and end
            .replace(/^-+|-+$/g, '')
            .substring(0, 200);
    } else {
        // For Latin text, use standard slugify
        return text
            .toString()
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9-\s]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 200);
    }
};

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

const getCurrentUser = async () => {
    const auth = getAuth();
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    // Get the full user profile from Firestore
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) return null;

    return userDoc.data() as User;
};

export const api = {
    createPost: async (post: Partial<Post>) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to create a post');
        
        // Generate a unique slug from the title
        let uniqueSlug = slugify(post.title || '');
        
        // Check if the slug already exists
        let slugExists = true;
        let counter = 0;
        let finalSlug = uniqueSlug;
        
        while (slugExists) {
            const q = query(postsCollection, where('slug', '==', finalSlug), limit(1));
            const snapshot = await getDocs(q);
            slugExists = !snapshot.empty;
            if (slugExists) {
                counter++;
                finalSlug = `${uniqueSlug}-${counter}`;
            }
        }
        
        // Generate a random seed for unique cover image
        const randomSeed = Math.random().toString(36).substring(2, 8);
        const coverImage = `https://picsum.photos/seed/${randomSeed}/1200/600`;

        const postRef = await addDoc(postsCollection, {
            ...post,
            slug: finalSlug, // Add the unique slug
            authorId: user.uid,
            author: user.name,
            authorPhotoURL: user.photoURL,
            coverImage, // Add the cover image
            date: serverTimestamp(),
            views: 0,
            upvotes: 0,
            comments: [],
            reports: []
        });
        return postRef.id;
    },

    updatePost: async (postId: string, updates: Partial<Post>) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to update a post');
        
        // Get the post to check permissions
        const postRef = doc(postsCollection, postId);
        const postSnap = await getDoc(postRef);
        const post = postSnap.data();
        
        if (!post) throw new Error('Post not found');
        if (post.authorId !== user.uid) throw new Error('You can only edit your own posts');
        
        // If title is being updated, also update the slug
        if (updates.title && updates.title !== post.title) {
            let uniqueSlug = slugify(updates.title);
            
            // Check if the new slug already exists (except for this post)
            let slugExists = true;
            let counter = 0;
            let finalSlug = uniqueSlug;
            
            while (slugExists) {
                const q = query(postsCollection, 
                    where('slug', '==', finalSlug), 
                    where('id', '!=', postId),
                    limit(1)
                );
                const snapshot = await getDocs(q);
                slugExists = !snapshot.empty;
                if (slugExists) {
                    counter++;
                    finalSlug = `${uniqueSlug}-${counter}`;
                }
            }
            
            updates.slug = finalSlug;
        }
        
        await updateDoc(postRef, updates);
    },

    deletePost: async (postId: string) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to delete a post');
        
        // Get the post to check permissions
        const postRef = doc(postsCollection, postId);
        const postSnap = await getDoc(postRef);
        const post = postSnap.data();
        
        if (!post) throw new Error('Post not found');
        
        // Allow admins to delete any post, otherwise users can only delete their own posts
        if (user.role !== 'admin' && post.authorId !== user.uid) {
            throw new Error('You can only delete your own posts');
        }
        
        await deleteDoc(postRef);
    },

    getPosts: async () => {
        const q = query(postsCollection, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => formatPost(doc));
    },

    getCategories: async () => {
        const snapshot = await getDocs(categoriesCollection);
        return snapshot.docs.map(doc => doc.data() as Category);
    },

    seedInitialCategories: async () => {
        const batch = writeBatch(db);
        const initialCategories = ['General', 'Technology', 'Life', 'Travel'];
        
        for (const category of initialCategories) {
            const categoryRef = doc(categoriesCollection);
            batch.set(categoryRef, { name: category });
        }
        
        await batch.commit();
    },

    addPost: async (post: Partial<Post>) => {
        return api.createPost(post);
    },

    addComment: async (postId: string, comment: Partial<Comment>) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to comment');

        const postRef = doc(postsCollection, postId);
        await updateDoc(postRef, {
            comments: arrayUnion({
                id: Math.random().toString(36).substr(2, 9),
                ...comment,
                authorId: user.uid,
                author: user.name,
                authorPhotoURL: user.photoURL,
                timestamp: new Date().toISOString()
            })
        });
    },

    deleteComment: async (postId: string, commentId: string) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to delete a comment');

        const postRef = doc(postsCollection, postId);
        const post = await getDoc(postRef);
        const comments = (post.data()?.comments || []) as Comment[];
        
        const comment = comments.find(c => c.id === commentId);
        if (!comment) throw new Error('Comment not found');
        
        if (comment.authorId !== user.uid) throw new Error('You can only delete your own comments');
        
        await updateDoc(postRef, {
            comments: comments.filter(c => c.id !== commentId)
        });
    },

    reportPost: async (postId: string, reason: string) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to report a post');

        const postRef = doc(postsCollection, postId);
        await updateDoc(postRef, {
            reports: arrayUnion({
                userId: user.uid,
                reason,
                timestamp: new Date().toISOString()
            })
        });
    },

    dismissReport: async (postId: string, reportId: string) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to dismiss a report');

        const postRef = doc(postsCollection, postId);
        const post = await getDoc(postRef);
        const reports = (post.data()?.reports || []);
        
        await updateDoc(postRef, {
            reports: reports.filter((r: any) => r.id !== reportId)
        });
    },

    upvotePost: async (postId: string) => {
        const user = await getCurrentUser();
        if (!user) throw new Error('Must be logged in to upvote');

        const postRef = doc(postsCollection, postId);
        await updateDoc(postRef, {
            upvotes: increment(1)
        });
    },

    incrementViewCount: async (postId: string) => {
        const postRef = doc(postsCollection, postId);
        await updateDoc(postRef, {
            views: increment(1)
        });
    },

    getPostBySlug: async (slug: string) => {
        const q = query(postsCollection, where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return formatPost(snapshot.docs[0]);
    },

    getUserProfile: async (userId: string) => {
        const userRef = doc(usersCollection, userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) return null;
        return userDoc.data() as User;
    },

    getCurrentUser,
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
    
    const addPost = createAction(api.createPost);
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

    return { posts, loading, error, addPost, addComment, upvotePost, incrementViewCount, updatePost, deletePost, deleteComment, reportPost, dismissReport, refreshPosts };
};