import React, { useState, useEffect } from 'react';
import { useSeriesManagement } from '../hooks/useSeriesManagement';
import { Series } from '../types/series';
import { SeriesCard } from './SeriesCard';
import { Post } from '../types';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';

export const SeriesManagement: React.FC = () => {
    const { series, loading, error, createSeries, updateSeries, addPostToSeries, removePostFromSeries } = useSeriesManagement();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
    const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
    const [availablePosts, setAvailablePosts] = useState<Post[]>([]);
    const [editingSeries, setEditingSeries] = useState({
        title: '',
        description: '',
        coverImage: ''
    });
    const [newSeries, setNewSeries] = useState({
        title: '',
        description: '',
        coverImage: ''
    });

    useEffect(() => {
        const loadPosts = async () => {
            try {
                const postsSnapshot = await getDocs(collection(db, 'posts'));
                const posts = postsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Post));
                setAvailablePosts(posts);
            } catch (err) {
                console.error('Error loading posts:', err);
            }
        };
        loadPosts();
    }, []);

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createSeries(newSeries);
            setIsCreateModalOpen(false);
            setNewSeries({ title: '', description: '', coverImage: '' });
        } catch (err: any) {
            console.error('Error creating series:', err);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSeries) return;
        
        try {
            await updateSeries(selectedSeries.id, editingSeries);
            setIsEditModalOpen(false);
            setSelectedSeries(null);
        } catch (err: any) {
            console.error('Error updating series:', err);
        }
    };

    const handleEditClick = (series: Series) => {
        setSelectedSeries(series);
        setEditingSeries({
            title: series.title,
            description: series.description,
            coverImage: series.coverImage || ''
        });
        setIsEditModalOpen(true);
    };

    const handleAddPostClick = (series: Series) => {
        setSelectedSeries(series);
        setIsAddPostModalOpen(true);
    };

    const handleAddPost = async (postId: string) => {
        if (!selectedSeries) return;
        try {
            await addPostToSeries(selectedSeries.id, postId, selectedSeries.postIds.length);
            setIsAddPostModalOpen(false);
        } catch (err) {
            console.error('Error adding post to series:', err);
        }
    };

    const handleRemovePost = async (postId: string) => {
        if (!selectedSeries) return;
        try {
            await removePostFromSeries(selectedSeries.id, postId);
        } catch (err) {
            console.error('Error removing post from series:', err);
        }
    };

    if (loading) return <div>Loading series...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Series Management
                </h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Create New Series
                </button>
            </div>

            {/* Series Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {series.map(s => (
                    <div key={s.id} className="relative">
                        <SeriesCard series={s} />
                        <div className="absolute top-2 right-2 flex space-x-2">
                            <button
                                onClick={() => handleEditClick(s)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                title="Edit Series"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleAddPostClick(s)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                title="Add Posts"
                            >
                                Add Posts
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Series Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Create New Series
                        </h3>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={newSeries.title}
                                    onChange={e => setNewSeries({ ...newSeries, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newSeries.description}
                                    onChange={e => setNewSeries({ ...newSeries, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                                    rows={3}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Cover Image URL (optional)
                                </label>
                                <input
                                    type="url"
                                    value={newSeries.coverImage}
                                    onChange={e => setNewSeries({ ...newSeries, coverImage: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Create Series
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Series Modal */}
            {isEditModalOpen && selectedSeries && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Edit Series
                        </h3>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editingSeries.title}
                                    onChange={e => setEditingSeries({ ...editingSeries, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={editingSeries.description}
                                    onChange={e => setEditingSeries({ ...editingSeries, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                                    rows={3}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Cover Image URL (optional)
                                </label>
                                <input
                                    type="url"
                                    value={editingSeries.coverImage}
                                    onChange={e => setEditingSeries({ ...editingSeries, coverImage: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg"
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Posts Modal */}
            {isAddPostModalOpen && selectedSeries && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-4xl">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                            Add Posts to {selectedSeries.title}
                        </h3>
                        <div className="max-h-96 overflow-y-auto">
                            <div className="grid gap-4">
                                {availablePosts.map(post => (
                                    <div key={post.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-slate-900 dark:text-white">{post.title}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">By {post.author}</p>
                                        </div>
                                        {selectedSeries.postIds.includes(post.id) ? (
                                            <button
                                                onClick={() => handleRemovePost(post.id)}
                                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                            >
                                                Remove
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleAddPost(post.id)}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                            >
                                                Add to Series
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setIsAddPostModalOpen(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
