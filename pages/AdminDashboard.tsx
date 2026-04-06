import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole, UserConfig, MqttConfig } from '../types';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Settings, X, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import mqtt from 'mqtt';
import { useToast } from '../components/ToastProvider';
import { useConfirm } from '../components/ConfirmProvider';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
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
    mqttConfig: {
      brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
      topics: {
        telemetry: 'afric-froid/client/data',
        command: 'afric-froid/client/command'
      }
    }
  });
  const [createCompanyId, setCreateCompanyId] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [editAuthPassword, setEditAuthPassword] = useState('');
  const [mqttTestStatus, setMqttTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [mqttTestMessage, setMqttTestMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, company_id, full_name, role, is_active, config, mqtt_config, language, password');

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

  useEffect(() => {
    // Prevent background page scrolling while the modal is open.
    const previousOverflow = document.body.style.overflow;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflow || '';
    }

    return () => {
      document.body.style.overflow = previousOverflow || '';
    };
  }, [isModalOpen]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.companyId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user, isActive: user.isActive });
    setEditAuthPassword('');
    setMqttTestStatus('idle');
    setMqttTestMessage('');
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      companyId: '',
      role: UserRole.CLIENT,
      isActive: true,
      mqttConfig: {
        brokerUrl: 'wss://broker.emqx.io:8084/mqtt',
        topics: {
          telemetry: 'afric-froid/client/data',
          command: 'afric-froid/client/command'
        }
      }
    });
    setCreateCompanyId('');
    setCreatePassword('');
    setEditAuthPassword('');
    setMqttTestStatus('idle');
    setMqttTestMessage('');
    setIsModalOpen(true);
  };

  const handleTestMqttConnection = () => {
    const cfg = formData.mqttConfig;
    const brokerUrl = cfg?.brokerUrl?.trim();

    if (!brokerUrl) {
      setMqttTestStatus('error');
      setMqttTestMessage('Broker URL is required before testing.');
      return;
    }

    setMqttTestStatus('testing');
    setMqttTestMessage('Testing MQTT connection...');

    const client = mqtt.connect(brokerUrl, {
      username: cfg?.username?.trim() || undefined,
      password: cfg?.password?.trim() || undefined,
      connectTimeout: 10_000,
      reconnectPeriod: 0,
      protocolVersion: 4,
      clean: true,
      clientId: `af_test_${Math.random().toString(16).slice(2, 10)}`
    });

    let settled = false;
    const finish = (status: 'success' | 'error', message: string) => {
      if (settled) return;
      settled = true;
      setMqttTestStatus(status);
      setMqttTestMessage(message);
      clearTimeout(timeout);
      try {
        client.removeAllListeners();
        client.end(true);
      } catch {
        // ignore cleanup errors
      }
    };

    const timeout = setTimeout(() => {
      finish('error', 'Connection timed out after 10 seconds.');
    }, 10_500);

    client.on('connect', () => {
      finish('success', 'Connected successfully. MQTT settings look valid.');
    });

    client.on('error', (err: Error) => {
      finish('error', err?.message ? `Connection failed: ${err.message}` : 'Connection failed.');
    });

    client.on('close', () => {
      if (!settled) {
        finish('error', 'Connection closed before MQTT session was established.');
      }
    });
  };

  useEffect(() => {
    if (mqttTestStatus !== 'idle') {
      setMqttTestStatus('idle');
      setMqttTestMessage('');
    }
    // Reset test result when any MQTT input changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.mqttConfig?.brokerUrl,
    formData.mqttConfig?.username,
    formData.mqttConfig?.password,
    formData.mqttConfig?.topics?.telemetry,
    formData.mqttConfig?.topics?.command
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      const trimmedNewPassword = editAuthPassword.trim();
      const trimmedCompanyId = (formData.companyId || '').trim();
      const trimmedName = (formData.name || '').trim();

      if (!trimmedCompanyId || !trimmedName) {
        toast({ kind: 'error', title: 'Update failed', message: 'Company ID and full name are required.' });
        return;
      }

      if (trimmedNewPassword && trimmedNewPassword.length < 6) {
        toast({ kind: 'error', title: 'Update failed', message: 'Password must be at least 6 characters.' });
        return;
      }

      const profilePatch: any = {
        company_id: trimmedCompanyId,
        full_name: trimmedName,
        role: formData.role,
        is_active: formData.isActive,
        mqtt_config: formData.mqttConfig,
      };

      const companyIdChanged = trimmedCompanyId !== editingUser.companyId;
      // Always prefer the Edge Function for admin edits so updates don't depend on client-side RLS.
      const needsEdgeFunction = true;

      // Always use Edge Function for admin edits so updates don't depend on client-side RLS.

      try {
        // Use Edge Function for update to handle password changes securely
        const updatePayload: any = {
          userId: editingUser.id,
          companyId: trimmedCompanyId,
          fullName: trimmedName,
          role: formData.role,
          isActive: formData.isActive,
          mqttConfig: formData.mqttConfig,
        };
        if (trimmedNewPassword) updatePayload.password = trimmedNewPassword;

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;

        const { data, error: functionError } = await supabase.functions.invoke('update-user', {
          body: {
            ...updatePayload,
          },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });

        if (functionError) {
          throw functionError;
        }
        if (data?.error) {
          throw new Error(data.error);
        }

        fetchUsers();
        setIsModalOpen(false);
        toast({ kind: 'success', title: 'Updated', message: 'User updated successfully.' });
      } catch (err: any) {
        console.error('Edge function update-user failed. Falling back to profile update.', err);
        if (trimmedNewPassword) {
          // Keep legacy profile password column in sync if admin entered a new value.
          profilePatch.password = trimmedNewPassword;
        }

        const { data: fallbackRows, error: profileError } = await supabase
          .from('profiles')
          .update(profilePatch)
          .eq('id', editingUser.id)
          .select('id');

        if (profileError) {
          const edgeMsg = err?.message ? ` Edge Function: ${err.message}.` : '';
          toast({ kind: 'error', title: 'Update failed', message: `Error updating user.${edgeMsg} Profile update failed: ${profileError.message}` });
          return;
        }
        if (!fallbackRows || fallbackRows.length === 0) {
          const edgeMsg = err?.message ? ` Edge Function: ${err.message}.` : '';
          toast({ kind: 'error', title: 'Update blocked', message: `No profile row was updated.${edgeMsg} (RLS/admin permission issue).` });
          return;
        }

        fetchUsers();
        setIsModalOpen(false);
        if (trimmedNewPassword) {
          toast({ kind: 'info', title: 'Partial update', message: 'Profile updated, but Auth password update failed (Edge Function issue). Check function logs.' });
        } else if (companyIdChanged) {
          toast({ kind: 'info', title: 'Partial update', message: 'Profile updated, but company ID/auth email sync failed (Edge Function issue). Check function logs.' });
        } else {
          toast({ kind: 'info', title: 'Updated', message: 'User updated via profile fallback (Edge Function unavailable).' });
        }
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
            mqttConfig: formData.mqttConfig,
          },
        });

        if (fnError) {
          toast({ kind: 'error', title: 'Create failed', message: fnError.message });
        } else if (result?.error) {
          toast({ kind: 'error', title: 'Create failed', message: String(result.error) });
        } else {
          fetchUsers();
          setIsModalOpen(false);
          toast({ kind: 'success', title: 'Created', message: 'User created successfully.' });
        }
      } catch (err: any) {
        toast({ kind: 'error', title: 'Create failed', message: err.message });
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await confirm({
      title: 'Delete user?',
      message: 'This will delete the profile row. Accessible data may be lost.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!ok) return;

    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      fetchUsers();
      toast({ kind: 'success', title: 'Deleted', message: 'User deleted.' });
    } else {
      toast({ kind: 'error', title: 'Delete failed', message: error.message });
    }
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
                <th className="px-6 py-4 font-semibold text-slate-700 text-sm">Widgets</th>
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
                      <span className="text-xs text-slate-500">
                        Configure in Designer →
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/design/${user.id}`)}
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
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600" title="Close modal">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 overscroll-contain">
              <div className="space-y-4">
                {/* Identification Section */}
                <div className={`grid grid-cols-2 gap-4 p-4 rounded-xl border ${editingUser ? 'bg-slate-50 border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Company ID</label>
                    <input
                      required
                      type="text"
                      autoComplete="off"
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
                      required={!editingUser}
                      type="password"
                      autoComplete="new-password"
                      name="user_auth_password"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-[#009fe3] outline-none"
                      placeholder={editingUser ? 'Leave blank to keep current password' : 'Min 6 characters'}
                      value={editingUser ? editAuthPassword : createPassword}
                      onChange={e => editingUser
                        ? setEditAuthPassword(e.target.value)
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
                        autoComplete="off"
                        name="mqtt_username"
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
                        autoComplete="new-password"
                        name="mqtt_password"
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
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleTestMqttConnection}
                      disabled={mqttTestStatus === 'testing'}
                      className="px-4 py-2 rounded-lg bg-[#009fe3] text-white text-sm font-semibold hover:bg-[#008ac4] disabled:opacity-70 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {mqttTestStatus === 'testing' && <Loader2 size={14} className="animate-spin" />}
                      Test MQTT Connection
                    </button>
                    {mqttTestStatus !== 'idle' && (
                      <p
                        className={`text-xs font-medium ${
                          mqttTestStatus === 'success' ? 'text-emerald-600' : mqttTestStatus === 'error' ? 'text-red-600' : 'text-slate-500'
                        }`}
                      >
                        {mqttTestMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>


              <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t border-slate-100 shadow-[0_-8px_16px_-12px_rgba(15,23,42,0.35)]">
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
