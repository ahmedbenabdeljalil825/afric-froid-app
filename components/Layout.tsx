import React, { useState } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  Activity,
  Info,
  Bell
} from 'lucide-react';
import { User, UserRole } from '../types';
import { TRANSLATIONS } from '../constants';
import { BrokerStatus } from './BrokerStatus';
import { AlarmBell } from './AlarmBell';

interface LayoutProps {
  children?: React.ReactNode;
  user: User;
  onLogout: () => void;
}

// Brand Icon only (No Text) for small spaces, matching the geometry
const BrandIcon = ({ className = "h-10 w-10" }: { className?: string }) => (
  <svg
    viewBox="0 0 200 180"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="translate(0, 0)">
      {/* Left Shape */}
      <path d="M30,170 L90,170 L120,40 L60,40 Z" fill="#002060" />
      {/* Right Shape */}
      <path d="M95,130 L155,130 L185,0 L125,0 Z" fill="#009fe3" />
      {/* Letters */}
      <text x="75" y="125" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="65" fill="white" textAnchor="middle">A</text>
      <text x="140" y="85" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="65" fill="white" textAnchor="middle">F</text>
    </g>
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const t = TRANSLATIONS[user.language];

  const NavItem = ({ path, icon: Icon, label }: { path: string, icon: any, label: string }) => {
    const isActive = location.pathname === path;
    return (
      <button
        onClick={() => {
          navigate(path);
          setSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
          ? 'bg-frost-500 text-white shadow-lg shadow-frost-500/30'
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 px-2 mb-10">
            {/* Added white container for logo visibility */}
            <div className="bg-white p-2 rounded-lg shadow-lg">
              <BrandIcon className="h-10 w-12 flex-shrink-0" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight italic leading-tight">
                <span className="text-white block">AFRIC</span> <span className="text-frost-500 block">FROID</span>
              </h1>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {user.role === UserRole.ADMIN ? (
              <>
                <NavItem path="/admin" icon={Users} label={t.users} />
                <NavItem path="/settings" icon={Settings} label={t.settings} />
                <NavItem path="/about" icon={Info} label={t.about} />
              </>
            ) : (
              <>
                <NavItem path="/dashboard" icon={LayoutDashboard} label={t.dashboard} />
                <NavItem path="/controls" icon={Activity} label={t.controls} />
                <NavItem path="/alarms" icon={Bell} label={t.alarms} />
                <NavItem path="/settings" icon={Settings} label={t.settings} />
                <NavItem path="/about" icon={Info} label={t.about} />
              </>
            )}
          </nav>

          <div className="pt-6 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 font-bold text-frost-500">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">{t.logout}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 lg:hidden flex items-center justify-between px-4 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3">
            <BrandIcon className="h-8 w-10" />
            <span className="font-bold text-slate-900 italic">AFRIC FROID</span>
          </div>
          <div className="flex items-center gap-2">
            <AlarmBell user={user} />
            <BrokerStatus />
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="hidden lg:flex justify-end items-center gap-3 mb-4">
              <AlarmBell user={user} />
              <BrokerStatus />
            </div>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;