import { collection, getDocs, limit, query, doc, getDoc, updateDoc, addDoc, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User, Category } from '../types';

export const api = {
    async getCurrentUser(): Promise<User | null> {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return null;
        
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!userDoc.exists()) return null;
        
        return {
            uid: userDoc.id,
            ...userDoc.data()
        } as User;
    },
    async checkConnection() {
        try {
            // Try to fetch a small amount of data to verify connection
            const testQuery = query(collection(db, 'posts'), limit(1));
            await getDocs(testQuery);
            return { success: true };
        } catch (err: any) {
            return { 
                success: false, 
                error: getDetailedErrorMessage(err)
            };
        }
    },

    async getUsers(): Promise<User[]> {
        const querySnapshot = await getDocs(collection(db, 'users'));
        return querySnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        } as User));
    },

    async toggleUserBlock(uid: string, isBlocked: boolean): Promise<void> {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            isBlocked: !isBlocked,
            blockTimestamp: !isBlocked ? new Date().toISOString() : null
        });
    },

    async getCategories(): Promise<Category[]> {
        const querySnapshot = await getDocs(collection(db, 'categories'));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Category));
    },

    async addCategory(name: string): Promise<void> {
        // Check if category already exists
        const existingQuery = query(collection(db, 'categories'), where('name', '==', name));
        const existingDocs = await getDocs(existingQuery);
        if (!existingDocs.empty) {
            throw new Error('Category already exists');
        }

        await addDoc(collection(db, 'categories'), {
            name,
            createdAt: new Date().toISOString()
        });
    },

    async seedInitialCategories(): Promise<void> {
        const defaultCategories = ['General', 'Technology', 'Programming', 'Design', 'Life'];
        const batch = writeBatch(db);
        
        for (const categoryName of defaultCategories) {
            const docRef = doc(collection(db, 'categories'));
            batch.set(docRef, {
                name: categoryName,
                createdAt: new Date().toISOString()
            });
        }

        await batch.commit();
    }
};

// Helper function to format error messages
function getDetailedErrorMessage(err: any): string {
    const errorMessage = String(err.message || err);
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id';

    if (errorMessage.includes('Could not reach Cloud Firestore backend')) {
        return `Connection Timeout: Could not reach the Firestore database.\n\nPlease check:\n1. Firebase Console > Firestore Database is created and active\n2. Project ID "${projectId}" matches your Firebase project\n3. Your internet connection is stable`;
    } 
    
    if (errorMessage.includes('permission-denied')) {
        return "Permission Denied: Firestore security rules are blocking this request. Check your security rules configuration.";
    }
    
    if (errorMessage.includes('firestore is not available') || errorMessage.includes('Firebase config is missing')) {
        return "Firebase Configuration Error: Please verify your Firebase configuration settings.";
    }
    
    return `Unexpected Error: ${errorMessage}`;
}
