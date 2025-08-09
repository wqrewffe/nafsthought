import React from 'react';

interface AuthorAvatarProps {
  className?: string;
  name: string;
  photoURL?: string | null; // Kept for prop compatibility, but functionality is removed.
}

export const AuthorAvatar: React.FC<AuthorAvatarProps> = ({ className, name }) => {
  const getInitials = (name: string): string => {
    if (!name || !name.trim()) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    
    if (parts.length === 1) {
      // For a single name like "Nafis", return "NA". For "N", return "N".
      return parts[0].substring(0, 2).toUpperCase();
    }
    
    // For names with multiple parts, e.g., "John Doe", "John F. Kennedy"
    // returns the first letter of the first and last parts, like "JD" or "JK".
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };
  
  const initials = getInitials(name);

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 text-white select-none ${className}`}
      aria-hidden="true"
    >
      <span className="font-bold leading-none">{initials}</span>
    </div>
  );
};
