import React, { useState, useEffect } from 'react';
import { Post, Category } from '../types';
import { CloseIcon, SendIcon, SpinnerIcon } from './Icons';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { api } from '../hooks/useBlogData';

interface CreatePostFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (postData: { title: string; content: string; category: string; }, postId?: string) => Promise<void>;
  postToEdit: Post | null;
}

const turndownService = new TurndownService();

const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  return turndownService.turndown(html);
};

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ isOpen, onClose, onSave, postToEdit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // This now holds Markdown
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!postToEdit;

  useEffect(() => {
    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);
            const fetchedCategories = await api.getCategories();
            setCategories(fetchedCategories);
            
            if (isEditMode && postToEdit) {
                setTitle(postToEdit.title);
                setContent(htmlToMarkdown(postToEdit.content));
                setCategory(postToEdit.category);
            } else {
                setTitle('');
                setContent('');
                setCategory(fetchedCategories.length > 0 ? fetchedCategories[0].name : '');
            }
        } catch (err) {
            setError("Failed to load post categories. Please try again.");
            console.error(err);
        } finally {
            setLoadingCategories(false);
        }
    };
    
    if (isOpen) {
        fetchCategories();
        setError('');
        setIsSubmitting(false);
    }
  }, [isOpen, isEditMode, postToEdit]);


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content cannot be empty.');
      return;
    }
     if (!category) {
      setError('You must select a category for the post.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    
    const formattedContent = marked.parse(content, { gfm: true }) as string;
    
    try {
        await onSave({ title, content: formattedContent, category }, postToEdit?.id);
        // On success, App.tsx will call handleCloseForm, which unmounts this component.
    } catch (err: any) {
        // The error from useBlogData contains a detailed message. We display it here.
        const errorMessage = err.message || 'An unknown error occurred. Please check your connection and try again.';
        setError(errorMessage);
        // To prevent a fatal "circular structure" crash, we log the error message
        // inside a template literal, ensuring only a primitive string is passed to the console.
        // This is critical for allowing the `finally` block to run and update the UI.
        console.error(`Save operation failed: ${err.message}`);
    } finally {
        // This ensures the spinner stops even if the save fails.
        // If save succeeds, the component unmounts anyway.
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all animate-slide-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{isEditMode ? 'Edit Post' : 'Create New Post'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" disabled={isSubmitting}>
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your amazing post title"
                  disabled={isSubmitting}
                />
              </div>
               <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  disabled={loadingCategories || isSubmitting || categories.length === 0}
                  required
                >
                    {loadingCategories ? (
                        <option>Loading categories...</option>
                    ) : categories.length === 0 ? (
                        <option>No categories found</option>
                    ) : (
                        <>
                            <option value="" disabled>Select a category</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </>
                    )}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Content
              </label>
              <textarea
                id="content"
                rows={10}
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="Tell your story using Markdown..."
                disabled={isSubmitting}
              />
               <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Supports <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Markdown</a> for images, links, code, and more.
              </p>
            </div>
            {error && (
              <div className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md" role="alert">
                <strong className="font-bold block text-sm">Publishing Failed</strong>
                <span className="block text-sm whitespace-pre-wrap mt-1">{error}</span>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end">
            <button
              type="submit"
              className="flex items-center justify-center space-x-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
              disabled={isSubmitting || loadingCategories}
            >
              {isSubmitting ? <SpinnerIcon className="w-4 h-4"/> : <SendIcon className="w-4 h-4" />}
              <span>{isSubmitting ? (isEditMode ? 'Saving...' : 'Publishing...') : (isEditMode ? 'Save Changes' : 'Publish Post')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};