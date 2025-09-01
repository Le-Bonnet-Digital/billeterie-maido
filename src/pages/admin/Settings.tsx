import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, User, Shield, Database, Globe, Bell } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getCurrentUser } from '../../lib/auth';
import type { User as AuthUser } from '../../lib/auth';
import { logger } from '../../lib/logger';
import { safeStorage } from '../../lib/storage';

interface SystemSettings {
  site_name: string;
  site_description: string;
  contact_email: string;
  notification_email: string;
  maintenance_mode: boolean;
  registration_enabled: boolean;
}

export default function Settings() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: 'BilletEvent',
    site_description: 'Plateforme de billetterie événementielle',
    contact_email: 'contact@billetevent.com',
    notification_email: 'admin@billetevent.com',
    maintenance_mode: false,
    registration_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserAndSettings();
  }, []);

  const loadUserAndSettings = async () => {
    try {
      setLoading(true);

      // Charger l'utilisateur actuel
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      // Charger les paramètres système (simulés pour le moment)
      // En production, ces paramètres seraient stockés dans une table dédiée
      const savedSettings = safeStorage.getItem('system_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (err) {
      logger.error('Erreur chargement paramètres', { error: err });
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Sauvegarder les paramètres (simulé avec localStorage)
      // En production, cela serait sauvegardé dans Supabase
      safeStorage.setItem('system_settings', JSON.stringify(settings));

      toast.success('Paramètres sauvegardés avec succès');
    } catch (err) {
      logger.error('Erreur sauvegarde paramètres', { error: err });
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    if (
      !confirm(
        '⚠️ ATTENTION: Cette action va supprimer TOUTES les données (événements, réservations, etc.). Cette action est IRRÉVERSIBLE. Êtes-vous absolument sûr ?',
      )
    ) {
      return;
    }

    if (
      !confirm(
        'Dernière confirmation: Voulez-vous vraiment SUPPRIMER TOUTES LES DONNÉES ?',
      )
    ) {
      return;
    }

    try {
      setSaving(true);

      // Supprimer toutes les données dans l'ordre correct (contraintes FK)
      await supabase
        .from('cart_items')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase
        .from('reservations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase
        .from('time_slots')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase
        .from('passes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase
        .from('events')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      toast.success('Base de données réinitialisée avec succès');
    } catch (err) {
      logger.error('Erreur réinitialisation', { error: err });
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">
          Configurez votre plateforme et gérez les paramètres système
        </p>
      </div>

      {/* Informations utilisateur */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Profil Administrateur
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rôle
            </label>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {user?.role === 'admin' ? 'Administrateur' : user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Paramètres du site */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Paramètres du Site
          </h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du site
              </label>
              <input
                type="text"
                value={settings.site_name}
                onChange={(e) =>
                  setSettings({ ...settings, site_name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email de contact
              </label>
              <input
                type="email"
                value={settings.contact_email}
                onChange={(e) =>
                  setSettings({ ...settings, contact_email: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description du site
            </label>
            <textarea
              value={settings.site_description}
              onChange={(e) =>
                setSettings({ ...settings, site_description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Paramètres de notification */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email de notification
            </label>
            <input
              type="email"
              value={settings.notification_email}
              onChange={(e) =>
                setSettings({ ...settings, notification_email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="admin@exemple.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Adresse email qui recevra les notifications de nouvelles
              réservations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="registration_enabled"
              checked={settings.registration_enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  registration_enabled: e.target.checked,
                })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="registration_enabled"
              className="text-sm font-medium text-gray-700"
            >
              Autoriser les nouvelles inscriptions
            </label>
          </div>
        </div>
      </div>

      {/* Paramètres système */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Système</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="maintenance_mode"
              checked={settings.maintenance_mode}
              onChange={(e) =>
                setSettings({ ...settings, maintenance_mode: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="maintenance_mode"
              className="text-sm font-medium text-gray-700"
            >
              Mode maintenance
            </label>
            <span className="text-xs text-gray-500">
              (Désactive temporairement l'accès public au site)
            </span>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Zone de danger
            </h3>
            <button
              onClick={handleResetDatabase}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Réinitialiser la base de données
            </button>
            <p className="text-xs text-red-600 mt-1">
              ⚠️ Cette action supprimera TOUTES les données (événements,
              réservations, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Sauvegarder les paramètres
            </>
          )}
        </button>
      </div>
    </div>
  );
}
