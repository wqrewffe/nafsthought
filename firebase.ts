import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

// A simple check to prevent crashes if the config is not set.
if (!firebaseConfig || !firebaseConfig.projectId) {
    throw new Error("Firebase config is missing or invalid. Please check your firebaseConfig.ts file.");
}

// Initialize Firebase, creating a new app if one doesn't exist.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get a Firestore instance.
const db = getFirestore(app);

// Get an Auth instance.
const auth = getAuth(app);

// Initialize collections
export const notificationsCollection = collection(db, 'notifications');
export const notificationPreferencesCollection = collection(db, 'notificationPreferences');

// Export the initialized services for use in other parts of the app.
export { db, auth };
