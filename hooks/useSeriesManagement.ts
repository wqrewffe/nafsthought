import { useState, useCallback, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, Timestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Series, SeriesWithPosts } from '../types/series';
import { useAuth } from './useAuth';
import { slugify } from '../utils/formatPost';

const seriesCollection = collection(db, 'series');

export const useSeriesManagement = () => {
    const [series, setSeries] = useState<Series[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    const fetchAllSeries = useCallback(async () => {
        try {
            const q = query(seriesCollection, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const seriesList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Series));
            setSeries(seriesList);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const getSeriesBySlug = async (slug: string): Promise<Series | null> => {
        try {
            const q = query(seriesCollection, where('slug', '==', slug), limit(1));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) return null;
            
            return {
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data()
            } as Series;
        } catch (err) {
            console.error('Error getting series by slug:', err);
            return null;
        }
    };

    const createSeries = async (data: Partial<Series>) => {
        if (!user) throw new Error('Must be logged in to create a series');

        // Generate a unique slug
        let slug = slugify(data.title || '');
        let uniqueSlug = slug;
        let counter = 0;

        while (true) {
            const q = query(seriesCollection, where('slug', '==', uniqueSlug));
            const snapshot = await getDocs(q);
            if (snapshot.empty) break;
            counter++;
            uniqueSlug = `${slug}-${counter}`;
        }

        const newSeries = {
            ...data,
            authorId: user.uid,
            authorName: user.displayName || 'Anonymous',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            postIds: [],
            slug: uniqueSlug,
            totalPosts: 0,
            status: 'draft'
        };

        const docRef = await addDoc(seriesCollection, newSeries);
        return { id: docRef.id, ...newSeries };
    };

    const updateSeries = async (seriesId: string, updates: Partial<Series>) => {
        const seriesRef = doc(seriesCollection, seriesId);
        await updateDoc(seriesRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
    };

    const addPostToSeries = async (seriesId: string, postId: string, order: number) => {
        const seriesRef = doc(seriesCollection, seriesId);
        const seriesDoc = await getDoc(seriesRef);
        
        if (!seriesDoc.exists()) throw new Error('Series not found');
        
        const seriesData = seriesDoc.data() as Series;
        const updatedPostIds = [...seriesData.postIds];
        
        if (!updatedPostIds.includes(postId)) {
            updatedPostIds.push(postId);
            await updateDoc(seriesRef, {
                postIds: updatedPostIds,
                totalPosts: updatedPostIds.length,
                updatedAt: Timestamp.now()
            });
        }
    };

    const removePostFromSeries = async (seriesId: string, postId: string) => {
        const seriesRef = doc(seriesCollection, seriesId);
        const seriesDoc = await getDoc(seriesRef);
        
        if (!seriesDoc.exists()) throw new Error('Series not found');
        
        const seriesData = seriesDoc.data() as Series;
        const updatedPostIds = seriesData.postIds.filter(id => id !== postId);
        
        await updateDoc(seriesRef, {
            postIds: updatedPostIds,
            totalPosts: updatedPostIds.length,
            updatedAt: Timestamp.now()
        });
    };

    const getSeriesWithPosts = async (slugOrId: string): Promise<SeriesWithPosts | null> => {
        let seriesDoc;
        
        // First try to get by slug
        const q = query(seriesCollection, where('slug', '==', slugOrId), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            seriesDoc = snapshot.docs[0];
        } else {
            // If not found by slug, try by ID
            const seriesRef = doc(seriesCollection, slugOrId);
            seriesDoc = await getDoc(seriesRef);
            if (!seriesDoc.exists()) return null;
        }
        
        const seriesData = seriesDoc.data() as Series;
        const posts = await Promise.all(
            seriesData.postIds.map(async (postId, index) => {
                const postRef = doc(collection(db, 'posts'), postId);
                const postDoc = await getDoc(postRef);
                if (!postDoc.exists()) return null;
                const postData = postDoc.data();
                return {
                    id: postId,
                    title: postData.title,
                    slug: postData.slug,
                    order: index + 1
                };
            })
        );

        return {
            ...seriesData,
            id: seriesDoc.id,
            posts: posts.filter(post => post !== null)
        } as SeriesWithPosts;
    };

    useEffect(() => {
        fetchAllSeries();
    }, [fetchAllSeries]);

    return {
        series,
        loading,
        error,
        createSeries,
        updateSeries,
        addPostToSeries,
        removePostFromSeries,
        getSeriesWithPosts,
        refreshSeries: fetchAllSeries
    };
};
