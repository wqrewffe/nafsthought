import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { User as UserType } from '../types';

// Configurable constants
const DAYS_ACTIVE = 7;
const DAYS_AT_RISK = 30;
const DAYS_MEDIUM_RISK = 14;
const LOW_ENGAGEMENT_THRESHOLD = 30;
const HIGH_RISK_THRESHOLD = 10;

interface UserEngagement {
  userId: string;
  username: string;
  lastActive: string;
  totalPosts: number;
  totalComments: number;
  engagementScore: number;
  status: 'active' | 'inactive' | 'at_risk';
  retentionRisk: 'low' | 'medium' | 'high';
}

interface UserStats {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  averageEngagement: number;
  retentionRate: number;
}

// Helper function to get days since a date
const getDaysSince = (date: Date): number => {
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Helper function to check if a user was active within a number of days
const isActiveWithinDays = (isoDate: string, days: number): boolean => {
  return getDaysSince(new Date(isoDate)) <= days;
};

// Main component
export const UserEngagementManager: React.FC = () => {
  const [userEngagements, setUserEngagements] = useState<UserEngagement[]>([]);
  const [loading, setLoading] = useState(true);

  // This useEffect is responsible for fetching and processing user data in real-time
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('lastActive', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const engagements: UserEngagement[] = snapshot.docs.map((userDoc) => {
        const userData = userDoc.data() as UserType;
        const lastActiveDate = new Date(userData.lastActive);
        const totalPosts = userData.posts?.length || 0;
        const totalComments = userData.comments?.length || 0;
        const engagementScore = calculateEngagementScore(userData);

        return {
          userId: userDoc.id,
          username: userData.username || 'Anonymous',
          lastActive: lastActiveDate.toISOString(),
          totalPosts,
          totalComments,
          engagementScore,
          status: determineUserStatus(lastActiveDate),
          retentionRisk: calculateRetentionRisk(userData),
        };
      });

      setUserEngagements(engagements);
      setLoading(false);
    });

    // Cleanup function for onSnapshot listener
    return () => unsubscribe();
  }, []);

  // Memoized stats calculation for performance
  const stats = useMemo<UserStats | null>(() => {
    if (!userEngagements.length) return null;

    const activeLast30 = userEngagements.filter((u) => isActiveWithinDays(u.lastActive, DAYS_AT_RISK)).length;
    const activeLast7 = userEngagements.filter((u) => isActiveWithinDays(u.lastActive, DAYS_ACTIVE)).length;
    const totalScore = userEngagements.reduce((sum, u) => sum + u.engagementScore, 0);
    const totalUsers = userEngagements.length;

    const retentionRate = totalUsers > 0 ? (activeLast30 / totalUsers) * 100 : 0;

    return {
      dailyActiveUsers: activeLast7,
      monthlyActiveUsers: activeLast30,
      averageEngagement: totalUsers > 0 ? totalScore / totalUsers : 0,
      retentionRate: retentionRate,
    };
  }, [userEngagements]);

  // Engagement score calculation function
  const calculateEngagementScore = (user: UserType): number => {
    const postWeight = 5;
    const commentWeight = 2;
    const loginWeight = 1;
    // The issue is here: UserType needs to have these properties defined.
    return (
      (user.posts?.length || 0) * postWeight +
      (user.comments?.length || 0) * commentWeight +
      (user.loginCount || 0) * loginWeight
    );
  };

  // User status determination function
  const determineUserStatus = (lastActive: Date): 'active' | 'inactive' | 'at_risk' => {
    const daysSince = getDaysSince(lastActive);
    if (daysSince <= DAYS_ACTIVE) return 'active';
    if (daysSince <= DAYS_AT_RISK) return 'at_risk';
    return 'inactive';
  };

  // Retention risk calculation function
  const calculateRetentionRisk = (user: UserType): 'low' | 'medium' | 'high' => {
    const daysSince = getDaysSince(new Date(user.lastActive));
    const score = calculateEngagementScore(user);
    if (daysSince > DAYS_AT_RISK || score < HIGH_RISK_THRESHOLD) return 'high';
    if (daysSince > DAYS_MEDIUM_RISK || score < LOW_ENGAGEMENT_THRESHOLD) return 'medium';
    return 'low';
  };

  // UI helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    const date = new Date(isoDate);
    const diffDays = getDaysSince(date);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Loading state UI
  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading user data...</div>;
  }

  // Main component render
  return (
    <div className="space-y-6 p-4 md:p-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">User Engagement Dashboard</h2>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Daily Active Users (7-day)', value: stats.dailyActiveUsers },
            { label: 'Monthly Active Users (30-day)', value: stats.monthlyActiveUsers },
            { label: 'Avg. Engagement Score', value: stats.averageEngagement.toFixed(1) },
            { label: 'Retention Rate (30-day)', value: `${stats.retentionRate.toFixed(1)}%` },
          ].map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{item.label}</h3>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* User Engagement Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {['User', 'Last Active', 'Status', 'Posts', 'Comments', 'Engagement Score', 'Retention Risk']
                .map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {userEngagements.map((user) => (
              <tr key={user.userId} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-200">
                  {user.username}
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400"
                  title={new Date(user.lastActive).toLocaleString()}
                >
                  {formatTimeAgo(user.lastActive)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                    {user.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {user.totalPosts}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {user.totalComments}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                  {user.engagementScore}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.retentionRisk === 'high'
                        ? 'bg-red-100 text-red-800'
                        : user.retentionRisk === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {user.retentionRisk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// **FIX:** The User interface needs to be updated to include the properties being used in the engagement score calculation.
export interface User {
  username: string;
  lastActive: string;
  posts?: any[];
  comments?: any[];
  loginCount?: number;
}