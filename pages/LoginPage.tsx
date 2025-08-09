import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { GoogleIcon, EyeIcon, EyeOffIcon, SpinnerIcon } from '../components/Icons';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login, loginWithGoogle, resetPassword, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);
    const [resetMessage, setResetMessage] = useState('');

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

    const handleGoogleLogin = async () => {
        setError('');
        setIsSubmitting(true);
        try {
            const loggedInUser = await loginWithGoogle();
            navigate(loggedInUser.role === 'admin' ? '/admin/dashboard' : '/');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google.');
        } finally {
            setIsSubmitting(false);
        }
    }

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResetMessage('');
        setIsSubmitting(true);
        try {
            await resetPassword(email);
            setResetMessage('Password reset link sent! Check your inbox.');
        } catch (err: any) {
             if (err.message.includes('auth/invalid-email')) {
                setError('Please enter a valid email address.');
            } else {
                 setError('Failed to send reset email. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const loggedInUser = await login(email, password);
            navigate(loggedInUser.role === 'admin' ? '/admin/dashboard' : '/');
        } catch (err: any) {
            if (err.message.includes('auth/invalid-credential')) {
                setError('Invalid email or password. Please try again.');
            } else {
                 setError(err.message);
            }
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isResetMode) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] animate-fade-in">
                <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Reset Password</h1>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Enter your email to receive a reset link.
                        </p>
                    </div>
                    <form onSubmit={handlePasswordReset} className="space-y-6">
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
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        {resetMessage && <p className="text-green-500 text-sm text-center">{resetMessage}</p>}
                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-blue-400 dark:disabled:bg-blue-800"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                            </button>
                        </div>
                         <div className="text-sm text-center">
                            <button onClick={() => setIsResetMode(false)} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                                Back to login
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] animate-fade-in">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Login to your account</h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        Or{' '}
                        <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                            create a new account
                        </Link>
                    </p>
                </div>
                 <div>
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isSubmitting}
                        className="w-full inline-flex items-center justify-center py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
                    >
                        <GoogleIcon className="w-5 h-5 mr-3" />
                        Sign in with Google
                    </button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-300 dark:border-slate-600" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Or continue with</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Password"
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
                     <div className="flex items-center justify-end">
                        <div className="text-sm">
                            <button onClick={() => { setIsResetMode(true); setResetMessage(''); setError(''); }} className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                                Forgot your password?
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
                            {isSubmitting ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};