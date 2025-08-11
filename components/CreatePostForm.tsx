import React, { useState, useEffect, useRef } from 'react';
import { Post, Category } from '../types';
import { User } from '../types/auth';
import { CloseIcon, SendIcon, SpinnerIcon } from './Icons';
import { marked } from 'marked';
import TurndownService from 'turndown';
import { api } from '../services/api';

interface MarkdownAction {
  icon: string;
  label: string;
  action: (text: string) => { text: string; selectionStart: number; selectionEnd: number };
}

const markdownActions: MarkdownAction[] = [
  // Text Size
  {
    icon: '📝',
    label: 'Normal Text',
    action: (text) => ({ text: `<span class="text-base">${text}</span>`, selectionStart: 29, selectionEnd: 29 + text.length })
  },
  {
    icon: '𝗧',
    label: 'Large Title',
    action: (text) => ({ text: `<span class="text-3xl font-bold">${text}</span>`, selectionStart: 35, selectionEnd: 35 + text.length })
  },
  {
    icon: '𝗛',
    label: 'Medium Title',
    action: (text) => ({ text: `<span class="text-2xl font-semibold">${text}</span>`, selectionStart: 38, selectionEnd: 38 + text.length })
  },
  {
    icon: '𝗦',
    label: 'Small Title',
    action: (text) => ({ text: `<span class="text-xl font-medium">${text}</span>`, selectionStart: 36, selectionEnd: 36 + text.length })
  },

  // Text Style
  {
    icon: '𝗕',
    label: 'Bold',
    action: (text) => ({ text: `<span class="font-bold">${text}</span>`, selectionStart: 24, selectionEnd: 24 + text.length })
  },
  {
    icon: '𝘐',
    label: 'Italic',
    action: (text) => ({ text: `<span class="italic">${text}</span>`, selectionStart: 21, selectionEnd: 21 + text.length })
  },
  {
    icon: '𝗦̶',
    label: 'Strike',
    action: (text) => ({ text: `<span class="line-through">${text}</span>`, selectionStart: 26, selectionEnd: 26 + text.length })
  },
  {
    icon: '🗒️',
    label: 'Quote',
    action: (text) => ({ text: `<blockquote class="pl-4 border-l-4 border-blue-500 italic">${text}</blockquote>`, selectionStart: 57, selectionEnd: 57 + text.length })
  },

  // Lists
  {
    icon: '•',
    label: 'Simple List',
    action: (text) => ({ text: `<ul class="list-disc pl-5">\n  <li>${text}</li>\n</ul>`, selectionStart: 32, selectionEnd: 32 + text.length })
  },
  {
    icon: '1️⃣',
    label: 'Numbered List',
    action: (text) => ({ text: `<ol class="list-decimal pl-5">\n  <li>${text}</li>\n</ol>`, selectionStart: 35, selectionEnd: 35 + text.length })
  },
  {
    icon: '✓',
    label: 'Checklist',
    action: (text) => ({ text: `<ul class="list-none pl-5">\n  <li>✓ ${text}</li>\n</ul>`, selectionStart: 35, selectionEnd: 35 + text.length })
  },

  // Links and Media
  {
    icon: '🔗',
    label: 'Simple Link',
    action: (text) => ({ text: `<a href="#" class="text-blue-500 hover:underline">${text}</a>`, selectionStart: 44, selectionEnd: 44 + text.length })
  },
  {
    icon: '🌟',
    label: 'Fancy Link',
    action: (text) => ({ text: `<a href="#" class="text-blue-500 hover:text-blue-700 underline decoration-dotted">${text}</a>`, selectionStart: 76, selectionEnd: 76 + text.length })
  },
  {
    icon: '🖼️',
    label: 'Image',
    action: (text) => ({ text: `<img src="image-url" alt="${text}" class="rounded-lg shadow-md" />`, selectionStart: 20, selectionEnd: 20 + text.length })
  },

  // Code
  {
    icon: '💻',
    label: 'Code',
    action: (text) => ({ text: `<code class="bg-gray-100 dark:bg-gray-800 rounded px-1">${text}</code>`, selectionStart: 52, selectionEnd: 52 + text.length })
  },
  {
    icon: '📟',
    label: 'Code Block',
    action: (text) => ({ text: `<pre class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto"><code>${text}</code></pre>`, selectionStart: 76, selectionEnd: 76 + text.length })
  },
  // Colors and Special Formatting
  {
    icon: '🔴',
    label: 'Red Text',
    action: (text) => ({ text: `<span class="text-red-500">${text}</span>`, selectionStart: 28, selectionEnd: 28 + text.length })
  },
  {
    icon: '🔵',
    label: 'Blue Text',
    action: (text) => ({ text: `<span class="text-blue-500">${text}</span>`, selectionStart: 29, selectionEnd: 29 + text.length })
  },
  {
    icon: '💚',
    label: 'Green Text',
    action: (text) => ({ text: `<span class="text-green-500">${text}</span>`, selectionStart: 30, selectionEnd: 30 + text.length })
  },
  {
    icon: '💜',
    label: 'Purple Text',
    action: (text) => ({ text: `<span class="text-purple-500">${text}</span>`, selectionStart: 31, selectionEnd: 31 + text.length })
  },
  {
    icon: '🌟',
    label: 'Gold Text',
    action: (text) => ({ text: `<span class="text-yellow-500">${text}</span>`, selectionStart: 31, selectionEnd: 31 + text.length })
  },
  {
    icon: '💫',
    label: 'Highlight Yellow',
    action: (text) => ({ text: `<mark class="bg-yellow-200 dark:bg-yellow-800 dark:text-white">${text}</mark>`, selectionStart: 60, selectionEnd: 60 + text.length })
  },
  {
    icon: '✨',
    label: 'Highlight Blue',
    action: (text) => ({ text: `<mark class="bg-blue-200 dark:bg-blue-800 dark:text-white">${text}</mark>`, selectionStart: 58, selectionEnd: 58 + text.length })
  },
  {
    icon: '🌟',
    label: 'Hover Effect',
    action: (text) => ({ text: `<span class="hover:text-blue-500 transition-colors">${text}</span>`, selectionStart: 51, selectionEnd: 51 + text.length })
  },
  {
    icon: '📝',
    label: 'Blockquote',
    action: (text) => ({ text: `> ${text}`, selectionStart: 2, selectionEnd: 2 + text.length })
  }
];

