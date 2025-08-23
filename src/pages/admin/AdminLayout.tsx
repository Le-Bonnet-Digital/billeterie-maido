import React from 'react';
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
  Clock
} from 'lucide-react';

export default function AdminLayout() {
  const location = useLocation();

  const navigation = [
    { name: 'Tableau de Bord', href: '/admin', icon: LayoutDashboard },
    { name: 'Événements', href: '/admin/events', icon: Calendar },
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
                    Connecté en tant qu'administrateur
                  </span>
                </div>
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