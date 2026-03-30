import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ClientDashboard from './pages/ClientDashboard';
import ClientControls from './pages/ClientControls';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserDesigner from './pages/AdminUserDesigner';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { AboutPage, TermsOfService, PrivacyPolicy } from './pages/CorporatePages';
import AlarmHistoryPage from './pages/AlarmHistoryPage';
import { User, UserRole, UserConfig, MqttConfig } from './types';
import { mqttService } from './services/mqttService';
import { DEFAULT_USER_CONFIG } from './constants';
import { supabase } from './services/supabase';

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
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
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
        
        // Always sync TO profile if localStorage is different (to keep DB updated)
        const localLang = localStorage.getItem('AFRIC_FROID_LANG');
        if (localLang && localLang !== data.language) {
          await supabase.from('profiles').update({ language: localLang }).eq('id', userId);
        } else if (!localLang && data.language) {
          // If fresh device, take from profile
          localStorage.setItem('AFRIC_FROID_LANG', data.language);
        }

        setCurrentUser(user);

        // Connect MQTT if config exists
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

  // Note: handleCreateUser, handleUpdateUser, handleDeleteUser 
  // currently only update backend state. We need to pass these to AdminDashboard
  // but for now AdminDashboard will handle its own data fetching/updating directly from Supabase.
  // We can remove the state-lifting of `users` array since AdminDashboard should fetch its own list.

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
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={
            !currentUser ? (
              <Login />
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
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/design/:userId" element={<AdminUserDesigner />} />
              </>
            )}

            {/* Client Routes */}
            {currentUser.role === UserRole.CLIENT && (
              <>
                <Route path="/dashboard" element={<ClientDashboard user={currentUser} />} />
                <Route path="/controls" element={<ClientControls user={currentUser} />} />
                <Route path="/alarms" element={<AlarmHistoryPage user={currentUser} />} />
              </>
            )}

            {/* Shared Routes */}
            <Route path="/settings" element={<Settings user={currentUser} onUpdateUser={handleUpdateUser} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to={currentUser.role === UserRole.ADMIN ? "/admin" : "/dashboard"} replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </HashRouter>
  );
};

export default App;
