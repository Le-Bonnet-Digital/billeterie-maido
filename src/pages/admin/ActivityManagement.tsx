import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Plus, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import MarkdownRenderer from '../../components/MarkdownRenderer';

interface ActivityType {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
}

export default function ActivityManagement() {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Erreur chargement activités:', err);
      toast.error('Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible et affectera tous les événements qui l\'utilisent.')) return;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      
      toast.success('Activité supprimée avec succès');
      loadActivities();
    } catch (err) {
      console.error('Erreur suppression activité:', err);
      toast.error('Erreur lors de la suppression');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Activités</h1>
          <p className="text-gray-600">Créez et gérez les types d'activités disponibles</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle Activité
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{activities.length}</div>
          <div className="text-sm text-gray-600">Total Activités</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-blue-600">
            {activities.filter(a => a.name.toLowerCase().includes('poney')).length}
          </div>
          <div className="text-sm text-gray-600">Activités Poney</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {activities.filter(a => a.name.toLowerCase().includes('tir')).length}
          </div>
          <div className="text-sm text-gray-600">Activités Tir</div>
        </div>
      </div>

      {/* Liste des activités */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Activités ({activities.length})</h2>
        </div>

        {activities.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité</h3>
            <p className="text-gray-600">Créez votre première activité pour commencer.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {activities.map((activity) => (
              <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{activity.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                      <MarkdownRenderer
                        content={activity.description}
                        className="text-gray-600"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingActivity(activity)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de création/édition */}
      {(showCreateModal || editingActivity) && (
        <ActivityFormModal
          activity={editingActivity}
          onClose={() => {
            setShowCreateModal(false);
            setEditingActivity(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingActivity(null);
            loadActivities();
          }}
        />
      )}
    </div>
  );
}

interface ActivityFormModalProps {
  activity?: ActivityType | null;
  onClose: () => void;
  onSave: () => void;
}

function ActivityFormModal({ activity, onClose, onSave }: ActivityFormModalProps) {
  const [formData, setFormData] = useState({
    name: activity?.name || '',
    description: activity?.description || '',
    icon: activity?.icon || '🎯'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    try {
      setSaving(true);
      
      if (activity) {
        // Mise à jour
        const { error } = await supabase
          .from('activities')
          .update({
            name: formData.name,
            description: formData.description,
            icon: formData.icon
          })
          .eq('id', activity.id);

        if (error) throw error;
        toast.success('Activité mise à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('activities')
          .insert({
            name: formData.name,
            description: formData.description,
            icon: formData.icon
          });

        if (error) throw error;
        toast.success('Activité créée avec succès');
      }
      
      onSave();
    } catch (err) {
      console.error('Erreur sauvegarde activité:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const commonIcons = ['🐴', '🏹', '🎯', '🎪', '🎨', '🎵', '🏃', '🚴', '🏊', '⚽', '🏀', '🎾'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {activity ? 'Modifier l\'Activité' : 'Créer une Activité'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icône
              </label>
              <div className="grid grid-cols-6 gap-2 mb-3">
                {commonIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`p-2 text-xl border rounded-md hover:bg-gray-50 ${
                      formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Ou saisissez un emoji"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {saving ? 'Sauvegarde...' : (activity ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}