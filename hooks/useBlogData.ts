import { useState, useCallback, useEffect } from 'react';
import { Post, Comment, User, Category } from '../types';
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
const formatPost = (document: DocumentSnapshot): Post => {
    const data = document.data() as any;
    // Sort comments by timestamp, newest first.
    const sortedComments = (data.comments || []).map((c: any) => ({
        ...c,
        timestamp: c.timestamp || new Date().toISOString()
    })).sort((a: Comment, b: Comment) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
        comments: sortedComments,
        coverImage: data.coverImage || `https://picsum.photos/seed/${document.id}/1200/600`,
        category: data.category || 'Uncategorized',
        reports: data.reports || [],
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

export const api = {
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
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        return formatPost(querySnapshot.docs[0]);
    },
    
    getUserProfile: async (uid: string): Promise<User | null> => {
        if (!uid) return null;
        const userDoc = await getDoc(doc(db, 'users', uid));
        return userDoc.exists() ? userDoc.data() as User : null;
    },

    addPost: async (title: string, content: string, user: User, category: string): Promise<Post> => {
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
            category,
            coverImage: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/1200/600`
        };
        const docRef = await addDoc(postsCollection, newPostData);
        return {
            ...newPostData,
            id: docRef.id,
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        } as Post;
    },
    
    updatePost: async (postId: string, title: string, content: string, category: string): Promise<void> => {
        const postDoc = doc(db, 'posts', postId);
        await updateDoc(postDoc, { title, content, slug: slugify(title), category });
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