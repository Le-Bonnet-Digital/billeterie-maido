import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Plus, Edit, Trash2, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import MarkdownEditor from '../../components/admin/MarkdownEditor';
import { logger } from '../../lib/logger';
import { processAndUploadPublicImage, deletePublicImage, validateImageFile } from '../../lib/upload';

interface ActivityType {
  id: string;
  name: string;
  description: string;
  icon: string;
  created_at: string;
  is_parc_product?: boolean;
  parc_description?: string | null;
  parc_category?: string | null;
  parc_sort_order?: number;
  parc_requires_time_slot?: boolean;
  parc_image_url?: string | null;
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
      logger.error('Erreur chargement activités', { error: err });
      toast.error('Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette activité ? Cette action est irréversible et affectera tous les événements qui l'utilisent.")) return;

    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;
      
      toast.success('Activité supprimée avec succès');
      loadActivities();
    } catch (err) {
      logger.error('Erreur suppression activité', { error: err });
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
                      <MarkdownRenderer content={activity.description} className="text-gray-600" />
                      <div className="text-xs text-gray-500 mt-1">
                        Parc: {activity.is_parc_product ? 'Activé' : 'Désactivé'}
                        {activity.parc_category ? ` • Catégorie: ${activity.parc_category}` : ''}
                      </div>
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
    icon: activity?.icon || '🎯',
    is_parc_product: activity?.is_parc_product ?? false,
    parc_description: activity?.parc_description || '',
    parc_category: activity?.parc_category || '',
    parc_sort_order: activity?.parc_sort_order ?? 0,
    parc_requires_time_slot: activity?.parc_requires_time_slot ?? false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(activity?.parc_image_url || null);
  const [originalImageUrl] = useState<string | null>(activity?.parc_image_url || null);
  const [deleteOnSave, setDeleteOnSave] = useState<boolean>(false);
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
        let parc_image_url: string | null | undefined = undefined;
        if (imageFile) {
          try {
            const uploaded = await processAndUploadPublicImage('activities', imageFile, 'activities', {
              minWidth: 1200,
              minHeight: 600,
              maxWidth: 1600,
              maxHeight: 900,
              mimeType: 'image/jpeg',
              quality: 0.85,
            });
            if (!uploaded) throw new Error("Échec de l'upload");
            parc_image_url = uploaded.publicUrl;
            if (originalImageUrl) {
              await deletePublicImage(originalImageUrl);
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : undefined;
            toast.error(msg || "Échec de l'upload de l'image");
          }
        } else if (deleteOnSave && originalImageUrl) {
          parc_image_url = null;
          await deletePublicImage(originalImageUrl);
        }

        const { error } = await supabase
          .from('activities')
          .update({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            is_parc_product: formData.is_parc_product,
            parc_description: formData.parc_description || null,
            parc_category: formData.parc_category || null,
            parc_sort_order: formData.parc_sort_order,
            parc_requires_time_slot: formData.parc_requires_time_slot,
            ...(parc_image_url !== undefined ? { parc_image_url } : {}),
          })
          .eq('id', activity.id);

        if (error) throw error;
        toast.success('Activité mise à jour avec succès');
      } else {
        // Création
        let parc_image_url: string | null | undefined = undefined;
        if (imageFile) {
          try {
            const uploaded = await processAndUploadPublicImage('activities', imageFile, 'activities', {
              minWidth: 1200,
              minHeight: 600,
              maxWidth: 1600,
              maxHeight: 900,
              mimeType: 'image/jpeg',
              quality: 0.85,
            });
            if (!uploaded) throw new Error("Échec de l'upload");
            parc_image_url = uploaded.publicUrl;
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : undefined;
            toast.error(msg || "Échec de l'upload de l'image");
          }
        }
        const { error } = await supabase
          .from('activities')
          .insert({
            name: formData.name,
            description: formData.description,
            icon: formData.icon,
            is_parc_product: formData.is_parc_product,
            parc_description: formData.parc_description || null,
            parc_category: formData.parc_category || null,
            parc_sort_order: formData.parc_sort_order,
            parc_requires_time_slot: formData.parc_requires_time_slot,
            ...(parc_image_url ? { parc_image_url } : {}),
          });

        if (error) throw error;
        toast.success('Activité créée avec succès');
      }
      
      onSave();
    } catch (err) {
      logger.error('Erreur sauvegarde activité', { error: err });
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const commonIcons = ['🐴', '🏹', '🎯', '🎪', '🎨', '🎵', '🏃', '🚴', '🏊', '⚽', '🏀', '🎾'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {activity ? "Modifier l'Activité" : 'Créer une Activité'}
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
              <MarkdownEditor
                id="description"
                label="Description"
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                rows={3}
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

            {/* Champs Parc */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Paramètres Parc</h3>
              <label className="inline-flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.is_parc_product}
                  onChange={(e) => setFormData({ ...formData, is_parc_product: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                Activer cette activité dans la billetterie du Parc
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie (Parc)</label>
                  <input
                    type="text"
                    value={formData.parc_category}
                    onChange={(e) => setFormData({ ...formData, parc_category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordre (Parc)</label>
                  <input
                    type="number"
                    value={formData.parc_sort_order}
                    onChange={(e) => setFormData({ ...formData, parc_sort_order: parseInt(e.target.value || '0') })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.parc_requires_time_slot}
                    onChange={(e) => setFormData({ ...formData, parc_requires_time_slot: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  Créneau requis (Parc)
                </label>
              </div>
              <div className="mt-3">
                <MarkdownEditor
                  id="parc_description"
                  label="Description (Parc)"
                  value={formData.parc_description}
                  onChange={(value) => setFormData({ ...formData, parc_description: value })}
                  rows={3}
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Image (Parc)</label>
                {imagePreview && (
                  <div className="mb-2">
                    <img src={imagePreview} alt="aperçu" className="h-24 rounded-md object-cover" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
                    <ImageIcon className="h-4 w-4" />
                    Choisir une image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (f) {
                          const err = validateImageFile(f);
                          if (err) { toast.error(err); return; }
                          setImageFile(f);
                          setImagePreview(URL.createObjectURL(f));
                          setDeleteOnSave(false);
                        }
                      }}
                    />
                  </label>
                  {imagePreview && (
                    <button type="button" onClick={() => { setImagePreview(null); setImageFile(null); setDeleteOnSave(true); }} className="text-sm text-red-600 hover:text-red-700">
                      Supprimer l'image
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Formats recommandés: JPG/PNG, 1200×600 min.</p>
              </div>
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
