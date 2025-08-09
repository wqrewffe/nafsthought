import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { Post, User } from './types';
import { useTheme } from './hooks/useTheme';
import { useBlogData } from './hooks/useBlogData';
import { useAuth } from './hooks/useAuth';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BlogList } from './components/BlogList';
import { BlogPost } from './components/BlogPost';
import { CreatePostForm } from './components/CreatePostForm';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlusIcon, SpinnerIcon } from './components/Icons';
import { StatusPage } from './pages/StatusPage';
import { ProfilePage } from './pages/ProfilePage';

const FullScreenLoader: React.FC = () => (
    <div className="flex-grow flex items-center justify-center">
        <SpinnerIcon className="w-12 h-12 text-blue-600" />
    </div>
);

function App() {
  const [theme, toggleTheme] = useTheme();
  const { 
    posts, loading, error, addPost, addComment, upvotePost, 
    updatePost, deletePost, deleteComment, reportPost, dismissReport
  } = useBlogData();
  const { user } = useAuth();
  
  const [isPostFormOpen, setPostFormOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
  const location = useLocation();

  const handleOpenCreateForm = () => {
    setEditingPost(null);
    setPostFormOpen(true);
  };

  const handleOpenEditForm = (post: Post) => {
    setEditingPost(post);
    setPostFormOpen(true);
  };

  const handleCloseForm = () => {
    setPostFormOpen(false);
    setEditingPost(null);
  };

  const handleSavePost = async (postData: { title: string; content: string; category: string; }, postId?: string) => {
    if (!user) return;

    if (postId) {
      await updatePost(postId, postData.title, postData.content, postData.category);
    } else {
      await addPost(postData.title, postData.content, user as User, postData.category);
    }
    handleCloseForm();
  };

  const handleDeletePost = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      await deletePost(postId);
    }
  };
  
  const handleBlockUser = async (userId: string) => {
    // This is a placeholder as the block logic is in DashboardPage.
    // However, if needed from other places, it would be implemented here.
    console.log(`Blocking user ${userId}`);
  };


  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      await deleteComment(postId, commentId);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4,
  } as const;
  
  const MotionWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-700 dark:text-slate-300">
      <Header 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onNewPostClick={handleOpenCreateForm}
      />
      <main className="flex-grow flex flex-col">
        {loading && !posts.length ? (
            <FullScreenLoader />
        ) : error ? (
            <div className="flex-grow flex items-center justify-center text-center p-4">
              <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative max-w-2xl" role="alert">
                <strong className="font-bold block mb-2">Oops! A Connection Error Occurred.</strong>
                <span className="block whitespace-pre-wrap text-left">{error}</span>
              </div>
            </div>
        ) : (
            <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
                <Route path="/" element={<MotionWrapper><BlogList posts={posts} /></MotionWrapper>} />
                <Route 
                path="/post/:slug" 
                element={
                    <MotionWrapper>
                    <BlogPost 
                        upvotePost={upvotePost} 
                        addComment={addComment}
                        reportPost={reportPost}
                    />
                    </MotionWrapper>
                } 
                />
                <Route path="/login" element={<MotionWrapper><LoginPage /></MotionWrapper>} />
                <Route path="/signup" element={<MotionWrapper><SignupPage /></MotionWrapper>} />
                <Route 
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <MotionWrapper><ProfilePage /></MotionWrapper>
                        </ProtectedRoute>
                    }
                />
                <Route 
                path="/admin/dashboard"
                element={
                    <ProtectedRoute>
                    <MotionWrapper>
                        <DashboardPage 
                        posts={posts}
                        onEditPost={handleOpenEditForm}
                        onDeletePost={handleDeletePost}
                        onDeleteComment={handleDeleteComment}
                        onDismissReport={dismissReport}
                        onBlockUser={handleBlockUser}
                        />
                    </MotionWrapper>
                    </ProtectedRoute>
                }
                />
                 <Route 
                path="/admin/status"
                element={
                    <ProtectedRoute adminOnly={true}>
                    <MotionWrapper>
                        <StatusPage />
                    </MotionWrapper>
                    </ProtectedRoute>
                }
                />
                <Route path="/404" element={<MotionWrapper><NotFoundPage /></MotionWrapper>} />
                <Route path="*" element={<Navigate to="/404" />} />
            </Routes>
            </AnimatePresence>
        )}
      </main>
      <Footer />
      
      <CreatePostForm 
        isOpen={isPostFormOpen}
        onClose={handleCloseForm}
        onSave={handleSavePost}
        postToEdit={editingPost}
      />

      {!!user && (
        <button
          onClick={handleOpenCreateForm}
          className="sm:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          aria-label="Create new post"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

export default App;