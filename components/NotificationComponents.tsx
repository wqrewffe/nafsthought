import React, { useState } from 'react';
import { Notification } from '../types/notifications';
import { useNotifications } from '../context/NotificationsContext';
import { formatDistanceToNow } from 'date-fns';

// Notification Item Component
const NotificationItem: React.FC<{
  notification: Notification;
  onRead: () => void;
  onDelete: () => void;
}> = ({ notification, onRead, onDelete }) => {
  const { type, title, message, createdAt, readAt } = notification;

  return (
    <div
      className={`p-4 mb-2 rounded-lg transition-all duration-200 ${
        readAt ? 'bg-white dark:bg-slate-800' : 'bg-blue-50 dark:bg-slate-700'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 dark:text-white">{title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-300">{message}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {!readAt && (
            <button
              onClick={onRead}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Mark as read
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Notification Center Component
export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    markNotificationAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={toggleOpen}
        className="relative p-2 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Notifications
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-sm text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="p-4 space-y-4">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={() => markNotificationAsRead(notification.id)}
                    onDelete={() => deleteNotification(notification.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Notification Preferences Component
export const NotificationPreferences: React.FC = () => {
  const { preferences, updateNotificationPreferences } = useNotifications();

  const togglePreference = (key: keyof typeof preferences) => {
    updateNotificationPreferences({ [key]: !preferences[key] });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
        Notification Preferences
      </h3>
      <div className="space-y-2">
        {Object.entries(preferences).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg"
          >
            <span className="text-slate-700 dark:text-slate-300">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={value}
                onChange={() => togglePreference(key as keyof typeof preferences)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};
