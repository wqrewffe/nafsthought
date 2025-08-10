export interface CollaborativeDraft {
    id: string;
    title: string;
    content: string;
    ownerId: string;
    collaborators: string[]; // Array of user IDs
    lastModified: string;
    collaboratorPermissions: {
        [userId: string]: {
            canEdit: boolean;
            canDelete: boolean;
            canPublish: boolean;
        }
    };
    comments: DraftComment[];
    version: number;
}

export interface DraftComment {
    id: string;
    authorId: string;
    content: string;
    timestamp: string;
    selection?: {
        start: number;
        end: number;
        text: string;
    };
}
