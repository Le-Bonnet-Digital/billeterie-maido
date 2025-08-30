import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addToCart } from '../lib/cart';
import { Calendar, Info, Plus, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MarkdownRenderer from '../components/MarkdownRenderer';
import useEventDetails, { Pass } from '../hooks/useEventDetails';
import { toast } from 'react-hot-toast';

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const { event, passes, loading, refresh, loadTimeSlotsForActivity } = useEventDetails(eventId);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  // Type de pass (utilise pass_type si fourni, sinon heuristique sur le nom)
  const classifyPassType = (p: Pass): 'moins_8' | 'plus_8' | 'luge_seule' | 'baby_poney' | 'other' => {
    if (p.pass_type) return p.pass_type;
    const n = (p.name || '').toLowerCase();
    if (/baby/.test(n) && /poney/.test(n)) return 'baby_poney';
    if (/luge/.test(n) && /seule/.test(n)) return 'luge_seule';
    if (/(moins|<)\s*de?\s*8/.test(n) || /(moins).*8/.test(n)) return 'moins_8';
    if (/(plus|>)\s*de?\s*8/.test(n) || /(plus).*8/.test(n)) return 'plus_8';
    return 'other';
  };

  // Disponible uniquement quand les pass -8 et +8 sont épuisés
  const isLugeOnlyAvailable = useMemo(() => {
    const moins = passes.find((p) => classifyPassType(p) === 'moins_8');
    const plus = passes.find((p) => classifyPassType(p) === 'plus_8');
    const moinsHas = (moins?.remaining_stock ?? 0) > 0;
    const plusHas = (plus?.remaining_stock ?? 0) > 0;
    return !moinsHas && !plusHas;
  }, [passes]);

  const handleAddToCart = (pass: Pass) => {
    setSelectedPass(pass);
    setSelectedQuantity(1);
    setShowPurchaseModal(true);
  };

  const handlePurchase = async (
    selectedSlots: { [key: number]: { [activityId: string]: string | undefined } },
    attendees: {
      [key: number]: { firstName?: string; lastName?: string; birthYear?: string; ack?: boolean };
    }
  ) => {
    if (!selectedPass) return;
    for (let i = 0; i < selectedQuantity; i++) {
      const a = attendees[i] || {};
      const attendee = {
        firstName: a.firstName,
        lastName: a.lastName,
        birthYear: a.birthYear ? parseInt(a.birthYear) : undefined,
        conditionsAck: a.ack === true,
      };
      for (const eventActivity of selectedPass.event_activities) {
        const timeSlotId = selectedSlots[i]?.[eventActivity.id];
        const success = await addToCart(
          selectedPass.id,
          eventActivity.id,
          timeSlotId,
          1,
          undefined,
          undefined,
          attendee
        );
        if (!success) {
          toast.error(`Erreur lors de l'ajout du pass ${i + 1}`);
          return;
        }
      }
    }

    setShowPurchaseModal(false);
    setSelectedPass(null);
    await refresh(); // Recharger pour mettre à jour les stocks
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
                      : `${pass.remaining_stock} restant(s)`}
                  </div>
                </div>
              </div>

              <p className="text-gray-600 mb-6">{pass.description}</p>
              {typeof pass.guaranteed_runs === 'number' && pass.guaranteed_runs > 0 && (
                <div className="mb-4 text-xs font-medium text-green-700 bg-green-50 border border-green-200 inline-block px-2 py-1 rounded">
                  Garantie {pass.guaranteed_runs} tour{pass.guaranteed_runs > 1 ? 's' : ''}
                </div>
              )}

              <button
                onClick={() => handleAddToCart(pass)}
                disabled={
                  pass.remaining_stock === 0 ||
                  (classifyPassType(pass) === 'luge_seule' && !isLugeOnlyAvailable)
                }
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
          quantity={selectedQuantity}
          onQuantityChange={setSelectedQuantity}
          onPurchase={(slots, attendees) => handlePurchase(slots, attendees)}
          loadTimeSlots={loadTimeSlotsForActivity}
          conditionsMarkdown={event?.key_info_content}
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
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onPurchase: (
    selectedSlots: { [key: number]: { [activityId: string]: string | undefined } },
    attendees: { [key: number]: { firstName?: string; lastName?: string; birthYear?: string; ack?: boolean } }
  ) => void;
  loadTimeSlots: (eventActivityId: string) => Promise<import('../lib/types').TimeSlot[]>;
  conditionsMarkdown?: string;
  onClose: () => void;
}

