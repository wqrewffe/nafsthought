import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 pb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>&copy; {new Date().getFullYear()} Naf's Thoughts. All rights reserved.</p>
          <p className="mt-1">Crafted with ❤️ and React.</p>
        </div>
      </div>
    </footer>
  );
};