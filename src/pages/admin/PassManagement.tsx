import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Ticket, Plus, Edit, Trash2, Euro, Package, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Pass {
  id: string;
  name: string;
  price: number;
  description: string;
  initial_stock: number | null;
  remaining_stock?: number;
  event: {
    id: string;
    name: string;
  };
}

interface Event {
  id: string;
  name: string;
}

export default function PassManagement() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPass, setEditingPass] = useState<Pass | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les pass avec leurs événements
      const { data: passesData, error: passesError } = await supabase
        .from('passes')
        .select(`
          id,
          name,
          price,
          description,
          initial_stock,
          events!inner (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (passesError) throw passesError;

      // Calculer le stock restant pour chaque pass
      const passesWithStock = await Promise.all(
        (passesData || []).map(async (pass) => {
          if (pass.initial_stock === null) {
            return { ...pass, event: pass.events, remaining_stock: 999999 };
          }
          
          const { data: stockData } = await supabase
            .rpc('get_pass_remaining_stock', { pass_uuid: pass.id });
          
          return { ...pass, event: pass.events, remaining_stock: stockData || 0 };
        })
      );
      
      setPasses(passesWithStock);

      // Charger tous les événements pour le formulaire
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name')
        .order('name');

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (err) {
      console.error('Erreur chargement pass:', err);
      toast.error('Erreur lors du chargement des pass');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePass = async (passId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce pass ? Cette action supprimera aussi toutes les réservations associées.')) return;

    try {
      console.log('Tentative de suppression du pass:', passId);
      
      // Debug: vérifier les permissions avant suppression
      const { data: debugInfo } = await supabase
        .rpc('debug_pass_permissions', { pass_uuid: passId });
      console.log('Debug permissions:', debugInfo);
      
      const { data, error, count } = await supabase
        .from('passes')
        .delete()
        .eq('id', passId)
        .select();

      console.log('Réponse Supabase:', { data, error, count });
      
      if (error) {
        console.error('Erreur Supabase lors de la suppression:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('Aucune ligne supprimée - vérifiez les permissions RLS');
        toast.error('Aucun pass supprimé - vérifiez vos permissions');
        return;
      }
      
      console.log('Pass supprimé avec succès:', data);
      
      toast.success('Pass supprimé avec succès');
      await loadData();
    } catch (err) {
      console.error('Erreur suppression pass:', err);
      if (err.message?.includes('foreign key')) {
        toast.error('Impossible de supprimer ce pass car des réservations y sont associées');
      } else if (err.message?.includes('permission')) {
        toast.error('Vous n\'avez pas les permissions pour supprimer ce pass');
      } else {
        toast.error(`Erreur lors de la suppression: ${err.message || 'Erreur inconnue'}`);
      }
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Pass</h1>
          <p className="text-gray-600">Créez et gérez les pass pour vos événements</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau Pass
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{passes.length}</div>
          <div className="text-sm text-gray-600">Total Pass</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {passes.filter(p => p.remaining_stock && p.remaining_stock > 0).length}
          </div>
          <div className="text-sm text-gray-600">En stock</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">
            {passes.length > 0 ? (passes.reduce((sum, p) => sum + p.price, 0) / passes.length).toFixed(2) : '0.00'}€
          </div>
          <div className="text-sm text-gray-600">Prix moyen</div>
        </div>
      </div>

      {/* Liste des pass */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pass ({passes.length})</h2>
        </div>

        {passes.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun pass</h3>
            <p className="text-gray-600">Créez votre premier pass pour commencer.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {passes.map((pass) => (
              <div key={pass.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{pass.name}</h3>
                      <span className="text-2xl font-bold text-blue-600">{pass.price}€</span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{pass.description}</p>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>
                          {pass.initial_stock === null 
                            ? 'Stock illimité'
                            : `${pass.remaining_stock}/${pass.initial_stock} restant(s)`
                          }
                        </span>
                      </div>
                      <div>Événement: {pass.event.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPass(pass)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeletePass(pass.id)}
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
      {(showCreateModal || editingPass) && (
        <PassFormModal
          pass={editingPass}
          events={events}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPass(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPass(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface PassFormModalProps {
  pass?: Pass | null;
  events: Event[];
  onClose: () => void;
  onSave: () => void;
}

function PassFormModal({ pass, events, onClose, onSave }: PassFormModalProps) {
  const [formData, setFormData] = useState({
    event_id: pass?.event.id || '',
    name: pass?.name || '',
    price: pass?.price || 0,
    description: pass?.description || '',
    initial_stock: pass?.initial_stock || null
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.event_id || !formData.name || formData.price <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      
      if (pass) {
        // Mise à jour
        const { error } = await supabase
          .from('passes')
          .update({
            event_id: formData.event_id,
            name: formData.name,
            price: formData.price,
            description: formData.description,
            initial_stock: formData.initial_stock
          })
          .eq('id', pass.id);

        if (error) throw error;
        toast.success('Pass mis à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('passes')
          .insert({
            event_id: formData.event_id,
            name: formData.name,
            price: formData.price,
            description: formData.description,
            initial_stock: formData.initial_stock
          });

        if (error) throw error;
        toast.success('Pass créé avec succès');
      }
      
      onSave();
    } catch (err) {
      console.error('Erreur sauvegarde pass:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {pass ? 'Modifier le Pass' : 'Créer un Pass'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Événement *
              </label>
              <select
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner un événement</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du Pass *
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
                Prix (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Initial
              </label>
              <input
                type="number"
                min="0"
                value={formData.initial_stock || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  initial_stock: e.target.value ? parseInt(e.target.value) : null 
                })}
                placeholder="Laisser vide pour stock illimité"
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
                {saving ? 'Sauvegarde...' : (pass ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}