interface CreatePostFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    postData: {
      title: string;
      content: string;
      categories: string[];
      authorId?: string;
      author?: string;
    },
    postId?: string
  ) => Promise<void>;
  postToEdit: Post | null;
}

const turndownService = new TurndownService();

const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  return turndownService.turndown(html);
};

export const CreatePostForm: React.FC<CreatePostFormProps> = ({
  isOpen,
  onClose,
  onSave,
  postToEdit
}) => {
  const formId = 'post-form';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // Markdown content
  const [categoriesInput, setCategoriesInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!postToEdit;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMarkdownAction = (action: MarkdownAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || 'text';
    const before = content.substring(0, start);
    const after = content.substring(end);

    const result = action.action(selectedText);
    const newContent = before + result.text + after;
    
    setContent(newContent);
    
    // Restore cursor position after React rerender
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + result.selectionStart,
        start + result.selectionEnd
      );
    }, 0);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const fetchedCategories = await api.getCategories();
        setCategories(fetchedCategories);

        if (isEditMode && postToEdit) {
          setTitle(postToEdit.title);
          setContent(htmlToMarkdown(postToEdit.content));
          setCategoriesInput(
            postToEdit.categories ? postToEdit.categories.join(', ') : ''
          );
        } else {
          setTitle('');
          setContent('');
          setCategoriesInput('');
        }
      } catch (err) {
        setError('Failed to load post categories. Please try again.');
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
    if (!categoriesInput.trim()) {
      setError('You must enter at least one category for the post.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    const formattedContent = marked.parse(content, { gfm: true }) as string;

    try {
      const currentUser = await api.getCurrentUser();
      if (!currentUser) {
        setError('You must be logged in to create or edit a post.');
        return;
      }

      const categoriesArr = categoriesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const uniqueCategories = [...new Set(categoriesArr)];

      if (
        postToEdit &&
        currentUser.role !== 'admin' &&
        postToEdit.authorId !== currentUser.uid
      ) {
        setError('You can only edit your own posts.');
        return;
      }

      await onSave(
        {
          title,
          content: formattedContent,
          categories: uniqueCategories,
          authorId: currentUser.uid,
          author: currentUser.name
        },
        postToEdit?.id
      );
    } catch (err: any) {
      const errorMessage =
        err.message ||
        'An unknown error occurred. Please check your connection and try again.';
      setError(errorMessage);
      console.error(`Save operation failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-start justify-center z-50 overflow-y-auto min-h-screen"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 w-full min-h-screen transform transition-all animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? 'Edit Post' : 'Create New Post'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              disabled={isSubmitting}
              aria-label="Close"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="max-w-5xl mx-auto px-6"
          >
            <div className="py-8 space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Title & Content */}
                <div className="lg:col-span-2">
                  <label
                    htmlFor="title"
                    className="block text-lg font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 text-xl border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your post title..."
                    disabled={isSubmitting}
                  />

                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-2">
                      <label
                        htmlFor="content"
                        className="block text-lg font-medium text-slate-700 dark:text-slate-300"
                      >
                        Content
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            showPreview 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {showPreview ? '✏️ Edit' : '👁️ Preview'}
                        </button>
                      </div>
                    </div>

                    {!showPreview ? (
                      <>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded-t-lg border border-b-0 border-slate-300 dark:border-slate-600">
                          {/* Format Groups */}
                          <div className="p-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {/* Text Style Group */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Text Style</div>
                              <div className="flex flex-wrap gap-1">
                                {markdownActions.slice(0, 4).map((action) => (
                                  <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => handleMarkdownAction(action)}
                                    className="p-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    title={action.label}
                                    disabled={isSubmitting}
                                  >
                                    {action.icon}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Text Format Group */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Format</div>
                              <div className="flex flex-wrap gap-1">
                                {markdownActions.slice(4, 8).map((action) => (
                                  <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => handleMarkdownAction(action)}
                                    className="p-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    title={action.label}
                                    disabled={isSubmitting}
                                  >
                                    {action.icon}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Lists Group */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Lists</div>
                              <div className="flex flex-wrap gap-1">
                                {markdownActions.slice(8, 11).map((action) => (
                                  <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => handleMarkdownAction(action)}
                                    className="p-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    title={action.label}
                                    disabled={isSubmitting}
                                  >
                                    {action.icon}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Media Group */}
                            <div className="space-y-2">
                              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Media</div>
                              <div className="flex flex-wrap gap-1">
                                {markdownActions.slice(11).map((action) => (
                                  <button
                                    key={action.label}
                                    type="button"
                                    onClick={() => handleMarkdownAction(action)}
                                    className="p-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                                    title={action.label}
                                    disabled={isSubmitting}
                                  >
                                    {action.icon}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        <textarea
                          ref={textareaRef}
                          id="content"
                          rows={20}
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-b-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base leading-relaxed"
                          placeholder="Write your post content here..."
                          disabled={isSubmitting}
                        />
                      </>
                    ) : (
                      <div className="border rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 min-h-[400px] p-6">
                        <div
                          className="prose prose-xl dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 font-serif leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: marked(content) }}
                        />
                      </div>
                    )}
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Supports{' '}
                      <a
                        href="https://www.markdownguide.org/basic-syntax/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Markdown
                      </a>{' '}
                      for formatting, images, links, and more.
                    </p>
                  </div>
                </div>

                {/* Categories */}
                <div className="lg:col-span-1 space-y-6">
                  <div>
                    <label
                      htmlFor="categoriesInput"
                      className="block text-lg font-medium text-slate-700 dark:text-slate-300 mb-2"
                    >
                      Categories
                    </label>
                    <input
                      type="text"
                      id="categoriesInput"
                      value={categoriesInput}
                      onChange={(e) => setCategoriesInput(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. React, Firebase, Hooks"
                      disabled={isSubmitting}
                    />
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      Separate categories with commas
                    </p>
                  </div>

                  {categories.length > 0 && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Available Categories
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              const current = categoriesInput
                                .split(',')
                                .map((c) => c.trim());
                              if (!current.includes(category.name)) {
                                setCategoriesInput((prev) =>
                                  prev
                                    ? `${prev}, ${category.name}`
                                    : category.name
                                );
                              }
                            }}
                            className="px-3 py-1 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div
                  className="bg-red-100 dark:bg-red-900/50 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg mt-8"
                  role="alert"
                >
                  <strong className="font-bold block text-sm">
                    Publishing Failed
                  </strong>
                  <span className="block text-sm whitespace-pre-wrap mt-1">
                    {error}
                  </span>
                </div>
              )}
            </div>
          </form>

          {/* Footer Actions */}
          <div className="sticky bottom-0 left-0 right-0 mt-8 py-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <div className="max-w-5xl mx-auto px-6 flex justify-between items-center">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form={formId}
                className="flex items-center justify-center space-x-2 px-8 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-colors disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed"
                disabled={isSubmitting || loadingCategories}
              >
                {isSubmitting ? (
                  <SpinnerIcon className="w-4 h-4" />
                ) : (
                  <SendIcon className="w-4 h-4" />
                )}
                <span>
                  {isSubmitting
                    ? isEditMode
                      ? 'Saving...'
                      : 'Publishing...'
                    : isEditMode
                    ? 'Save Changes'
                    : 'Publish Post'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
