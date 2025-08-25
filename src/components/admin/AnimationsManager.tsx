import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Edit, Trash2, Clock, MapPin, Users, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';

interface Animation {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  is_active: boolean;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
}

interface AnimationsManagerProps {
  event: Event;
  onClose: () => void;
}

export default function AnimationsManager({ event, onClose }: AnimationsManagerProps) {
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnimation, setEditingAnimation] = useState<Animation | null>(null);

  useEffect(() => {
    loadAnimations();
  }, []);

  const loadAnimations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_animations')
        .select('*')
        .eq('event_id', event.id)
        .order('start_time');

      if (error) throw error;
      setAnimations(data || []);
    } catch (err) {
      logger.error('Erreur chargement animations', {
        error: err,
        query: { table: 'event_animations', action: 'select', eventId: event.id }
      });
      toast.error('Erreur lors du chargement des animations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnimation = async (animationId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette animation ?')) return;

    try {
      const { error } = await supabase
        .from('event_animations')
        .delete()
        .eq('id', animationId);

      if (error) throw error;

      toast.success('Animation supprimée avec succès');
      loadAnimations();
    } catch (err) {
      logger.error('Erreur suppression animation', {
        error: err,
        query: { table: 'event_animations', action: 'delete', id: animationId }
      });
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleAnimationStatus = async (animation: Animation) => {
    try {
      const { error } = await supabase
        .from('event_animations')
        .update({ is_active: !animation.is_active })
        .eq('id', animation.id);

      if (error) throw error;

      toast.success(`Animation ${!animation.is_active ? 'activée' : 'désactivée'}`);
      loadAnimations();
    } catch (err) {
      logger.error('Erreur changement statut animation', {
        error: err,
        query: {
          table: 'event_animations',
          action: 'update',
          id: animation.id,
          is_active: !animation.is_active
        }
      });
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    setEditingAnimation(null);
    loadAnimations();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  🎭 Animations - {event.name}
                </h2>
                <p className="text-gray-600">
                  {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nouvelle Animation
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : animations.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎭</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune animation</h3>
                <p className="text-gray-600 mb-4">
                  Créez votre première animation pour enrichir l'expérience de vos participants.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Créer une animation
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {animations.map((animation) => (
                  <div key={animation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{animation.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            animation.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {animation.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-3">{animation.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{animation.location}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(animation.start_time), 'HH:mm')} - {format(new Date(animation.end_time), 'HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>
                              {animation.capacity === null ? 'Capacité illimitée' : `${animation.capacity} places`}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleAnimationStatus(animation)}
                          className={`p-2 rounded-md transition-colors ${
                            animation.is_active
                              ? 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }`}
                          title={animation.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {animation.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        
                        <button
                          onClick={() => setEditingAnimation(animation)}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleDeleteAnimation(animation.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Supprimer"
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
        </div>
      </div>

      {(showCreateForm || editingAnimation) && (
        <AnimationForm
          event={event}
          animation={editingAnimation}
          onClose={handleFormClose}
        />
      )}
    </>
  );
}

interface AnimationFormProps {
  event: Event;
  animation?: Animation | null;
  onClose: () => void;
}

function AnimationForm({ event, animation, onClose }: AnimationFormProps) {
  const [formData, setFormData] = useState({
    name: animation?.name || '',
    description: animation?.description || '',
    location: animation?.location || '',
    start_time: animation?.start_time ? format(new Date(animation.start_time), 'HH:mm') : '10:00',
    end_time: animation?.end_time ? format(new Date(animation.end_time), 'HH:mm') : '11:00',
    capacity: animation?.capacity || null,
    is_active: animation?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.start_time || !formData.end_time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      toast.error('L\'heure de fin doit être après l\'heure de début');
      return;
    }

    try {
      setSaving(true);
      
      // Construire les dates complètes avec la date de l'événement
      const eventDate = format(new Date(event.event_date), 'yyyy-MM-dd');
      const startDateTime = new Date(`${eventDate}T${formData.start_time}:00`);
      const endDateTime = new Date(`${eventDate}T${formData.end_time}:00`);
      
      const animationData = {
        event_id: event.id,
        name: formData.name,
        description: formData.description,
        location: formData.location,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        capacity: formData.capacity,
        is_active: formData.is_active
      };

      if (animation) {
        const { error } = await supabase
          .from('event_animations')
          .update(animationData)
          .eq('id', animation.id);

        if (error) throw error;
        toast.success('Animation mise à jour avec succès');
      } else {
        const { error } = await supabase
          .from('event_animations')
          .insert(animationData);

        if (error) throw error;
        toast.success('Animation créée avec succès');
      }

      onClose();
    } catch (err) {
      logger.error('Erreur sauvegarde animation', {
        error: err,
        query: {
          table: 'event_animations',
          action: animation ? 'update' : 'insert',
          animationId: animation?.id
        }
      });
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {animation ? 'Modifier l\'Animation' : 'Créer une Animation'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'animation *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ex: Spectacle de magie"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Description de l'animation..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ex: Scène principale"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de début *
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de fin *
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité (optionnel)
              </label>
              <input
                type="number"
                min="1"
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  capacity: e.target.value ? parseInt(e.target.value) : null 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Laisser vide pour capacité illimitée"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Animation active (visible au public)
              </label>
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
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {saving ? 'Sauvegarde...' : (animation ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}