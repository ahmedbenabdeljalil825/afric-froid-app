import React, { useState } from 'react';
import { User, UserRole, UserConfig } from '../types';
import { DEFAULT_USER_CONFIG } from '../constants';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Settings, X } from 'lucide-react';

interface AdminDashboardProps {
  users: User[];
  onUpdateUser: (updatedUser: User) => void;
  onCreateUser: (newUser: User) => void;
  onDeleteUser: (userId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, onUpdateUser, onCreateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    username: '',
    role: UserRole.CLIENT,
    isActive: true,
    config: { ...DEFAULT_USER_CONFIG }
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      role: UserRole.CLIENT,
      isActive: true,
      config: { ...DEFAULT_USER_CONFIG }
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser({ ...editingUser, ...formData } as User);
    } else {
      onCreateUser({ 
        ...formData, 
        id: Math.random().toString(36).substr(2, 9),
        language: 'en'
      } as User);
    }
    setIsModalOpen(false);
  };

  const toggleConfig = (key: keyof UserConfig) => {
    if (!formData.config) return;
    setFormData({
      ...formData,
      config: {
        ...formData.config,
        [key]: !formData.config[key]
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="text-slate-500">Manage client access and dashboard configurations</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-frost-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-frost-700 transition-colors shadow-lg shadow-frost-500/30"
        >
          <Plus size={18} />
          Add Client
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">User</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Role</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Dashboard Config</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {user.isActive ? (
                         <CheckCircle size={16} className="text-emerald-500" />
                       ) : (
                         <XCircle size={16} className="text-slate-400" />
                       )}
                       <span className={`text-sm ${user.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                         {user.isActive ? 'Active' : 'Inactive'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {user.config.showTemperatureChart && <span className="w-2 h-2 rounded-full bg-cyan-400" title="Temp Chart"></span>}
                      {user.config.showPressureChart && <span className="w-2 h-2 rounded-full bg-indigo-400" title="Pressure Chart"></span>}
                      {user.config.allowSetpointControl && <span className="w-2 h-2 rounded-full bg-emerald-400" title="Control"></span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      {user.role !== UserRole.ADMIN && (
                         <button 
                          onClick={() => onDeleteUser(user.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-frost-600 rounded border-slate-300 focus:ring-frost-500"
                      checked={formData.isActive}
                      onChange={e => setFormData({...formData, isActive: e.target.checked})}
                    />
                    <span className="text-sm text-slate-700">Account Active</span>
                  </label>
                   <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 text-frost-600 rounded border-slate-300 focus:ring-frost-500"
                      checked={formData.role === UserRole.ADMIN}
                      onChange={e => setFormData({...formData, role: e.target.checked ? UserRole.ADMIN : UserRole.CLIENT})}
                    />
                    <span className="text-sm text-slate-700">Admin Privileges</span>
                  </label>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Settings size={16} />
                    Dashboard Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'showTemperatureChart', label: 'Show Temp Chart' },
                      { key: 'showPressureChart', label: 'Show Pressure Chart' },
                      { key: 'showPowerChart', label: 'Show Power Chart' },
                      { key: 'allowSetpointControl', label: 'Allow Setpoint' },
                      { key: 'allowPowerControl', label: 'Allow Power Ctrl' },
                    ].map((item) => (
                       <label key={item.key} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-slate-50">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 text-frost-600 rounded border-slate-300 focus:ring-frost-500"
                          checked={!!formData.config?.[item.key as keyof UserConfig]}
                          onChange={() => toggleConfig(item.key as keyof UserConfig)}
                        />
                        <span className="text-sm text-slate-600">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-white bg-slate-900 hover:bg-slate-800 rounded-xl font-medium transition-colors"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
