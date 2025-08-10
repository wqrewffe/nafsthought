import React from 'react';

type IconComponent = React.FC<{
    className?: string;
}>
import { 
    Sun, Moon, Heart, MessageCircle, Eye, Share2, Plus, Send, X, Menu, 
    LogOut, Trash2, Edit, Loader2, CheckCircle2, XCircle, User, EyeOff, Flag,
    Bookmark, BarChart2, Award, Settings, Twitter, Github, Linkedin, Globe 
} from 'lucide-react';

interface IconProps {
  className?: string;
}

export const SunIcon: React.FC<IconProps> = ({ className }) => <Sun className={className} />;
export const MoonIcon: React.FC<IconProps> = ({ className }) => <Moon className={className} />;
export const HeartIcon: React.FC<IconProps> = ({ className }) => <Heart className={className} />;
export const CommentIcon: React.FC<IconProps> = ({ className }) => <MessageCircle className={className} />;
export const EyeIcon: React.FC<IconProps> = ({ className }) => <Eye className={className} />;
export const EyeOffIcon: React.FC<IconProps> = ({ className }) => <EyeOff className={className} />;
export const ShareIcon: React.FC<IconProps> = ({ className }) => <Share2 className={className} />;
export const PlusIcon: React.FC<IconProps> = ({ className }) => <Plus className={className} />;
export const SendIcon: React.FC<IconProps> = ({ className }) => <Send className={className} />;
export const CloseIcon: React.FC<IconProps> = ({ className }) => <X className={className} />;
export const MenuIcon: React.FC<IconProps> = ({ className }) => <Menu className={className} />;
export const LogoutIcon: React.FC<IconProps> = ({ className }) => <LogOut className={className} />;
export const TrashIcon: React.FC<IconProps> = ({ className }) => <Trash2 className={className} />;
export const EditIcon: React.FC<IconProps> = ({ className }) => <Edit className={className} />;
export const ClockIcon: IconComponent = ({ className }) => (
    <svg className={className || 'w-5 h-5'} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);

export const SpinnerIcon: IconComponent = ({ className }) => (
    <svg className={`animate-spin ${className || 'w-5 h-5'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);
export const CheckCircleIcon: React.FC<IconProps> = ({ className }) => <CheckCircle2 className={className} />;
export const ErrorCircleIcon: React.FC<IconProps> = ({ className }) => <XCircle className={className} />;
export const UserIcon: React.FC<IconProps> = ({ className }) => <User className={className} />;
export const FlagIcon: React.FC<IconProps> = ({ className }) => <Flag className={className} />;
export const BookmarkIcon: React.FC<IconProps> = ({ className }) => <Bookmark className={className} />;
export const ChartIcon: React.FC<IconProps> = ({ className }) => <BarChart2 className={className} />;
export const AchievementIcon: React.FC<IconProps> = ({ className }) => <Award className={className} />;
export const SettingsIcon: React.FC<IconProps> = ({ className }) => <Settings className={className} />;
export const TwitterIcon: React.FC<IconProps> = ({ className }) => <Twitter className={className} />;
export const GitHubIcon: React.FC<IconProps> = ({ className }) => <Github className={className} />;
export const LinkedInIcon: React.FC<IconProps> = ({ className }) => <Linkedin className={className} />;
export const GlobeIcon: React.FC<IconProps> = ({ className }) => <Globe className={className} />;


export const GoogleIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.62,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
);