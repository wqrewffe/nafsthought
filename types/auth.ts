import { RecaptchaVerifier } from 'firebase/auth';

declare global {
    interface Window {
        recaptchaVerifier: RecaptchaVerifier;
    }
}

export interface User {
    uid: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    isBlocked: boolean;
    photoURL: string | null;
    emailVerified: boolean;
    followers?: string[]; // Array of user IDs
    following?: string[]; // Array of user IDs
    bio?: string;
    socialLinks?: {
        twitter?: string;
        github?: string;
        linkedin?: string;
        website?: string;
    };
    posts?: string[]; // Array of post IDs
    comments?: string[]; // Array of comment IDs
    loginCount?: number;
    lastActive?: string;
    username?: string;
}
