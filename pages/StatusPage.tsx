import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { SpinnerIcon, CheckCircleIcon, ErrorCircleIcon } from '../components/Icons';

export const StatusPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<{ success: boolean; error?: string } | null>(null);

    useEffect(() => {
        const checkConnection = async () => {
            setLoading(true);
            const result = await api.checkConnection();
            setStatus(result);
            setLoading(false);
        };
        checkConnection();
    }, []);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center text-center">
                    <SpinnerIcon className="w-12 h-12 text-blue-600" />
                    <p className="mt-4 text-lg font-medium text-slate-700 dark:text-slate-300">Checking Firebase connection...</p>
                </div>
            );
        }

        if (status?.success) {
            return (
                <div className="w-full max-w-2xl p-8 bg-green-50 dark:bg-green-900/50 rounded-xl border border-green-200 dark:border-green-700/50 text-center">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
                    <h1 className="mt-4 text-3xl font-bold text-green-800 dark:text-green-200">Connection Successful</h1>
                    <p className="mt-2 text-base text-green-700 dark:text-green-300">
                        Your app is correctly configured and communicating with the Firestore database.
                    </p>
                </div>
            );
        }

        if (status && !status.success) {
            return (
                 <div className="w-full max-w-2xl p-8 bg-red-50 dark:bg-red-900/50 rounded-xl border border-red-200 dark:border-red-700/50">
                    <div className="text-center">
                         <ErrorCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
                        <h1 className="mt-4 text-3xl font-bold text-red-800 dark:text-red-200">Connection Failed</h1>
                    </div>
                    <div className="mt-6 bg-red-100 dark:bg-red-900/70 p-4 rounded-md text-left">
                         <strong className="font-bold block text-red-800 dark:text-red-200">Troubleshooting Steps:</strong>
                        <p className="whitespace-pre-wrap text-sm text-red-700 dark:text-red-300 font-mono mt-2">
                           {status.error}
                        </p>
                    </div>
                </div>
            );
        }

        return null;
    };


    return (
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-4">
            {renderContent()}
            {!loading && (
                 <Link to="/admin/dashboard" className="mt-8 inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-colors">
                    Back to Dashboard
                </Link>
            )}
        </div>
    );
};
