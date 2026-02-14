import React, { useState, useEffect } from 'react';
import { User, UserRole, UserConfig, MqttConfig } from '../types';
import { DEFAULT_USER_CONFIG } from '../constants';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Settings, X, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabase';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    companyId: '',
    role: UserRole.CLIENT,
    isActive: true,
    config: { ...DEFAULT_USER_CONFIG },
    mqttConfig: {
      brokerUrl: 'wss://broker.hivemq.com:8000/mqtt',
      topics: {
        telemetry: 'afric-froid/client/data',
        command: 'afric-froid/client/command'
      }
    }
  });
  const [createCompanyId, setCreateCompanyId] = useState('');
  const [createPassword, setCreatePassword] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Error fetching profiles:', error);
    } else if (data) {
      const mappedUsers: User[] = data.map((d: any) => ({
        id: d.id,
        companyId: d.company_id,
        name: d.full_name,
        role: d.role as UserRole,
        isActive: d.is_active,
        config: d.config as UserConfig,
        mqttConfig: d.mqtt_config as MqttConfig,
        language: d.language,
        password: d.password
      }));
      setUsers(mappedUsers);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user, isActive: user.isActive });
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      companyId: '',
      role: UserRole.CLIENT,
      isActive: true,
      config: { ...DEFAULT_USER_CONFIG },
      mqttConfig: {
        brokerUrl: 'wss://broker.hivemq.com:8000/mqtt',
        topics: {
          telemetry: 'afric-froid/client/data',
          command: 'afric-froid/client/command'
        }
      }
    });
    setCreateCompanyId('');
    setCreatePassword('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      try {
        // Use Edge Function for update to handle password changes securely
        const { data, error: functionError } = await supabase.functions.invoke('update-user', {
          body: {
            userId: editingUser.id,
            companyId: formData.companyId,
            password: formData.password, // This will now update the real Auth password
            fullName: formData.name,
            role: formData.role,
            isActive: formData.isActive,
            config: formData.config,
            mqttConfig: formData.mqttConfig,
          },
        });

        if (functionError) {
          throw functionError;
        }
        if (data?.error) {
          throw new Error(data.error);
        }

        fetchUsers();
        setIsModalOpen(false);
      } catch (err: any) {
        alert('Error updating user: ' + err.message);
      }
    } else {
      // Create new user via Edge Function
      try {
        const { data: result, error: fnError } = await supabase.functions.invoke('create-user', {
          body: {
            companyId: createCompanyId,
            password: createPassword,
            fullName: formData.name,
            role: formData.role,
            config: formData.config,
            mqttConfig: formData.mqttConfig,
          },
        });

        if (fnError) {
          alert('Error creating user: ' + fnError.message);
        } else if (result?.error) {
          alert('Error creating user: ' + result.error);
        } else {
          fetchUsers();
          setIsModalOpen(false);
        }
      } catch (err: any) {
        alert('Error creating user: ' + err.message);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this profile? accessible data will be lost.')) return;

    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      fetchUsers();
    } else {
      alert('Error deleting user: ' + error.message);
    }
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
        <div className="flex items-center gap-3">
          <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or company ID..."
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-[#009fe3] outline-none text-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-[#009fe3] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#0080b8] transition-colors shadow-sm"
          >
            <Plus size={18} />
            Create User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">User</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Role</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Password</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Dashboard Config</th>
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">ID: {user.companyId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
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
                      <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                        {user.password || '••••••'}
                      </code>
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
                          onClick={() => window.location.hash = `#/admin/design/${user.id}`}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                          title="Design Dashboard"
                        >
                          <Settings size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                          title="Edit user"
                        >
                          <Edit2 size={16} />
                        </button>
                        {user.role !== UserRole.ADMIN && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-slate-300" />
                      <p>No users found matching "{searchQuery}"</p>
                    </div>
                  </td>
                </tr>
              )}
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
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600" title="Close modal">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                {/* Identification Section */}
                <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${editingUser ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company ID</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#009fe3] outline-none"
                      placeholder="AF-XXXX"
                      value={editingUser ? formData.companyId : createCompanyId}
                      onChange={e => editingUser
                        ? setFormData({ ...formData, companyId: e.target.value })
                        : setCreateCompanyId(e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#009fe3] outline-none"
                      placeholder="Min 6 characters"
                      value={editingUser ? formData.password : createPassword}
                      onChange={e => editingUser
                        ? setFormData({ ...formData, password: e.target.value })
                        : setCreatePassword(e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-frost-600 rounded border-slate-300 focus:ring-frost-500"
                      checked={formData.isActive}
                      onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    <span className="text-sm text-slate-700">Account Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-frost-600 rounded border-slate-300 focus:ring-frost-500"
                      checked={formData.role === UserRole.ADMIN}
                      onChange={e => setFormData({ ...formData, role: e.target.checked ? UserRole.ADMIN : UserRole.CLIENT })}
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

              {/* MQTT Configuration Section */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">IoT</span>
                  MQTT Connection Details
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Broker URL (WebSocket)</label>
                    <input
                      type="text"
                      placeholder="wss://broker.hivemq.com:8000/mqtt"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none text-sm font-mono"
                      value={formData.mqttConfig?.brokerUrl || ''}
                      onChange={e => setFormData({
                        ...formData,
                        mqttConfig: { ...formData.mqttConfig!, brokerUrl: e.target.value }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telemetry Topic</label>
                      <input
                        type="text"
                        placeholder="client/data"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none text-sm font-mono"
                        value={formData.mqttConfig?.topics.telemetry || ''}
                        onChange={e => setFormData({
                          ...formData,
                          mqttConfig: {
                            ...formData.mqttConfig!,
                            topics: { ...formData.mqttConfig!.topics, telemetry: e.target.value }
                          }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Command Topic</label>
                      <input
                        type="text"
                        placeholder="client/command"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none text-sm font-mono"
                        value={formData.mqttConfig?.topics.command || ''}
                        onChange={e => setFormData({
                          ...formData,
                          mqttConfig: {
                            ...formData.mqttConfig!,
                            topics: { ...formData.mqttConfig!.topics, command: e.target.value }
                          }
                        })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username (Optional)</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none text-sm"
                        placeholder="MQTT username"
                        value={formData.mqttConfig?.username || ''}
                        onChange={e => setFormData({
                          ...formData,
                          mqttConfig: { ...formData.mqttConfig!, username: e.target.value }
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password (Optional)</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none text-sm"
                        placeholder="MQTT password"
                        value={formData.mqttConfig?.password || ''}
                        onChange={e => setFormData({
                          ...formData,
                          mqttConfig: { ...formData.mqttConfig!, password: e.target.value }
                        })}
                      />
                    </div>
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
