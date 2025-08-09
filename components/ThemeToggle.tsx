
import React from 'react';
import { SunIcon, MoonIcon } from './Icons';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme }) => {
  return (
    <button
      onClick={toggleTheme}
      className="w-14 h-7 rounded-full p-1 bg-gray-200 dark:bg-slate-700 relative transition-colors duration-500 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Toggle theme"
    >
      <div
        className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out"
        style={{ transform: theme === 'dark' ? 'translateX(28px)' : 'translateX(0)' }}
      >
        {theme === 'dark' ? (
          <MoonIcon className="text-slate-700 w-full h-full p-0.5" />
        ) : (
          <SunIcon className="text-yellow-500 w-full h-full p-0.5" />
        )}
      </div>
    </button>
  );
};
