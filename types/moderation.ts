export type UserRole = 'user' | 'moderator' | 'admin' | 'contributor';

export interface UserPermissions {
  canCreatePosts: boolean;
  canEditOwnPosts: boolean;
  canDeleteOwnPosts: boolean;
  canModerateComments: boolean;
  canManageCategories: boolean;
  canManageUsers: boolean;
}

export interface ModerationAction {
  id: string;
  userId: string;
  adminId: string;
  type: 'block' | 'unblock' | 'role_change' | 'permission_change';
  reason: string;
  duration?: number; // Duration in days for temporary actions
  timestamp: string;
  expiresAt?: string;
  newRole?: UserRole;
  newPermissions?: Partial<UserPermissions>;
}

// Define permissions for each role
export const rolePermissions: Record<UserRole, UserPermissions> = {
  user: {
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canModerateComments: false,
    canManageCategories: false,
    canManageUsers: false
  },
  contributor: {
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canModerateComments: false,
    canManageCategories: false,
    canManageUsers: false
  },
  moderator: {
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canModerateComments: true,
    canManageCategories: true,
    canManageUsers: false
  },
  admin: {
    canCreatePosts: true,
    canEditOwnPosts: true,
    canDeleteOwnPosts: true,
    canModerateComments: true,
    canManageCategories: true,
    canManageUsers: true
  }
};
