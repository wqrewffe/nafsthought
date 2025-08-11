import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Notification, NotificationPreferences } from '../types/notifications';

// Collection reference
export const notificationsCollection = collection(db, 'notifications');
export const preferencesCollection = collection(db, 'notificationPreferences');

// Create a new notification
export const createNotification = async (notification: Omit<Notification, 'id'>) => {
  try {
    console.log('Creating notification:', notification);
    const docRef = await addDoc(notificationsCollection, notification);
    console.log('Notification created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    console.error('Error details:', JSON.stringify(error));
    throw error;
  }
};

// Mark a notification as read
export const markAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(notificationsCollection, notificationId);
    await updateDoc(notificationRef, {
      readAt: new Date().toISOString(),
    });
    console.log('Notification marked as read:', notificationId);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    // Check if this is a "not-found" error
    if ((error as any).code === 'not-found') {
      console.error('Notification not found:', notificationId);
    }
    throw error;
  }
};

// Delete a notification
export const deleteNotification = async (notificationId: string) => {
  try {
    const notificationRef = doc(notificationsCollection, notificationId);
    await deleteDoc(notificationRef);
    console.log('Notification deleted:', notificationId);
  } catch (error) {
    console.error('Error deleting notification:', error);
    // Check if this is a "not-found" error
    if ((error as any).code === 'not-found') {
      console.error('Notification not found:', notificationId);
      // Don't throw error if notification doesn't exist
      return;
    }
    throw error;
  }
};

// Update notification preferences
export const updatePreferences = async (userId: string, preferences: NotificationPreferences) => {
  try {
    const prefRef = doc(preferencesCollection, userId);
    
    // Convert preferences to a plain object with dot notation
    const prefUpdate = Object.entries(preferences).reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as { [key: string]: any });
    
    await updateDoc(prefRef, prefUpdate);
  } catch (error) {
    // If the document doesn't exist, create it
    if ((error as any).code === 'not-found') {
      const prefRef = doc(preferencesCollection, userId);
      await setDoc(prefRef, preferences);
    } else {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }
};

// Helper function to create various types of notifications
export const createSystemNotification = async (
  recipientId: string,
  type: 'NEW_POST' | 'ADMIN_NOTICE' | 'TRENDING_POST',
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  return createNotification({
    type,
    title,
    message,
    recipientId,
    createdAt: new Date().toISOString(),
    data,
  });
};

export const createInteractionNotification = async (
  recipientId: string,
  senderId: string,
  type: 'NEW_COMMENT' | 'COMMENT_REPLY' | 'POST_LIKE' | 'MENTION',
  title: string,
  message: string,
  data?: Record<string, any>
) => {
  return createNotification({
    type,
    title,
    message,
    recipientId,
    senderId,
    createdAt: new Date().toISOString(),
    data,
  });
};

// Function to handle push notifications (if enabled)
export const sendPushNotification = async (
  userId: string,
  title: string,
  message: string
) => {
  // Implementation would depend on your push notification service
  // Could use Firebase Cloud Messaging, web push notifications, etc.
  console.log('Push notification sent:', { userId, title, message });
};
