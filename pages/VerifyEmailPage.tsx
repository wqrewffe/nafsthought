import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { SpinnerIcon } from '../components/Icons';
import { auth } from '../firebase';
import { sendEmailVerification } from 'firebase/auth';

export const VerifyEmailPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, resendVerificationEmail } = useAuth();
    const [verificationSent, setVerificationSent] = useState(false);
    const [error, setError] = useState<string>('');
    const [countdown, setCountdown] = useState(0);
    const [isResendDisabled, setIsResendDisabled] = useState(false);
    const [password, setPassword] = useState('');
    const [email] = useState(() => sessionStorage.getItem('signupEmail') || '');

    useEffect(() => {
        // Check verification status when component mounts
        const checkVerification = async () => {
            try {
                if (auth.currentUser) {
                    await auth.currentUser.reload();
                    if (auth.currentUser.emailVerified) {
                        navigate('/login');
                    }
                }
            } catch (error) {
                setError('Failed to check verification status');
            }
        };

        const interval = setInterval(checkVerification, 3000);
        return () => clearInterval(interval);
    }, [navigate]);

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setIsResendDisabled(false);
        }
    }, [countdown]);

    const handleResendVerification = async () => {
        try {
            if (!email || !password) {
                setError('Please enter your password to resend the verification email.');
                return;
            }
            
            if (!isResendDisabled) {
                await resendVerificationEmail(email, password);
                setVerificationSent(true);
                setError('');
                setCountdown(60);
                setIsResendDisabled(true);
                setPassword('');
            }
        } catch (error: any) {
            setError(error.message || 'Failed to resend verification email. Please try again later.');
        }
    };

    if (!email) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700/50">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        Verify Your Email
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        We've sent a verification email to{' '}
                        <span className="font-medium text-slate-900 dark:text-white">
                            {email}
                        </span>
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Please check your email and click the verification link to continue.
                        You'll be redirected to login once your email is verified.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Enter your password to resend verification
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Password"
                            />
                        </div>
                    </div>
                    
                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                    
                    {verificationSent && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-sm text-green-700 dark:text-green-300">
                                Verification email sent successfully! Please check your inbox.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col items-center space-y-4">
                        <SpinnerIcon className="w-6 h-6 text-blue-600" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Checking verification status...
                        </p>
                        <button
                            onClick={handleResendVerification}
                            disabled={isResendDisabled}
                            className={`text-sm font-medium transition-all duration-200 ${
                                isResendDisabled
                                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                    : 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline'
                            }`}
                            title={isResendDisabled ? `Wait ${countdown} seconds before resending` : 'Click to resend verification email'}
                        >
                            {isResendDisabled
                                ? `Resend available in ${countdown}s`
                                : 'Resend verification email'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
