import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';
import { getCurrentUser } from '../../lib/auth';
import type { User as AuthUser } from '../../lib/auth';
import { Shield, Search, Save } from 'lucide-react';

type Role = AuthUser['role'];
const ROLES: Role[] = [
  'admin',
  'pony_provider',
  'archery_provider',
  'luge_provider',
  'atlm_collaborator',
  'client'
];

interface UserRow {
  id: string;
  email: string;
  role: Role;
}

export default function UserManagement() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setMe(await getCurrentUser());
    })();
  }, []);

  const canManage = useMemo(() => me?.role === 'admin', [me]);

  const search = async () => {
    try {
      setLoading(true);
      const q = query.trim();
      const builder = supabase.from('users').select('id,email,role').limit(50);
      const { data, error } = q
        ? await builder.ilike('email', `%${q}%`)
        : await builder;
      if (error) throw error;
      setUsers((data ?? []) as UserRow[]);
    } catch (err) {
      logger.error('Erreur recherche utilisateurs', { error: err });
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, role: Role) => {
    try {
      setSaving((s) => ({ ...s, [id]: true }));
      const { error } = await supabase.from('users').update({ role }).eq('id', id);
      if (error) throw error;
      setUsers((list) => list.map(u => (u.id === id ? { ...u, role } : u)));
      toast.success('Rôle mis à jour');
    } catch (err) {
      logger.error('Erreur mise à jour rôle', { error: err, userId: id, role });
      toast.error('Échec de la mise à jour');
    } finally {
      setSaving((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
        <Search className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Rechercher par email..."
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button
          onClick={search}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Rechercher
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 text-sm text-gray-900">{u.email}</td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    onChange={(e) => updateRole(u.id, e.target.value as Role)}
                    disabled={!canManage || !!saving[u.id]}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    aria-label={`Rôle de ${u.email}`}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => search()}
                    disabled={!!saving[u.id]}
                    className="inline-flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
                    title="Rafraîchir"
                  >
                    <Save className="h-4 w-4" />
                    Mettre à jour
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={3}>
                  Aucun résultat. Lancez une recherche pour trouver des utilisateurs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

