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
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signup: (name: string, email: string, pass: string) => Promise<void>;
    login: (email: string, pass: string) => Promise<User>;
    logout: () => Promise<void>;
    loginWithGoogle: () => Promise<User>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (uid: string, data: { name?: string; }) => Promise<void>;
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
                    const userProfile = await fetchUserProfile(firebaseUser);
                    setUser(userProfile);
                } catch (error: any) {
                    console.error("Auth state change error:", error.message);
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
        const newUser: User = {
            uid: userCredential.user.uid,
            name,
            email,
            role: email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user',
            isBlocked: false,
            photoURL: null,
        };
        await setDoc(doc(db, 'users', newUser.uid), newUser);
        setUser(newUser);
    };

    const login = async (email: string, pass: string): Promise<User> => {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const userProfile = await fetchUserProfile(userCredential.user);
        if (!userProfile) throw new Error("User profile could not be loaded.");
        setUser(userProfile);
        return userProfile;
    };
    
    const loginWithGoogle = async (): Promise<User> => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;

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

    const value = { user, loading, signup, login, logout, loginWithGoogle, resetPassword, updateUserProfile };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
