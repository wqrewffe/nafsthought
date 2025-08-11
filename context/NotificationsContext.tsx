import React, { createContext, useContext, useEffect, useState } from 'react';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Notification, NotificationPreferences } from '../types/notifications';
import { notificationsCollection } from '../firebase';
import { createNotification, markAsRead, deleteNotification, updatePreferences } from '../services/notificationService';

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  showNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  updateNotificationPreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const defaultPreferences: NotificationPreferences = {
  newPosts: true,
  comments: true,
  likes: true,
  adminNotices: true,
  mentions: true,
  seriesUpdates: true,
  trendingPosts: true,
  emailNotifications: true,
  pushNotifications: false,
};

export const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);

  useEffect(() => {
    console.log('NotificationsContext: User state changed', { userId: user?.uid });
    if (!user) {
      setNotifications([]);
      return;
    }

    // Subscribe to notifications for the current user
    const q = query(
      notificationsCollection,
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    console.log('NotificationsContext: Setting up notifications listener', { userId: user.uid });
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('NotificationsContext: Received snapshot update', {
        count: snapshot.docs.length,
        docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      });
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [user]);

  // Load user preferences
  useEffect(() => {
    if (user) {
      // Load preferences from Firebase
      // This would be implemented in your notification service
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const showNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    console.log('showNotification called with:', notification);
    if (!user) {
      console.log('No user logged in, cannot show notification');
      return;
    }
    try {
      const notificationToCreate = {
        ...notification,
        recipientId: user.uid,
        createdAt: new Date().toISOString(),
      };
      console.log('Creating notification:', notificationToCreate);
      await createNotification(notificationToCreate);
      console.log('Notification created successfully');
    } catch (error) {
      console.error('Error in showNotification:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    if (!user) return;
    try {
      await markAsRead(notificationId);
      // Update local state optimistically
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
      ));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Could add error handling UI here if needed
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!user) return;
    try {
      await deleteNotification(notificationId);
      // Update local state optimistically
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Failed to delete notification:', error);
      // Could add error handling UI here if needed
    }
  };

  const handleUpdatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) return;
    try {
      const updated = { ...preferences, ...newPreferences };
      await updatePreferences(user.uid, updated);
      setPreferences(updated);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      // Could add error handling UI here if needed
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    try {
      // Update local state immediately for better UX
      const notificationsToDelete = [...notifications];
      setNotifications([]);
      
      // Delete notifications in batches to avoid overwhelming the server
      const batchSize = 10;
      for (let i = 0; i < notificationsToDelete.length; i += batchSize) {
        const batch = notificationsToDelete.slice(i, i + batchSize);
        await Promise.all(batch.map(n => deleteNotification(n.id)));
      }
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      // Restore notifications if the operation failed
      setNotifications(notifications);
      // Could add error handling UI here if needed
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        preferences,
        showNotification,
        markNotificationAsRead,
        deleteNotification: handleDeleteNotification,
        updateNotificationPreferences: handleUpdatePreferences,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};
