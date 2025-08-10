import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { Post } from '../types';
import { PostSeries } from '../types/series';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy
} from 'firebase/firestore';

const seriesCollection = collection(db, 'series');

export const usePostSeries = () => {
    const [series, setSeries] = useState<PostSeries[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSeries = async () => {
        try {
            const seriesQuery = query(seriesCollection, orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(seriesQuery);
            const seriesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PostSeries));
            setSeries(seriesData);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSeries();
    }, []);

    const calculateReadingTime = (posts: Post[]): number => {
        const wordsPerMinute = 200;
        const totalWords = posts.reduce((acc, post) => {
            const wordCount = post.content.trim().split(/\s+/).length;
            return acc + wordCount;
        }, 0);
        return Math.ceil(totalWords / wordsPerMinute);
    };

    const createSeries = async (data: Omit<PostSeries, 'id' | 'createdAt' | 'updatedAt' | 'totalPosts' | 'estimatedReadingTime'>) => {
        try {
            const seriesData = {
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                totalPosts: data.posts.length,
                estimatedReadingTime: 0 // Will be updated when posts are added
            };
            const docRef = await addDoc(seriesCollection, seriesData);
            return { id: docRef.id, ...seriesData };
        } catch (err: any) {
            throw new Error(`Failed to create series: ${err.message}`);
        }
    };

    const addPostToSeries = async (seriesId: string, postId: string, order: number) => {
        const seriesRef = doc(seriesCollection, seriesId);
        const seriesDoc = await getDoc(seriesRef);
        
        if (!seriesDoc.exists()) {
            throw new Error('Series not found');
        }

        const series = seriesDoc.data() as PostSeries;
        const newPosts = [...series.posts, { postId, order }]
            .sort((a, b) => a.order - b.order);

        await updateDoc(seriesRef, {
            posts: newPosts,
            totalPosts: newPosts.length,
            updatedAt: new Date().toISOString()
        });

        await loadSeries(); // Reload the series data
    };

    const removePostFromSeries = async (seriesId: string, postId: string) => {
        const seriesRef = doc(seriesCollection, seriesId);
        const seriesDoc = await getDoc(seriesRef);
        
        if (!seriesDoc.exists()) {
            throw new Error('Series not found');
        }

        const series = seriesDoc.data() as PostSeries;
        const newPosts = series.posts.filter(post => post.postId !== postId);

        await updateDoc(seriesRef, {
            posts: newPosts,
            totalPosts: newPosts.length,
            updatedAt: new Date().toISOString()
        });

        await loadSeries(); // Reload the series data
    };

    return {
        series,
        loading,
        error,
        createSeries,
        addPostToSeries,
        removePostFromSeries
    };
};
