import React from 'react';
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Ticket, 
  Users, 
  BarChart3, 
  Mail, 
  Settings,
  ArrowLeft,
  Clock,
  LogOut,
  Activity
} from 'lucide-react';
import AdminLogin from '../../components/AdminLogin';
import { getCurrentUser, signOut } from '../../lib/auth';
import type { User } from '../../lib/auth';

export default function AdminLayout() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      console.error('Erreur vérification auth:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const navigation = [
    { name: 'Tableau de Bord', href: '/admin', icon: LayoutDashboard },
    { name: 'Événements', href: '/admin/events', icon: Calendar },
    { name: 'Activités', href: '/admin/activities', icon: Activity },
    { name: 'Pass', href: '/admin/passes', icon: Ticket },
    { name: 'Créneaux', href: '/admin/time-slots', icon: Clock },
    { name: 'Réservations', href: '/admin/reservations', icon: Users },
    { name: 'Reporting', href: '/admin/reports', icon: BarChart3 },
    { name: 'Communication', href: '/admin/communication', icon: Mail },
    { name: 'Paramètres', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <Link to="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-4">
              <ArrowLeft className="h-4 w-4" />
              Retour au site
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-600">Gestion des événements</p>
          </div>
          
          <nav className="p-4">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <header className="bg-white shadow-sm border-b">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Administration
                </h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                </span>
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </header>

          <main className="p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}