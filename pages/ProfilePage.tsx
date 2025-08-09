import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { AuthorAvatar } from '../components/AuthorAvatar';
import { SpinnerIcon, CheckCircleIcon } from '../components/Icons';

export const ProfilePage: React.FC = () => {
    const { user, updateUserProfile } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!user) {
        return <div className="text-center p-8">Please log in to view your profile.</div>;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (name.trim() === user.name) {
            setError('You have not made any changes.');
            return;
        }

        setLoading(true);

        try {
            await updateUserProfile(user.uid, { name: name.trim() });
            setSuccess('Profile updated successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <header className="text-center mb-10">
                <h1 className="text-4xl font-bold font-serif text-slate-900 dark:text-white">My Profile</h1>
                <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">Update your display name.</p>
            </header>
            
            <div className="bg-white dark:bg-slate-800/50 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center space-y-4">
                        <AuthorAvatar name={name} photoURL={null} className="w-32 h-32 text-5xl" />
                    </div>

                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Display Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Your display name"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                         <p className="mt-1 text-xs text-slate-500">Email address cannot be changed.</p>
                    </div>
                    
                    {error && (
                      <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                      </div>
                    )}

                    {success && (
                      <div className="bg-green-100 dark:bg-green-900/50 border-l-4 border-green-500 text-green-700 dark:text-green-300 p-4 rounded-md" role="alert">
                        <div className="flex">
                            <div className="py-1">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                            </div>
                            <div>
                                <p className="font-bold">Success</p>
                                <p>{success}</p>
                            </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center space-x-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors disabled:bg-blue-400"
                            disabled={loading || (name.trim() === user.name)}
                        >
                            {loading ? <SpinnerIcon className="w-5 h-5" /> : null}
                            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
