import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { addToCart } from '../lib/cart';
import { Calendar, Users, Euro, Info, Clock, Target, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MarkdownRenderer from '../components/MarkdownRenderer';
import useEventDetails, { Pass, EventActivity, TimeSlot } from '../hooks/useEventDetails';
import { toast } from 'react-hot-toast';

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const { event, passes, eventActivities, loading, loadTimeSlotsForActivity, refresh } = useEventDetails(eventId);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [selectedActivities, setSelectedActivities] = useState<{[key: string]: string}>({});
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<{[key: string]: string}>({});

  const handleAddToCart = (pass: Pass) => {
    setSelectedPass(pass);
    setSelectedQuantity(1);
    setSelectedActivities({});
    setShowPurchaseModal(true);
  };

  const handlePurchase = async () => {
    if (!selectedPass) return;
    
    // Ajouter chaque pass individuellement au panier
    for (let i = 0; i < selectedQuantity; i++) {
      const eventActivityId = selectedActivities[i];
      const timeSlotId = selectedTimeSlots?.[i];
      const success = await addToCart(selectedPass.id, eventActivityId, timeSlotId);
      if (!success) {
        toast.error(`Erreur lors de l'ajout du pass ${i + 1}`);
        return;
      }
    }
    
    setShowPurchaseModal(false);
    setSelectedPass(null);
    await refresh(); // Recharger pour mettre à jour les stocks
  };

  const handleActivitySelection = async (index: number, eventActivityId: string) => {
    setSelectedActivities({ ...selectedActivities, [index]: eventActivityId });
    
    // Charger les créneaux pour cette activité si nécessaire
    const eventActivity = eventActivities.find(ea => ea.id === eventActivityId);
    if (eventActivity?.requires_time_slot) {
      await loadTimeSlotsForActivity(eventActivityId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'événement...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Événement introuvable</h2>
          <p className="text-gray-600">Cet événement n'existe pas ou n'est plus disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Event Header */}
      <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-medium text-blue-600">
            {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
          </span>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{event.name}</h1>
        
        {/* Informations Clés */}
        <div className="bg-blue-50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Info className="h-6 w-6 text-blue-600 mt-0.5" />
            <div>
              <h2 className="font-semibold text-blue-900 mb-2">Informations Clés</h2>
              <MarkdownRenderer className="text-blue-800" content={event.key_info_content} />
            </div>
          </div>
        </div>
      </div>

      {/* Passes Section */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Nos Pass</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {passes.map((pass) => (
            <div key={pass.id} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{pass.name}</h3>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{pass.price}€</div>
                  <div className="text-sm text-gray-500">
                    {pass.initial_stock === null 
                    ? 'Stock illimité'
                    : pass.remaining_stock === 0
                    ? 'Épuisé'
                    : `${pass.remaining_stock} restant(s)`
                  }
                  </div>
                </div>
              </div>
              
              <p className="text-gray-600 mb-6">{pass.description}</p>
              
              <button
                onClick={() => handleAddToCart(pass)}
                disabled={pass.remaining_stock === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {pass.remaining_stock === 0 ? 'Épuisé' : 'Ajouter au Panier'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal d'achat */}
      {showPurchaseModal && selectedPass && (
        <PurchaseModal
          pass={selectedPass}
          eventActivities={eventActivities}
          quantity={selectedQuantity}
          onQuantityChange={setSelectedQuantity}
          selectedActivities={selectedActivities}
          onActivitySelection={handleActivitySelection}
          onPurchase={handlePurchase}
          onClose={() => {
            setShowPurchaseModal(false);
            setSelectedPass(null);
          }}
        />
      )}
    </div>
  );
}

interface PurchaseModalProps {
  pass: Pass;
  eventActivities: EventActivity[];
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  selectedActivities: {[key: string]: string};
  selectedTimeSlots?: {[key: string]: string};
  onActivitySelection: (index: number, eventActivityId: string) => void;
  onTimeSlotSelection?: (index: number, eventActivityId: string, timeSlotId: string) => void;
  onPurchase: () => void;
  onClose: () => void;
}

function PurchaseModal({ 
  pass, 
  eventActivities, 
  quantity, 
  onQuantityChange, 
  selectedActivities, 
  selectedTimeSlots = {},
  onActivitySelection, 
  onTimeSlotSelection,
  onPurchase, 
  onClose 
}: PurchaseModalProps) {
  const [availableTimeSlots, setAvailableTimeSlots] = useState<{[key: string]: TimeSlot[]}>({});
  const [selectedSlots, setSelectedSlots] = useState<{[key: string]: string}>({});
  
  const loadTimeSlotsForActivity = async (eventActivityId: string) => {
    try {
      const { data: slotsData, error } = await supabase
        .from('time_slots')
        .select('id, slot_time, capacity')
        .eq('event_activity_id', eventActivityId)
        .gte('slot_time', new Date().toISOString())
        .order('slot_time');
        
      if (error) throw error;
      
      // Calculer la capacité restante pour chaque créneau
      const slotsWithCapacity = await Promise.all(
        (slotsData || []).map(async (slot) => {
          const { data: capacityData } = await supabase
            .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });
          
          return {
            ...slot,
            remaining_capacity: capacityData || 0
          };
        })
      );
      
      setAvailableTimeSlots(prev => ({
        ...prev,
        [eventActivityId]: slotsWithCapacity
      }));
    } catch (err) {
      console.error('Erreur chargement créneaux:', err);
    }
  };
  
  const handleActivitySelectionWithSlots = async (index: number, eventActivityId: string) => {
    onActivitySelection(index, eventActivityId);
    
    // Charger les créneaux pour cette activité d'événement
    const eventActivity = eventActivities.find(ea => ea.id === eventActivityId);
    if (eventActivity?.requires_time_slot) {
      await loadTimeSlotsForActivity(eventActivityId);
    }
  };

  const handleTimeSlotSelection = (index: number, eventActivityId: string, timeSlotId: string) => {
    setSelectedSlots(prev => ({
      ...prev,
      [`${index}-${eventActivityId}`]: timeSlotId
    }));
    
    if (onTimeSlotSelection) {
      onTimeSlotSelection(index, eventActivityId, timeSlotId);
    }
  };

  const getCapacityColor = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage === 0) return 'border-red-300 bg-red-50 text-red-700 cursor-not-allowed';
    if (percentage <= 25) return 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100';
    if (percentage <= 50) return 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100';
    return 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100';
  };

  const canPurchase = () => {
    // Vérifier que toutes les activités sont sélectionnées
    for (let i = 0; i < quantity; i++) {
      if (!selectedActivities[i]) return false;
      
      // Vérifier que les créneaux sont sélectionnés si nécessaire
      const eventActivity = eventActivities.find(ea => ea.id === selectedActivities[i]);
      if (eventActivity?.requires_time_slot && !selectedSlots[`${i}-${selectedActivities[i]}`]) {
        return false;
      }
    }
    return true;
  };

  const handlePurchaseWithSlots = async () => {
    // Ajouter chaque pass individuellement au panier avec son créneau
    for (let i = 0; i < quantity; i++) {
      const eventActivityId = selectedActivities[i];
      const timeSlotId = selectedSlots[`${i}-${eventActivityId}`];
      
      const success = await addToCart(pass.id, eventActivityId, timeSlotId);
      if (!success) {
        toast.error(`Erreur lors de l'ajout du pass ${i + 1}`);
        return;
      }
    }
    
    onPurchase();
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Configurer votre achat : {pass.name}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Sélection de quantité */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantité
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-lg font-semibold px-4">{quantity}</span>
              <button
                onClick={() => onQuantityChange(quantity + 1)}
                className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Sélection d'activités pour chaque pass */}
          <div className="space-y-4">
            {Array.from({ length: quantity }, (_, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Pass #{index + 1} - Choisissez une activité
                </h4>
                
                <div className="grid grid-cols-1 gap-3">
                  {eventActivities.map((eventActivity) => (
                    <div
                      key={eventActivity.id}
                      className={`border rounded-md transition-colors ${
                        selectedActivities[index] === eventActivity.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <button
                        onClick={() => handleActivitySelectionWithSlots(index, eventActivity.id)}
                        className="w-full p-3 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{eventActivity.activity.icon}</span>
                            <div>
                              <div className="font-medium">{eventActivity.activity.name}</div>
                              <div className="text-sm text-gray-600">{eventActivity.activity.description}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {eventActivity.stock_limit === null 
                              ? 'Illimité' 
                              : `${eventActivity.remaining_stock} restant(s)`
                            }
                          </div>
                        </div>
                      </button>
                      
                      {/* Sélection de créneaux si nécessaire */}
                      {selectedActivities[index] === eventActivity.id && eventActivity.requires_time_slot && (
                        <div className="border-t border-gray-200 p-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Choisissez un créneau :
                          </div>
                          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                            {availableTimeSlots[eventActivity.id]?.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => handleTimeSlotSelection(index, eventActivity.id, slot.id)}
                                disabled={slot.remaining_capacity === 0}
                                className={`p-2 text-xs border rounded transition-colors ${
                                  selectedSlots[`${index}-${eventActivity.id}`] === slot.id
                                    ? 'border-blue-500 bg-blue-100 text-blue-700'
                                    : slot.remaining_capacity === 0
                                    ? 'border-red-200 bg-red-50 text-red-400 cursor-not-allowed'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="font-medium">
                                  {format(new Date(slot.slot_time), 'HH:mm')}
                                </div>
                                <div className="text-gray-600">
                                  {slot.remaining_capacity}/{slot.capacity}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">
              Total: {(pass.price * quantity).toFixed(2)}€
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={onPurchase}
              disabled={!canPurchase()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Ajouter au Panier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}