function PurchaseModal({
  pass,
  quantity,
  onQuantityChange,
  onPurchase,
  loadTimeSlots,
  conditionsMarkdown,
  onClose,
}: PurchaseModalProps) {
  const [slotsByActivity, setSlotsByActivity] = useState<Record<string, import('../lib/types').TimeSlot[]>>({});
  const [selectedSlots, setSelectedSlots] = useState<Record<number, Record<string, string | undefined>>>({});
  const [attendees, setAttendees] = useState<Record<number, { firstName?: string; lastName?: string; birthYear?: string; ack?: boolean }>>({});

  const ensureSlotsLoaded = async (eventActivityId: string) => {
    if (!slotsByActivity[eventActivityId]) {
      const slots = await loadTimeSlots(eventActivityId);
      setSlotsByActivity((prev) => ({ ...prev, [eventActivityId]: slots }));
    }
  };

  const allConfigured = useMemo(() => {
    return Array.from({ length: quantity }, (_, i) => i).every((i) =>
      pass.event_activities.every((ea) => {
        if (ea.requires_time_slot) {
          return !!selectedSlots[i]?.[ea.id];
        }
        return true;
      })
    );
  }, [quantity, pass.event_activities, selectedSlots]);

  const isBabyPoney = pass.pass_type === 'baby_poney';

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
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantité</label>
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

          {/* Créneaux pour chaque pass et activité */}
          <div className="space-y-4">
            {Array.from({ length: quantity }, (_, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Pass #{index + 1}</h4>

                {pass.event_activities.map((eventActivity) => (
                  <div key={eventActivity.id} className="mb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl">{eventActivity.activity.icon}</span>
                      <div className="font-medium">{eventActivity.activity.name}</div>
                    </div>
                    {eventActivity.requires_time_slot && (
                      <select
                        className="w-full px-3 py-2 border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        value={selectedSlots[index]?.[eventActivity.id] || ''}
                        onChange={(e) =>
                          setSelectedSlots((prev) => ({
                            ...prev,
                            [index]: { ...(prev[index] || {}), [eventActivity.id]: e.target.value },
                          }))
                        }
                        onFocus={() => ensureSlotsLoaded(eventActivity.id)}
                      >
                        <option value="" disabled>
                          Choisir un créneau
                        </option>
                        {(slotsByActivity[eventActivity.id] || []).map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {format(new Date(slot.slot_time), 'HH:mm — d MMM yyyy', { locale: fr })}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                {/* Informations participant */}
                <div className={`mt-4 grid grid-cols-1 gap-3 ${isBabyPoney ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                  <input
                    type="text"
                    placeholder="Prénom"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={attendees[index]?.firstName || ''}
                    onChange={(e) =>
                      setAttendees((prev) => ({ ...prev, [index]: { ...prev[index], firstName: e.target.value } }))
                    }
                  />
                  {!isBabyPoney && (
                    <input
                      type="text"
                      placeholder="Nom"
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={attendees[index]?.lastName || ''}
                      onChange={(e) =>
                        setAttendees((prev) => ({ ...prev, [index]: { ...prev[index], lastName: e.target.value } }))
                      }
                    />
                  )}
                  <input
                    type="number"
                    placeholder="Année de naissance (ex: 2012)"
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={attendees[index]?.birthYear || ''}
                    onChange={(e) =>
                      setAttendees((prev) => ({ ...prev, [index]: { ...prev[index], birthYear: e.target.value } }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Conditions d'accès */}
          {conditionsMarkdown && (
            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4">
              <div className="flex items-start gap-2 mb-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <span className="font-medium text-blue-900">Conditions d'accès</span>
              </div>
              <MarkdownRenderer className="text-sm text-blue-900" content={conditionsMarkdown} />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">Total: {(pass.price * quantity).toFixed(2)}€</div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => onPurchase(selectedSlots, attendees)}
              disabled={quantity === 0 || !allConfigured}
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
