import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';
import { PlusIcon, LogoutIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';
import { AuthorAvatar } from './AuthorAvatar';

interface HeaderProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onNewPostClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, onNewPostClick }) => {
  const { user, logout } = useAuth();
  const isAuthenticated = !!user;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-slate-900/10 dark:border-slate-50/[0.06] bg-white/80 dark:bg-slate-900/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold font-serif text-slate-900 dark:text-white hover:opacity-80 transition-opacity">
              Naf's Thoughts
            </Link>
          </div>
          <div className="flex items-center space-x-4">
             {isAuthenticated && user ? (
              <>
                <NavLink 
                  to="/admin/dashboard" 
                  className={({ isActive }) => 
                    `hidden sm:block text-sm font-medium transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`
                  }>
                  Dashboard
                </NavLink>
                 <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-300">
                    <Link to="/profile" className="flex items-center space-x-2 group">
                      <AuthorAvatar name={user.name} photoURL={user.photoURL} className="w-7 h-7" />
                      <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user.name}</span>
                    </Link>
                 </div>
                <button
                  onClick={onNewPostClick}
                  className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>New Post</span>
                </button>
                 <button
                  onClick={logout}
                  className="hidden sm:flex items-center space-x-2 p-2 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Logout"
                >
                  <LogoutIcon className="w-5 h-5" />
                </button>
              </>
            ) : (
                <>
                  <NavLink 
                      to="/login" 
                      className={({ isActive }) => 
                        `text-sm font-medium transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`
                      }>
                      Login
                  </NavLink>
                   <NavLink 
                      to="/signup" 
                      className="text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Sign Up
                  </NavLink>
                </>
            )}
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </div>
      </div>
    </header>
  );
};