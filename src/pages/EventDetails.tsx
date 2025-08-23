import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { addToCart } from '../lib/cart';
import { Calendar, Users, Euro, Info, Clock, Target } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Event {
  id: string;
  name: string;
  event_date: string;
  key_info_content: string;
}

interface Pass {
  id: string;
  name: string;
  price: number;
  description: string;
  initial_stock: number | null;
  remaining_stock?: number;
}

interface TimeSlot {
  id: string;
  activity: 'poney' | 'tir_arc';
  slot_time: string;
  capacity: number;
  remaining_capacity?: number;
}

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadEventData();
    }
  }, [eventId]);

  const loadEventData = async () => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Charger l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, event_date, key_info_content')
        .eq('id', eventId)
        .eq('status', 'published')
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Charger les pass
      const { data: passesData, error: passesError } = await supabase
        .from('passes')
        .select('id, name, price, description, initial_stock')
        .eq('event_id', eventId);

      if (passesError) throw passesError;
      
      // Calculer le stock restant pour chaque pass
      const passesWithStock = await Promise.all(
        (passesData || []).map(async (pass) => {
          if (pass.initial_stock === null) {
            return { ...pass, remaining_stock: 999999 }; // Stock illimité
          }
          
          const { data: stockData } = await supabase
            .rpc('get_pass_remaining_stock', { pass_uuid: pass.id });
          
          return { ...pass, remaining_stock: stockData || 0 };
        })
      );
      
      setPasses(passesWithStock);

      // Charger les créneaux
      const { data: slotsData, error: slotsError } = await supabase
        .from('time_slots')
        .select('id, activity, slot_time, capacity')
        .eq('event_id', eventId)
        .order('slot_time');

      if (slotsError) throw slotsError;
      
      // Calculer les places restantes pour chaque créneau
      const slotsWithCapacity = await Promise.all(
        (slotsData || []).map(async (slot) => {
          const { data: capacityData } = await supabase
            .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });
          
          return { ...slot, remaining_capacity: capacityData || 0 };
        })
      );
      
      setTimeSlots(slotsWithCapacity);
    } catch (err) {
      console.error('Erreur chargement événement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (pass: Pass) => {
    // Vérifier si le pass nécessite un créneau
    const needsTimeSlot = pass.name.toLowerCase().includes('marmaille') || 
                         pass.name.toLowerCase().includes('tangue') || 
                         pass.name.toLowerCase().includes('papangue');
    
    if (needsTimeSlot) {
      setSelectedPass(pass);
      setShowTimeSlotModal(true);
    } else {
      // Ajouter directement au panier
      addToCart(pass.id);
      loadEventData(); // Recharger pour mettre à jour les stocks
    }
  };

  const handleTimeSlotSelection = async (timeSlotId: string) => {
    if (selectedPass) {
      const success = await addToCart(selectedPass.id, timeSlotId);
      if (success) {
        setShowTimeSlotModal(false);
        setSelectedPass(null);
        loadEventData(); // Recharger pour mettre à jour les stocks
      }
    }
  };

  const getActivityLabel = (activity: string) => {
    return activity === 'poney' ? 'Poney' : 'Tir à l\'Arc';
  };

  const getActivityIcon = (activity: string) => {
    return activity === 'poney' ? <Users className="h-4 w-4" /> : <Target className="h-4 w-4" />;
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
              <p className="text-blue-800 whitespace-pre-line">{event.key_info_content}</p>
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

      {/* Modal de sélection de créneau */}
      {showTimeSlotModal && selectedPass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Sélectionnez un créneau pour : {selectedPass.name}
              </h3>
              <p className="text-gray-600 mt-1">
                Choisissez l'horaire qui vous convient pour votre activité.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Créneaux Poney */}
                {timeSlots.filter(slot => slot.activity === 'poney').length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                      <Users className="h-5 w-5 text-green-600" />
                      Créneaux Poney
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {timeSlots
                        .filter(slot => slot.activity === 'poney')
                        .map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => handleTimeSlotSelection(slot.id)}
                            disabled={slot.remaining_capacity === 0}
                            className="w-full p-3 text-left border border-gray-200 rounded-md hover:border-green-300 hover:bg-green-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {format(new Date(slot.slot_time), 'HH:mm')}
                              </span>
                              <span className="text-sm text-gray-500">
                                {slot.remaining_capacity} place(s)
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Créneaux Tir à l'Arc */}
                {timeSlots.filter(slot => slot.activity === 'tir_arc').length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
                      <Target className="h-5 w-5 text-orange-600" />
                      Créneaux Tir à l'Arc
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {timeSlots
                        .filter(slot => slot.activity === 'tir_arc')
                        .map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => handleTimeSlotSelection(slot.id)}
                            disabled={slot.remaining_capacity === 0}
                            className="w-full p-3 text-left border border-gray-200 rounded-md hover:border-orange-300 hover:bg-orange-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium">
                                {format(new Date(slot.slot_time), 'HH:mm')}
                              </span>
                              <span className="text-sm text-gray-500">
                                {slot.remaining_capacity} place(s)
                              </span>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowTimeSlotModal(false);
                  setSelectedPass(null);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}