import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
    return (
        <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-6xl md:text-9xl font-bold font-serif text-blue-600 dark:text-blue-400 mb-4">404</h1>
            <h2 className="text-2xl md:text-4xl font-semibold text-slate-800 dark:text-white mb-2">Page Not Found</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 mb-8">Oops! The page you're looking for doesn't exist.</p>
            <Link to="/" className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-colors">
                Go back to Home
            </Link>
        </div>
    );
};
