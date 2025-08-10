import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { CollaborativeDraft, DraftComment } from '../types/draft';
import { User } from '../types';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';

const draftsCollection = collection(db, 'collaborative-drafts');

export const useCollaborativeDrafts = (user: User | null) => {
    const [drafts, setDrafts] = useState<CollaborativeDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            setDrafts([]);
            setLoading(false);
            return;
        }

        // Query drafts where user is either owner or collaborator
        const draftQuery = query(
            draftsCollection,
            where('collaborators', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(draftQuery, 
            (snapshot) => {
                const newDrafts = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as CollaborativeDraft));
                setDrafts(newDrafts);
                setLoading(false);
            },
            (err) => {
                console.error('Error fetching drafts:', err);
                setError(err.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    const addCollaborator = async (draftId: string, collaboratorId: string, permissions: {
        canEdit: boolean;
        canDelete: boolean;
        canPublish: boolean;
    }) => {
        const draftRef = doc(draftsCollection, draftId);
        await updateDoc(draftRef, {
            collaborators: arrayUnion(collaboratorId),
            [`collaboratorPermissions.${collaboratorId}`]: permissions
        });
    };

    const removeCollaborator = async (draftId: string, collaboratorId: string) => {
        const draftRef = doc(draftsCollection, draftId);
        await updateDoc(draftRef, {
            collaborators: arrayRemove(collaboratorId),
            [`collaboratorPermissions.${collaboratorId}`]: null
        });
    };

    const addDraftComment = async (draftId: string, comment: Omit<DraftComment, 'id'>) => {
        const draftRef = doc(draftsCollection, draftId);
        const newComment = {
            ...comment,
            id: Date.now().toString()
        };
        await updateDoc(draftRef, {
            comments: arrayUnion(newComment)
        });
        return newComment;
    };

    return {
        drafts,
        loading,
        error,
        addCollaborator,
        removeCollaborator,
        addDraftComment
    };
};
