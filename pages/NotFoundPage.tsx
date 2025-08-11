import React from "react";
import { Link } from "react-router-dom";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center text-center px-4 bg-gradient-to-br from-blue-50 via-white to-blue-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Animated 404 */}
      <h1 className="text-7xl md:text-9xl font-extrabold font-serif text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 dark:from-blue-400 dark:to-purple-400 animate-bounce mb-4 drop-shadow-lg">
        404
      </h1>

      {/* Title */}
      <h2 className="text-2xl md:text-4xl font-semibold text-slate-800 dark:text-white mb-3">
        Oops! Page Not Found in <span className="text-blue-600 dark:text-blue-400">Naf's Thoughts</span>
      </h2>

      {/* Description */}
      <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg">
        It seems you've wandered into uncharted territory.  
        Let’s get you back to the heart of <strong>Naf's Thoughts</strong>.
      </p>

      {/* Button */}
      <Link
        to="/"
        className="inline-flex items-center px-8 py-3 text-base font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-400/20 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
      >
        🚀 Take Me Home
      </Link>
    </div>
  );
};
