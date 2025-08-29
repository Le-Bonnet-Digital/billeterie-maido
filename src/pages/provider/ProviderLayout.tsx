import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { getCurrentUser, signOut } from '../../lib/auth';
import type { User } from '../../lib/auth';
import ProviderLogin from '../../components/ProviderLogin';
import { QrCode, LogOut } from 'lucide-react';

const ALLOWED: User['role'][] = ['pony_provider', 'archery_provider', 'luge_provider', 'atlm_collaborator', 'admin'];

export default function ProviderLayout() {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await getCurrentUser();
      setUser(u);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user || !ALLOWED.includes(user.role)) {
    return <ProviderLogin onLogin={setUser} />;
  }

  const nav = (() => {
    const items = [] as Array<{ to: string; label: string; roles?: User['role'][] }>;
    items.push({ to: '/provider/pony', label: 'Poney', roles: ['pony_provider', 'admin', 'atlm_collaborator'] });
    items.push({ to: '/provider/archery', label: "Tir à l'arc", roles: ['archery_provider', 'admin', 'atlm_collaborator'] });
    items.push({ to: '/provider/luge', label: 'Luge', roles: ['luge_provider', 'admin', 'atlm_collaborator'] });
    items.push({ to: '/provider/stats', label: 'Statistiques', roles: ['pony_provider','archery_provider','luge_provider','atlm_collaborator','admin'] });
    return items.filter((n) => n.roles?.includes(user.role));
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <QrCode className="h-5 w-5 text-blue-600" />
            Espace Prestataire
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-4">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`text-sm ${location.pathname === n.to ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={async () => { await signOut(); setUser(null); }}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
