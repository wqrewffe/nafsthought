import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { EyeIcon, EyeOffIcon, SpinnerIcon } from '../components/Icons';

export const SignupPage: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { signup, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);


    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
                <SpinnerIcon className="w-12 h-12 text-blue-600" />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }
        setError('');
        setIsSubmitting(true);
        try {
            await signup(name, email, password);
            // Store email in session storage for the login page
            sessionStorage.setItem('signupEmail', email);
            navigate('/login?status=verification-required');
        } catch (err: any) {
            if (err.message.includes('auth/email-already-in-use')) {
                setError('This email address is already in use.');
            } else {
                setError('Failed to create an account. Please try again.');
            }
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] animate-fade-in">
            <button id="sign-in-button" style={{ display: 'none' }}></button>
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create an account</h1>
                     <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Already have an account?{' '}
                        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                           Sign in
                        </Link>
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="sr-only">Full Name</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Full Name"
                        />
                    </div>
                     <div>
                        <label htmlFor="email" className="sr-only">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Email address"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="sr-only">Password</label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Password (6+ characters)"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 dark:text-slate-400"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-blue-400 dark:disabled:bg-blue-800"
                        >
                            {isSubmitting ? 'Creating account...' : 'Create Account'}
                        </button>
                    </div>
                </form>
                {success && (
                    <div className="mt-6 space-y-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <h2 className="text-lg font-medium text-green-800 dark:text-green-200">
                                Account Created Successfully
                            </h2>
                            <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                                Please check your email for verification instructions. You need to verify your email before you can log in.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};