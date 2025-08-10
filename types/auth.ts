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
}
