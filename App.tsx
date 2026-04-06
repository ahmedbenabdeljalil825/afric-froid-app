import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import GlobalLoader from './components/GlobalLoader';

// Lazy load pages for better performance and to show transitions during network delay
const ClientDashboard = lazy(() => import('./pages/ClientDashboard'));
const ClientControls = lazy(() => import('./pages/ClientControls'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUserDesigner = lazy(() => import('./pages/AdminUserDesigner'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/Login'));
const AlarmHistoryPage = lazy(() => import('./pages/AlarmHistoryPage'));

// Corporate pages
const CorporatePages = import('./pages/CorporatePages');
const AboutPage = lazy(() => CorporatePages.then(m => ({ default: m.AboutPage })));
const TermsOfService = lazy(() => CorporatePages.then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => CorporatePages.then(m => ({ default: m.PrivacyPolicy })));

import { User, UserRole, UserConfig, MqttConfig } from './types';
import { mqttService } from './services/mqttService';
import { DEFAULT_USER_CONFIG } from './constants';
import { supabase } from './services/supabase';
import { ToastProvider } from './components/ToastProvider';
import { ConfirmProvider } from './components/ConfirmProvider';

const AppContent: React.FC<{ 
  currentUser: User | null, 
  loading: boolean, 
  handleLogout: () => void,
  handleUpdateUser: (user: User) => Promise<void>
}> = ({ currentUser, loading, handleLogout, handleUpdateUser }) => {
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#001a4d]">
        <svg viewBox="0 0 200 180" className="w-20 h-20 mb-6" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(0,0)">
            <path d="M30,170 L90,170 L120,40 L60,40 Z" fill="#002060" />
            <path d="M95,130 L155,130 L185,0 L125,0 Z" fill="#009fe3" />
            <text x="75" y="125" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="65" fill="white" textAnchor="middle">A</text>
            <text x="140" y="85" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="65" fill="white" textAnchor="middle">F</text>
          </g>
        </svg>
        <div className="w-8 h-8 border-[3px] border-[#009fe3]/30 border-t-[#009fe3] rounded-full animate-spin mb-4" />
        <p className="text-[#009fe3]/60 text-xs font-bold tracking-widest uppercase">Loading System...</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<GlobalLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/login"
            element={
              !currentUser ? (
                <PageTransition><Login /></PageTransition>
              ) : (
                <Navigate to={currentUser.role === UserRole.ADMIN ? "/admin" : "/dashboard"} replace />
              )
            }
          />

          {/* Protected Routes */}
          {currentUser ? (
            <Route element={<Layout user={currentUser} onLogout={handleLogout} />}>
              {/* Admin Routes */}
              {currentUser.role === UserRole.ADMIN && (
                <>
                  <Route path="/admin" element={<PageTransition><AdminDashboard /></PageTransition>} />
                  <Route path="/admin/design/:userId" element={<PageTransition><AdminUserDesigner /></PageTransition>} />
                </>
              )}

              {/* Client Routes */}
              {currentUser.role === UserRole.CLIENT && (
                <>
                  <Route path="/dashboard" element={<PageTransition><ClientDashboard user={currentUser} /></PageTransition>} />
                  <Route path="/controls" element={<PageTransition><ClientControls user={currentUser} /></PageTransition>} />
                  <Route path="/alarms" element={<PageTransition><AlarmHistoryPage user={currentUser} /></PageTransition>} />
                </>
              )}

              {/* Shared Routes */}
              <Route path="/settings" element={<PageTransition><Settings user={currentUser} onUpdateUser={handleUpdateUser} /></PageTransition>} />
              <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
              <Route path="/terms" element={<PageTransition><TermsOfService /></PageTransition>} />
              <Route path="/privacy" element={<PageTransition><PrivacyPolicy /></PageTransition>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to={currentUser.role === UserRole.ADMIN ? "/admin" : "/dashboard"} replace />} />
            </Route>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setLoading(false);
        mqttService.disconnect();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, company_id, full_name, role, is_active, mqtt_config, language')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        if (!data.is_active) {
          // Hard-stop inactive accounts even if Auth login succeeds.
          await supabase.auth.signOut();
          setCurrentUser(null);
          return;
        }

        const user: User = {
          id: data.id,
          companyId: data.company_id,
          name: data.full_name,
          role: data.role as UserRole,
          isActive: data.is_active,
          mqttConfig: data.mqtt_config as MqttConfig,
          language: (() => {
            const stored = localStorage.getItem('AFRIC_FROID_LANG');
            if (stored === 'en' || stored === 'fr') return stored;
            return (data.language as 'en' | 'fr') || 'en';
          })()
        };
        
        const localLang = localStorage.getItem('AFRIC_FROID_LANG');
        if (localLang && localLang !== data.language) {
          await supabase.from('profiles').update({ language: localLang }).eq('id', userId);
        } else if (!localLang && data.language) {
          localStorage.setItem('AFRIC_FROID_LANG', data.language);
        }

        setCurrentUser(user);

        if (user.mqttConfig) {
          mqttService.connect(user.mqttConfig);
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: updatedUser.name,
          language: updatedUser.language
        })
        .eq('id', updatedUser.id);

      if (error) {
        console.error('Error updating profile:', error);
      } else {
        setCurrentUser(updatedUser);
      }
    } catch (err) {
      console.error('Unexpected error updating profile:', err);
    }
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <HashRouter>
          <AppContent
            currentUser={currentUser}
            loading={loading}
            handleLogout={handleLogout}
            handleUpdateUser={handleUpdateUser}
          />
        </HashRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
};

export default App;
