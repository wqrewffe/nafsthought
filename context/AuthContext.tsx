import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    User as FirebaseUser,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    updateProfile,
    sendEmailVerification,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from '../types/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signup: (name: string, email: string, pass: string) => Promise<void>;
    login: (email: string, pass: string) => Promise<User>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<User>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (uid: string, data: { name?: string; }) => Promise<void>;
    resendVerificationEmail: (email: string, password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'nafisabdullah424@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<User | null> => {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userProfile = { ...userDoc.data(), photoURL: null } as User; // Always nullify photoURL
             if (userProfile.isBlocked) {
                await signOut(auth);
                throw new Error("This account has been blocked by an administrator.");
            }
            return userProfile;
        }
        return null;
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Reload the user to get the latest email verification status
                    await firebaseUser.reload();
                    
                    if (!firebaseUser.emailVerified) {
                        // If email is not verified, sign out and don't set the user
                        await signOut(auth);
                        setUser(null);
                        setLoading(false);
                        return;
                    }

                    const userProfile = await fetchUserProfile(firebaseUser);
                    if (userProfile) {
                        // Update the email verification status in Firestore if it's different
                        if (userProfile.emailVerified !== firebaseUser.emailVerified) {
                            await updateDoc(doc(db, 'users', firebaseUser.uid), {
                                emailVerified: firebaseUser.emailVerified
                            });
                            userProfile.emailVerified = firebaseUser.emailVerified;
                        }
                        setUser(userProfile);
                    } else {
                        setUser(null);
                    }
                } catch (error: any) {
                    console.error("Auth state change error:", error.message);
                    await signOut(auth);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [fetchUserProfile]);

    const signup = async (name: string, email: string, pass: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(userCredential.user, { displayName: name });
        
        // Send email verification
        await sendEmailVerification(userCredential.user);
        
        const newUser: User = {
            uid: userCredential.user.uid,
            name,
            email,
            role: email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user',
            isBlocked: false,
            photoURL: null,
            emailVerified: false
        };
        await setDoc(doc(db, 'users', newUser.uid), newUser);
        
        // Sign out immediately after signup to force email verification
        await signOut(auth);
        setUser(null);
    };

    const login = async (email: string, pass: string): Promise<User> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        
        // Reload user to get fresh verification status
        await userCredential.user.reload();
        
        if (!userCredential.user.emailVerified) {
            await signOut(auth);
            throw new Error("Please verify your email before logging in. Check your inbox for the verification link or request a new one.");
        }

        const userProfile = await fetchUserProfile(userCredential.user);
        if (!userProfile) throw new Error("User profile could not be loaded.");
        
        // Ensure Firestore emailVerified status is synced
        await updateDoc(doc(db, 'users', userCredential.user.uid), {
            emailVerified: true
        });
        userProfile.emailVerified = true;
        
        setUser(userProfile);
        return userProfile;
    };
    
    const loginWithGoogle = async (): Promise<User> => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        
        // Google-authenticated users are automatically email verified
        // but we'll double-check and update Firestore accordingly

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        let userProfile: User;
        if (!userDoc.exists()) {
            userProfile = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'Google User',
                email: firebaseUser.email || '',
                role: firebaseUser.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user',
                isBlocked: false,
                photoURL: null, // Always null
                emailVerified: firebaseUser.emailVerified ?? false,
            };
            await setDoc(doc(db, 'users', userProfile.uid), userProfile);
        } else {
             const existingProfile = await fetchUserProfile(firebaseUser);
             if (!existingProfile) throw new Error("Blocked user or profile not found.");
             userProfile = existingProfile;
        }

        setUser(userProfile);
        return userProfile;
    };

    const resetPassword = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };

    const logout = async () => {
        await signOut(auth);
        setUser(null);
    };

    const updateUserProfile = async (uid: string, data: { name?: string }) => {
        if (!auth.currentUser || auth.currentUser.uid !== uid) return;

        const { name } = data;
        
        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, {
            ...(name && { displayName: name }),
        });
        
        // Update Firestore user document
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
            ...(name && { name: name }),
            photoURL: null, // Ensure it's null
        });

        // Update local state
        setUser(prevUser => prevUser ? {
             ...prevUser,
             ...(name && { name: name }),
             photoURL: null,
        } : null);
    };

    const resendVerificationEmail = async (email: string, password: string) => {
        try {
            // First sign in the user
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Send the verification email
            await sendEmailVerification(userCredential.user);
            // Sign out to maintain unverified state
            await signOut(auth);
        } catch (error: any) {
            if (error.message.includes('auth/invalid-credential')) {
                throw new Error('Invalid email or password. Please try again.');
            }
            throw error;
        }
    };

    const value = { 
        user, 
        loading, 
        signup, 
        login, 
        logout, 
        loginWithGoogle, 
        resetPassword, 
        updateUserProfile,
        resendVerificationEmail
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
