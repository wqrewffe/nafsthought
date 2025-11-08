
import React, { Suspense } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import './styles/interactive.css';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { SettingsProvider } from './hooks/useSettings';
import { CongratulationsProvider } from './hooks/CongratulationsProvider';
import { ToolAccessProvider } from './hooks/useToolAccess';
import Layout from './components/Layout';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import FastLoadingSpinner from './components/FastLoadingSpinner';

// Lazy load all main pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const SignUpPage = React.lazy(() => import('./pages/SignUpPage'));
const ToolPage = React.lazy(() => import('./pages/ToolPage'));
const CompetitionPage = React.lazy(() => import('./components/CompetitionPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
import { Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import { Toaster } from 'react-hot-toast';
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const TrainerApp = React.lazy(() => import('./TRAINER/trainerExport'));
const DevToolboxApp = React.lazy(() => import('./dev-toolbox/App'));
const ToolsShowcaseApp = React.lazy(() => import('./ai-tools-showcase/App'));
const VerifyEmailPage = React.lazy(() => import('./pages/VerifyEmailPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/admin/AdminDashboardPage'));
const UserHistoryPage = React.lazy(() => import('./pages/admin/UserHistoryPage'));
const ModifyPage = React.lazy(() => import('./pages/admin/ModifyPage'));
const BuyCheckoutPage = React.lazy(() => import('./pages/BuyCheckoutPage'));
const PaymentVerificationPage = React.lazy(() => import('./pages/admin/PaymentVerificationPage'));
const ChangeProductPricePage = React.lazy(() => import('./pages/admin/ChangeProductPricePage'));
const TodoListPage = React.lazy(() => import('./pages/TodoListPage'));
const NoteTakingPage = React.lazy(() => import('./pages/NoteTakingPage'));
const ReferralPage = React.lazy(() => import('./pages/ReferralPage'));
const LeaderboardPage = React.lazy(() => import('./pages/LeaderboardPage'));
const BadgesPage = React.lazy(() => import('./pages/BadgesPage'));
const PoliciesPage = React.lazy(() => import('./pages/PoliciesPage'));
const SupportPage = React.lazy(() => import('./pages/SupportPage'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const HelpChatPage = React.lazy(() => import('./pages/HelpChatPage'));
const SharedOutputPage = React.lazy(() => import('./pages/SharedOutputPage'));
import CongratulationsModal from './components/CongratulationsModal';

// Wrapper to extract :mode param and pass it to TrainerApp
const TrainerWrapper: React.FC = () => {
  const params = ReactRouterDOM.useParams();
  const raw = params.mode ?? null;

  // map kebab-case route slug to trainer AppMode camelCase string
  const slugToMode = (s: string | null) => {
    if (!s) return null;
    const map: Record<string, string> = {
      'select': 'select',
      'lights-out': 'lightsOut',
      'grid-reflex': 'gridReflex',
      'precision-point': 'precisionPoint',
      'sequence': 'sequence',
      'color-match': 'colorMatch',
      'peripheral-vision': 'peripheralVision',
      'dodge-and-click': 'dodgeAndClick',
      'auditory-reaction': 'auditoryReaction',
      'cognitive-shift': 'cognitiveShift',
      'target-tracking': 'targetTracking',
      'digit-span': 'digitSpan',
      'visual-search': 'visualSearch'
    };
    const lower = s.toLowerCase();
    return map[lower] ?? null;
  };

  const mode = slugToMode(raw as string | null);

  // TrainerApp is lazy-loaded, type assertions used to avoid TSX prop typing issues
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return <TrainerApp initialMode={mode} />;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SettingsProvider>
          <CongratulationsProvider>
            <ToolAccessProvider>
              <ReactRouterDOM.HashRouter>
                {/* App chrome that should always be visible */}
                <Navbar />
                <ReactRouterDOM.Routes>
                  {/* Trainer route rendered outside Layout so it displays full-screen without navbar/footer */}
                  <ReactRouterDOM.Route
                    path="/trainer/:mode?"
                    element={
                      <React.Suspense fallback={<div className="p-8 text-center">Loading Trainer...</div>}>
                        <TrainerWrapper />
                      </React.Suspense>
                    }
                  />

                  {/* Dev-toolbox rendered outside Layout to allow it to be full-screen (no main header/footer) */}
                  <ReactRouterDOM.Route
                    path="/toolbox/*"
                    element={
                      <React.Suspense fallback={<div className="p-8 text-center">Loading Toolbox...</div>}>
                        {/* @ts-ignore */}
                        <DevToolboxApp />
                      </React.Suspense>
                    }
                  />

                  {/* AI Tools Showcase rendered outside Layout so it can manage its own hash routing and full-screen UI */}
                  <ReactRouterDOM.Route
                    path="/showcase/*"
                    element={
                      <React.Suspense fallback={<div className="p-8 text-center">Loading Tools Showcase...</div>}>
                        {/* @ts-ignore */}
                        <ToolsShowcaseApp />
                      </React.Suspense>
                    }
                  />

                  {/* All other routes render inside the main Layout */}
                  <ReactRouterDOM.Route
                    path="/*"
                    element={
                      <Layout>
                        <React.Suspense fallback={<FastLoadingSpinner />}>
                          <ReactRouterDOM.Routes>
                          {/* Public Routes */}
                          <ReactRouterDOM.Route path="/" element={<HomePage />} />
                          <ReactRouterDOM.Route path="/login" element={<LoginPage />} />
                          <ReactRouterDOM.Route path="/signup" element={<SignUpPage />} />
                          <ReactRouterDOM.Route path="/forgot-password" element={<ForgotPasswordPage />} />
                          <ReactRouterDOM.Route path="/verify-email" element={<VerifyEmailPage />} />

                          {/* Private User Routes */}
                          <ReactRouterDOM.Route 
                            path="/tool/:toolId" 
                            element={<ToolPage />} 
                          />
                          <ReactRouterDOM.Route 
                            path="/competition/:id"
                            element={<PrivateRoute><CompetitionPage /></PrivateRoute>}
                          />
                          {/* Route for own profile */}
                          <ReactRouterDOM.Route 
                            path="/profile" 
                            element={<PrivateRoute><ProfilePage /></PrivateRoute>} 
                          />
                          {/* Route for viewing any user's profile */}
                          <ReactRouterDOM.Route 
                            path="/profile/:username" 
                            element={<ProfilePage />} 
                          />
                          <ReactRouterDOM.Route 
                            path="/settings" 
                            element={<PrivateRoute><SettingsPage /></PrivateRoute>} 
                          />
                          <ReactRouterDOM.Route 
                            path="/referral" 
                            element={<PrivateRoute><ReferralPage /></PrivateRoute>} 
                          />
                          <ReactRouterDOM.Route 
                            path="/buy/:pack"
                            element={<PrivateRoute><BuyCheckoutPage /></PrivateRoute>}
                          />
                          <ReactRouterDOM.Route 
                            path="/todo" 
                            element={<PrivateRoute><TodoListPage /></PrivateRoute>} 
                          />
                          <ReactRouterDOM.Route 
                            path="/notes" 
                            element={<PrivateRoute><NoteTakingPage /></PrivateRoute>} 
                          />
                          <ReactRouterDOM.Route 
                            path="/leaderboard" 
                            element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} 
                          />
                          <ReactRouterDOM.Route 
                            path="/badges" 
                            element={<PrivateRoute><BadgesPage /></PrivateRoute>} 
                          />
                          <ReactRouterDOM.Route 
                            path="/policies" 
                            element={<PoliciesPage />} 
                          />
                          <ReactRouterDOM.Route 
                            path="/support" 
                            element={<SupportPage />} 
                          />
                          <ReactRouterDOM.Route 
                            path="/contact" 
                            element={<ContactPage />} 
                          />
                          <ReactRouterDOM.Route 
                            path="/helpchat" 
                            element={<HelpChatPage />} 
                          />
                          <ReactRouterDOM.Route 
                            path="/shared/:id" 
                            element={<SharedOutputPage />} 
                          />
                          {/* /toolbox is served by the full-screen dev-toolbox route defined above */}
                          
                          {/* Admin Routes */}
                          <ReactRouterDOM.Route 
                            path="/admin" 
                            element={<AdminRoute><AdminDashboardPage /></AdminRoute>}
                          />
                          <ReactRouterDOM.Route
                            path="/modify"
                            element={<AdminRoute><ModifyPage /></AdminRoute>}
                          />
                          <ReactRouterDOM.Route 
                            path="/admin/user/:userId" 
                            element={<AdminRoute><UserHistoryPage /></AdminRoute>}
                          />
                          <ReactRouterDOM.Route 
                            path="/admin/purchase-requests"
                            element={<AdminRoute><PaymentVerificationPage /></AdminRoute>}
                          />
                          <ReactRouterDOM.Route
                            path="/admin/change-product-price"
                            element={<AdminRoute><ChangeProductPricePage /></AdminRoute>}
                          />
                          </ReactRouterDOM.Routes>
                        </React.Suspense>
                      </Layout>
                    }
                  />
                </ReactRouterDOM.Routes>
                {/* Global Toaster for react-hot-toast */}
                <Toaster position="top-right" />
                {/* Always-visible footer */}
                <Footer />
                {/* CongratulationsModal is rendered by the CongratulationsProvider */}
              </ReactRouterDOM.HashRouter>
            </ToolAccessProvider>
          </CongratulationsProvider>
        </SettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
