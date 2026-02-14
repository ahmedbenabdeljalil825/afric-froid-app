import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ClientDashboard from './pages/ClientDashboard';
import ClientControls from './pages/ClientControls';
import AdminDashboard from './pages/AdminDashboard';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { User, UserRole } from './types';
import { mqttService } from './services/mockMqttService';
import { DEFAULT_USER_CONFIG } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Mock Database of Users
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Admin User',
      username: 'admin',
      role: UserRole.ADMIN,
      isActive: true,
      config: DEFAULT_USER_CONFIG,
      language: 'en'
    },
    {
      id: '2',
      name: 'Client Demo',
      username: 'client',
      role: UserRole.CLIENT,
      isActive: true,
      config: DEFAULT_USER_CONFIG,
      language: 'en'
    }
  ]);

  // Init MQTT on login
  useEffect(() => {
    if (currentUser) {
      mqttService.connect();
    } else {
      mqttService.disconnect();
    }
  }, [currentUser]);

  const handleLogin = (username: string) => {
    const user = users.find(u => u.username === username);
    if (user && user.isActive) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const handleCreateUser = (newUser: User) => {
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    // If Admin updates themselves or if the client updates their own settings
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={
            !currentUser ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to={currentUser.role === UserRole.ADMIN ? "/admin" : "/dashboard"} replace />
            )
          } 
        />
        
        {/* Protected Routes */}
        {currentUser ? (
          <Route element={<Layout user={currentUser} onLogout={handleLogout}><div /></Layout>}>
            
            {/* Admin Routes */}
            {currentUser.role === UserRole.ADMIN && (
              <Route path="/admin" element={
                <AdminDashboard 
                  users={users} 
                  onCreateUser={handleCreateUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
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
            <Route path="/settings" element={<Settings user={currentUser} onUpdateUser={handleUpdateUser} />} />

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
