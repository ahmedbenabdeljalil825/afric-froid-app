import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ClientDashboard from './pages/ClientDashboard';
import ClientControls from './pages/ClientControls';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { User, UserRole, UserConfig, MqttConfig } from './types';
import { mqttService } from './services/mqttService';
import { DEFAULT_USER_CONFIG } from './constants';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
          username: data.username,
          name: data.full_name,
          role: data.role as UserRole,
          isActive: data.is_active,
          config: data.config as UserConfig, // Type assertion might be needed if JSON comes back loosely typed
          mqttConfig: data.mqtt_config as MqttConfig,
          language: data.language
        };
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

  // Note: handleCreateUser, handleUpdateUser, handleDeleteUser 
  // currently only update backend state. We need to pass these to AdminDashboard
  // but for now AdminDashboard will handle its own data fetching/updating directly from Supabase.
  // We can remove the state-lifting of `users` array since AdminDashboard should fetch its own list.

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Loading...</div>;
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
              <Route path="/admin" element={
                <AdminDashboard />
              } />
            )}

            {/* Client Routes */}
            {currentUser.role === UserRole.CLIENT && (
              <>
                <Route path="/dashboard" element={<ClientDashboard user={currentUser} />} />
                <Route path="/controls" element={<ClientControls user={currentUser} />} />
              </>
            )}

            {/* Shared Routes */}
            <Route path="/settings" element={<Settings user={currentUser} onUpdateUser={() => { }} />} />

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
