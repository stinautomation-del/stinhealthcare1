import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/store/useStore';
import { authApi } from '@/services/api';
import type { UserRole } from '@/types';
import {
  LayoutDashboard,
  Users,
  Pill,
  Bell,
  Send,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  LogOut,
  User,
} from 'lucide-react';

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'doctor', 'head_nurse', 'nurse'] },
  { id: 'patients', path: '/patients', label: 'Patients', icon: Users, roles: ['admin', 'doctor', 'head_nurse', 'nurse'] },
  { id: 'prescriptions', path: '/prescriptions', label: 'Prescriptions', icon: Pill, roles: ['admin', 'doctor', 'head_nurse', 'nurse'] },
  { id: 'reminders', path: '/reminders', label: 'Reminders', icon: Bell, roles: ['admin', 'head_nurse', 'nurse'] },
  { id: 'nurse-reminders', path: '/nurse-reminders', label: 'Send Reminder', icon: Send, roles: ['admin', 'head_nurse', 'nurse'] },
  { id: 'escalations', path: '/escalations', label: 'Escalations', icon: AlertTriangle, roles: ['admin', 'doctor', 'head_nurse'] },
  { id: 'settings', path: '/settings', label: 'Settings', icon: Settings, roles: ['admin', 'doctor', 'head_nurse', 'nurse'] },
];

interface SidebarProps {
  navigate: (path: string) => void;
}

export function Sidebar({ navigate }: SidebarProps) {
  const { user } = useAuthStore();
  const resetSession = useAuthStore((state) => state.logout);
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await authApi.logout();
    resetSession();
    navigate('/');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const filteredNavItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Systems Admin';
      case 'doctor':
        return 'Medical Doctor';
      case 'head_nurse':
        return 'Head Nurse';
      case 'nurse':
        return 'Clinical Nurse';
      default:
        return role;
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">HMR System</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-auto"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isCollapsed ? 'px-2' : 'px-3',
                  isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                )}
                onClick={() => handleNavClick(item.path)}
              >
                <Icon className={cn('w-5 h-5', isCollapsed ? 'mr-0' : 'mr-3')} />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="border-t border-gray-200 p-4">
        <div className={cn('flex items-center', isCollapsed ? 'justify-center' : 'space-x-3')}>
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          {!isCollapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{getRoleLabel(user.role)}</p>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <Button
            variant="ghost"
            className="w-full mt-3 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        )}
      </div>
    </div>
  );
}
