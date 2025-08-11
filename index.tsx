import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);