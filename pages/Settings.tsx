import React from 'react';
import { User } from '../types';
import { Globe, Lock, Shield } from 'lucide-react';
import { TRANSLATIONS } from '../constants';

interface SettingsProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser }) => {
  const t = TRANSLATIONS[user.language];

  const toggleLanguage = () => {
    onUpdateUser({
      ...user,
      language: user.language === 'en' ? 'fr' : 'en'
    });
  };

  return (
    <div className="max-w-3xl">
       <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">{t.settings}</h2>
          <p className="text-slate-500">Preferences and security</p>
        </div>

      <div className="space-y-6">
        {/* Language Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <Globe className="text-blue-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Language / Langue</h3>
              <p className="text-slate-500 text-sm mb-4">Select your preferred interface language.</p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => onUpdateUser({...user, language: 'en'})}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium border-2 transition-all ${
                    user.language === 'en' 
                      ? 'border-frost-500 bg-frost-50 text-frost-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => onUpdateUser({...user, language: 'fr'})}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium border-2 transition-all ${
                    user.language === 'fr' 
                      ? 'border-frost-500 bg-frost-50 text-frost-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Français
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
           <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-xl">
              <Lock className="text-slate-600" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">Password</h3>
              <p className="text-slate-500 text-sm mb-4">Change your account password.</p>
              
              <div className="space-y-3">
                 <input 
                    type="password" 
                    placeholder="Current Password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                  />
                  <input 
                    type="password" 
                    placeholder="New Password"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-frost-500 outline-none"
                  />
                  <div className="flex justify-end">
                     <button className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">
                       Update Password
                     </button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
