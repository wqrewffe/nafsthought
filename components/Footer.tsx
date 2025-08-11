import React from "react";
import { Github, Youtube, Facebook, Mail } from "lucide-react";

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Branding */}
          <div className="text-center md:text-left">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              Naf's Thoughts 
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Crafted with ❤️ by |Y|
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Github className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </a>
            <a
              href="https://www.youtube.com/channel/UCdFRC1_EvhbYs7lBensEPLg"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Youtube className="w-5 h-5 text-red-500" />
            </a>
            <a
              href="https://facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Facebook className="w-5 h-5 text-blue-600" />
            </a>
            <a
              href="mailto:your@email.com"
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Mail className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-8 border-t border-slate-200 dark:border-slate-800" />

        {/* Bottom Section */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          &copy; {year} Naf's Thoughts — |Y|. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
