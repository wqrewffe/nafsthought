import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Post, Comment, User } from '../types';
import { HeartIcon, CommentIcon, EyeIcon, ShareIcon, SendIcon, SpinnerIcon, FlagIcon, CloseIcon } from './Icons';
import { AuthorAvatar } from './AuthorAvatar';
import { api } from '../hooks/useBlogData';
import { useAuth } from '../hooks/useAuth';

interface BlogPostProps {
  upvotePost: (postId: string) => Promise<void>;
  addComment: (postId: string, user: User, text: string, parentId?: string | null) => Promise<any>;
  reportPost: (postId: string, reporterId: string, reason: string) => Promise<void>;
}

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="flex items-center space-x-2">
    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">{icon}</div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  </div>
);

const ReportModal: React.FC<{ post: Post, onClose: () => void, reportPost: BlogPostProps['reportPost'] }> = ({ post, onClose, reportPost }) => {
    const { user } = useAuth();
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to report a post.');
            return;
        }
        if (!reason.trim()) {
            setError('Please provide a reason for your report.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await reportPost(post.id, user.uid, reason);
            setSuccess(true);
            setTimeout(onClose, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to submit report.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Report Post</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors" disabled={isSubmitting}>
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                {success ? (
                    <div className="p-8 text-center">
                        <p className="text-lg text-green-600 dark:text-green-400">Thank you! Your report has been submitted for review.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">You are reporting the post: <strong className="text-slate-800 dark:text-slate-200">{post.title}</strong></p>
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason for reporting</label>
                            <textarea id="reason" rows={4} value={reason} onChange={e => setReason(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., This post contains inappropriate content."
                                disabled={isSubmitting}
                            />
                        </div>
                         {error && <p className="text-sm text-red-500">{error}</p>}
                        <div className="flex justify-end">
                            <button type="submit" className="flex items-center justify-center space-x-2 px-5 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400" disabled={isSubmitting}>
                                {isSubmitting ? <SpinnerIcon className="w-4 h-4" /> : <FlagIcon className="w-4 h-4" />}
                                <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};


const CommentForm: React.FC<{ post: Post; addComment: BlogPostProps['addComment']; onCommentAdded: (newComment: Comment) => void; parentId?: string | null; onCancel?: () => void }> = ({ post, addComment, onCommentAdded, parentId = null, onCancel }) => {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!user) {
             setError("You must be logged in to comment.");
             return;
        }
        if (text.trim()) {
            setIsSubmitting(true);
            try {
                const newComment = await addComment(post.id, user, text, parentId);
                onCommentAdded(newComment);
                setText('');
                if (onCancel) onCancel();
            } catch (error: any) {
                setError(error.message);
                console.error("Failed to post comment:", error.message);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
      <form onSubmit={handleSubmit} className={parentId ? "mt-4" : "mt-8"}>
        {!parentId && <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Leave a Comment</h3>}
        <div className="space-y-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={parentId ? "Write a reply..." : "Your Comment"} rows={parentId ? 2 : 4} className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required disabled={isSubmitting}/>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex items-center space-x-4">
              <button type="submit" className="flex items-center justify-center space-x-2 px-5 py-2.5 w-40 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-colors disabled:bg-blue-400" disabled={isSubmitting}>
                 {isSubmitting ? <SpinnerIcon className="w-4 h-4" /> : <SendIcon className="w-4 h-4" />}
                <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
              </button>
              {onCancel && <button type="button" onClick={onCancel} className="text-sm text-slate-600 hover:underline">Cancel</button>}
          </div>
        </div>
      </form>
    );
};

const CommentThread: React.FC<{ comments: Comment[], parentId?: string | null, onReply: (commentId: string) => void, activeReplyId: string | null, addComment: BlogPostProps['addComment'], post: Post, onCommentAdded: (newComment: Comment) => void }> = ({ comments, parentId = null, onReply, activeReplyId, ...props }) => {
    const childComments = useMemo(() => comments.filter(comment => comment.parentId === parentId), [comments, parentId]);
    if (childComments.length === 0) return null;
    
    return (
        <div className={`space-y-6 ${parentId ? 'pl-6 border-l border-slate-200 dark:border-slate-700' : ''}`}>
            {childComments.map(comment => (
                <div key={comment.id} className="flex space-x-4">
                    <div className="flex-shrink-0">
                       <AuthorAvatar name={comment.author} photoURL={comment.authorPhotoURL} className="w-10 h-10" />
                    </div>
                    <div className="flex-grow">
                        <div className="flex items-center space-x-2">
                           <p className="font-semibold text-slate-800 dark:text-slate-200">{comment.author}</p>
                           <time className="text-xs text-slate-500 dark:text-slate-400">{new Date(comment.timestamp).toLocaleString()}</time>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{comment.text}</p>
                        <button onClick={() => onReply(comment.id)} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline mt-1">Reply</button>
                        
                        {activeReplyId === comment.id && (
                            <CommentForm {...props} parentId={comment.id} onCancel={() => onReply('')} />
                        )}

                        <div className="mt-4">
                           <CommentThread {...props} comments={comments} parentId={comment.id} onReply={onReply} activeReplyId={activeReplyId} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


export const BlogPost: React.FC<BlogPostProps> = ({ upvotePost, addComment, reportPost }) => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }
      setLoading(true);
      window.scrollTo(0, 0);
      try {
        const fetchedPost = await api.getPostBySlug(slug);
        if (fetchedPost) {
          setPost({ ...fetchedPost, views: (fetchedPost.views || 0) + 1 });
          api.incrementViewCount(fetchedPost.id);
          if (fetchedPost.authorId) {
             const authorProfile = await api.getUserProfile(fetchedPost.authorId);
             setAuthor(authorProfile);
          }
        } else {
          setPost(null);
        }
      } catch (error: any) {
        const errorMessage = error.message || String(error);
        console.error(`Failed to fetch post: ${errorMessage}`);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[calc(100vh-200px)]">
        <SpinnerIcon className="w-12 h-12 text-blue-600" />
      </div>
    );
  }

  if (!post) {
    return <Navigate to="/404" replace />;
  }

  const handleOptimisticUpvote = () => {
    setPost(p => p ? { ...p, upvotes: p.upvotes + 1 } : null);
    upvotePost(post.id);
  };
  
  const handleCommentAdded = (newComment: Comment) => {
    const finalComment = { ...newComment, authorPhotoURL: user?.photoURL ?? null };
    setPost(p => p ? { ...p, comments: [finalComment, ...p.comments] } : null);
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}#${location.hash.substring(1)}`;

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in">
       {isReportModalOpen && <ReportModal post={post} onClose={() => setReportModalOpen(false)} reportPost={reportPost} />}
      <header className="mb-8 text-center">
        <div className="mb-4">
            <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-300">{post.category}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-serif text-slate-900 dark:text-white leading-tight mb-4">{post.title}</h1>
        <div className="flex items-center justify-center space-x-4 text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <AuthorAvatar className="w-8 h-8" name={post.author} photoURL={author?.photoURL} />
            <span>{post.author}</span>
          </div>
          <span>&bull;</span>
          <time dateTime={post.date}>{post.date}</time>
        </div>
      </header>
      
      <img src={post.coverImage} alt={post.title} className="w-full h-auto rounded-xl shadow-lg mb-8" />
      
      <div className="prose prose-lg dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-serif" dangerouslySetInnerHTML={{ __html: post.content }} />
      
      <div className="my-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex flex-wrap items-center justify-around gap-6">
        <Stat icon={<EyeIcon className="w-6 h-6 text-blue-500" />} label="Views" value={post.views.toLocaleString()} />
        <Stat icon={<CommentIcon className="w-6 h-6 text-green-500" />} label="Comments" value={post.comments.length} />
        <button onClick={handleOptimisticUpvote} className="group">
          <Stat icon={<HeartIcon className="w-6 h-6 text-red-500 group-hover:fill-red-500 transition-colors" />} label="Upvotes" value={post.upvotes} />
        </button>
      </div>

      <div className="mt-8 p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ShareIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-300 font-mono break-all">{shareUrl}</p>
        </div>
        <div>
          <button onClick={() => setReportModalOpen(true)} className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 hover:underline">
             <FlagIcon className="w-4 h-4" />
             <span>Report Post</span>
          </button>
          <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">Copy link</button>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white border-b pb-2 border-slate-200 dark:border-slate-700">Comments ({post.comments.length})</h2>
        <CommentThread 
            comments={post.comments} 
            onReply={setActiveReplyId}
            activeReplyId={activeReplyId}
            addComment={addComment}
            post={post}
            onCommentAdded={handleCommentAdded}
        />
        {post.comments.length === 0 && <p className="text-slate-500 dark:text-slate-400">Be the first to comment!</p>}
        {activeReplyId === null && <CommentForm post={post} addComment={addComment} onCommentAdded={handleCommentAdded} />}
      </section>
    </article>
  );
};