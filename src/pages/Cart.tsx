import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import CheckoutForm, { type CustomerData } from '../components/CheckoutForm';
import { getCartItems, removeFromCart, calculateCartTotal, type CartItem } from '../lib/cart';
import { supabase } from '../lib/supabase';
import { ShoppingCart, Trash2, ArrowLeft, CreditCard, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

export default function Cart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const items = await getCartItems();
      setCartItems(items);
    } catch (err) {
      console.error('Erreur chargement panier:', err);
      toast.error('Erreur lors du chargement du panier');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    const success = await removeFromCart(cartItemId);
    if (success) {
      loadCart(); // Recharger le panier
    }
  };

  const handleCheckout = async () => {
    if (!acceptedTerms) {
      toast.error('Vous devez accepter les conditions générales de vente');
      return;
    }
    
    if (cartItems.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }
    
    setShowCheckoutForm(true);
  };

  const handleCustomerSubmit = async (customerData: CustomerData) => {
    setProcessingPayment(true);
    
    try {
      // Simuler le processus de paiement
      toast.loading('Traitement du paiement...', { duration: 3000 });
      
      // Attendre 3 secondes pour simuler le paiement
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Créer les réservations pour chaque article du panier
      const reservations = [];
      
      for (const item of cartItems) {
        const { data: reservation, error } = await supabase
          .from('reservations')
          .insert({
            client_email: customerData.email,
            pass_id: item.pass.id,
            event_activity_id: item.eventActivity?.id || null,
            time_slot_id: item.timeSlot?.id || null,
            payment_status: 'paid'
          })
          .select(`
            id,
            reservation_number,
            passes!inner (name, price),
            event_activities (
              activities (name)
            ),
            time_slots (activity, slot_time),
            events!inner (name)
          `)
          .single();
          
        if (error) throw error;
        reservations.push(reservation);
      }
      
      // Vider le panier
      const sessionId = localStorage.getItem('cart_session_id');
      if (sessionId) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('session_id', sessionId);
      }
      
      // Afficher la confirmation pour la première réservation
      if (reservations.length > 0) {
        const firstReservation = reservations[0];
        const eventName = cartItems[0]?.pass ? 'Les Défis Lontan' : 'Événement'; // Nom par défaut
        setConfirmationData({
          reservationNumber: firstReservation.reservation_number,
          email: customerData.email,
          eventName: eventName,
          passName: firstReservation.passes.name,
          price: firstReservation.passes.price,
          timeSlot: firstReservation.time_slots
        });
        setShowConfirmation(true);
      }
      
      // Vider le panier local
      setCartItems([]);
      setAcceptedTerms(false);
      setShowCheckoutForm(false);
      
      toast.success('Paiement réussi ! Réservation confirmée.');
      
    } catch (err) {
      console.error('Erreur lors du paiement:', err);
      toast.error('Erreur lors du paiement. Veuillez réessayer.');
    } finally {
      setProcessingPayment(false);
    }
  };
    

  const total = calculateCartTotal(cartItems);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du panier...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation */}
      <div className="mb-8">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Continuer mes achats
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Mon Panier</h1>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
            {cartItems.length} article(s)
          </span>
        </div>
      </div>

      {cartItems.length === 0 ? (
        /* Panier vide */
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Votre panier est vide</h2>
          <p className="text-gray-600 mb-6">
            Découvrez nos événements et ajoutez des billets à votre panier !
          </p>
          <Link
            to="/"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Voir les événements
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Articles du panier */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Vos billets</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {cartItems.map((item) => (
                <div key={item.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {item.pass.name}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        {item.pass.description}
                      </p>
                      
                      {item.timeSlot && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-md px-3 py-1 inline-flex">
                          {item.eventActivity && (
                            <>
                              <span className="text-lg">{item.eventActivity.activities.icon}</span>
                              <span className="font-medium">{item.eventActivity.activities.name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {format(new Date(item.timeSlot.slot_time), 'HH:mm')}
                          </span>
                        </div>
                      )}
                      
                      {item.eventActivity && !item.timeSlot && (
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-md px-3 py-1 inline-flex">
                          <span className="text-lg">{item.eventActivity.activities.icon}</span>
                          <span className="font-medium">{item.eventActivity.activities.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-6">
                      <div className="text-lg font-semibold text-gray-900 mb-2">
                        {item.pass.price}€
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Récapitulatif</h2>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total</span>
                <span>{total.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-lg border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{total.toFixed(2)}€</span>
              </div>
            </div>

            {/* Acceptation des CGV */}
            <div className="mb-6">
              <button
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className="flex items-start gap-3 text-left"
              >
                {acceptedTerms ? (
                  <CheckSquare className="h-5 w-5 text-blue-600 mt-0.5" />
                ) : (
                  <Square className="h-5 w-5 text-gray-400 mt-0.5" />
                )}
                <span className="text-sm text-gray-700">
                  Je reconnais avoir lu et accepté les{' '}
                  <Link to="/event/550e8400-e29b-41d4-a716-446655440000/cgv" className="text-blue-600 underline hover:text-blue-700">
                    Conditions Générales de Vente
                  </Link>
                </span>
              </button>
            </div>

            {/* Bouton de paiement */}
            {!showCheckoutForm ? (
              <button
                onClick={handleCheckout}
                disabled={!acceptedTerms || cartItems.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Procéder au paiement ({total.toFixed(2)}€)
              </button>
            ) : (
              <CheckoutForm 
                onSubmit={handleCustomerSubmit}
                loading={processingPayment}
              />
            )}
            
            <p className="text-xs text-gray-500 text-center mt-2">
              Paiement 100% sécurisé par Stripe
            </p>
          </div>
        </div>
      )}
      
      {/* Modal de confirmation */}
      {confirmationData && (
        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          reservationNumber={confirmationData.reservationNumber}
          email={confirmationData.email}
          eventName={confirmationData.eventName}
          passName={confirmationData.passName}
          price={confirmationData.price}
          timeSlot={confirmationData.timeSlot}
        />
      )}
    </div>
  );
}