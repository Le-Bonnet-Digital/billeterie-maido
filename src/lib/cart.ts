import { supabase } from './supabase';
import { isSupabaseConfigured } from './supabase';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from './errors';

/** Represents a pass returned by Supabase */
export interface Pass {
  id: string;
  name: string;
  price: number;
  description: string;
}

/** Represents an event activity returned by Supabase */
export interface EventActivity {
  id: string;
  activities: {
    id: string;
    name: string;
    icon: string;
  };
}

/** Represents a time slot returned by Supabase */
export interface TimeSlot {
  id: string;
  slot_time: string;
}

export interface CartItem {
  id: string;
  pass: Pass;
  eventActivity?: EventActivity;
  timeSlot?: TimeSlot;
  quantity: number;
}

// Générer un ID de session unique si pas déjà existant
export function getSessionId(): string {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

// Ajouter un article au panier
export async function addToCart(passId: string, eventActivityId?: string, timeSlotId?: string, quantity = 1): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    toast.error('Configuration requise. Veuillez connecter Supabase.');
    return false;
  }

  try {
    const sessionId = getSessionId();
    
    // Vérifier d'abord le stock disponible
    const { data: stockData } = await supabase
      .rpc('get_pass_remaining_stock', { pass_uuid: passId });
      
    if (stockData !== null && stockData < quantity) {
      toast.error('Stock insuffisant pour ce pass');
      return false;
    }
    
    // Si activité sélectionnée, vérifier le stock de l'activité
    if (eventActivityId) {
      const { data: activityStockData } = await supabase
        .rpc('get_event_activity_remaining_stock', { event_activity_id_param: eventActivityId });
        
      if (activityStockData !== null && activityStockData < quantity) {
        toast.error('Stock insuffisant pour cette activité');
        return false;
      }
    }
    
    // Si créneau requis, vérifier la capacité
    if (timeSlotId) {
      const { data: slotCapacityData } = await supabase
        .rpc('get_slot_remaining_capacity', { slot_uuid: timeSlotId });
      
      if (slotCapacityData !== null && slotCapacityData < quantity) {
        toast.error('Plus de places disponibles pour ce créneau');
        return false;
      }
    }
    
    // Nettoyer les articles expirés
    await supabase.rpc('cleanup_expired_cart_items');
    
    // Vérifier si l'article existe déjà dans le panier
    let query = supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('session_id', sessionId)
      .eq('pass_id', passId)
      .eq('event_activity_id', eventActivityId || null);
    
    if (timeSlotId) {
      query = query.eq('time_slot_id', timeSlotId);
    } else {
      query = query.is('time_slot_id', null);
    }
    
    const { data: existingItem } = await query.maybeSingle();
    
    if (existingItem) {
      // Mettre à jour la quantité
      const { error } = await supabase
        .from('cart_items')
        .update({ 
          quantity: existingItem.quantity + quantity,
          reserved_until: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
        .eq('id', existingItem.id);
        
      if (error) {
        console.error('Erreur mise à jour panier:', error);
        toast.error('Erreur lors de la mise à jour du panier');
        return false;
      }
    } else {
      // Ajouter nouvel article
      const { error } = await supabase
        .from('cart_items')
        .insert({
          session_id: sessionId,
          pass_id: passId,
          event_activity_id: eventActivityId,
          time_slot_id: timeSlotId,
          quantity: quantity
        });
        
      if (error) {
        console.error('Erreur ajout panier:', error);
        toast.error('Erreur lors de l\'ajout au panier');
        return false;
      }
    }
    
    toast.success('Article ajouté au panier');
    return true;
  } catch (err) {
    console.error('Erreur addToCart:', err);
    toast.error('Une erreur est survenue');
    return false;
  }
}

// Récupérer les articles du panier
export async function getCartItems(): Promise<CartItem[]> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, returning empty cart');
    return [];
  }

  try {
    const sessionId = getSessionId();
    
    // Nettoyer les articles expirés
    try {
      await supabase.rpc('cleanup_expired_cart_items');
    } catch (cleanupError) {
      console.warn('Could not cleanup expired cart items:', cleanupError);
    }
    
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        event_activity_id,
        passes:pass_id (
          id,
          name,
          price,
          description
        ),
        event_activities:event_activity_id (
          id,
          activities (
            id,
            name,
            icon
          )
        ),
        time_slots:time_slot_id (
          id,
          slot_time
        )
      `)
      .eq('session_id', sessionId)
      .gt('reserved_until', new Date().toISOString());
      
    if (error) {
      console.error('Erreur récupération panier:', error);
      // Si c'est une erreur de connectivité, retourner un tableau vide plutôt que de faire planter l'app
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        console.warn('Network error, returning empty cart');
        return [];
      }
      return [];
    }
    
    interface CartItemFromDB {
      id: string;
      quantity: number;
      passes: Pass;
      event_activities: EventActivity | null;
      time_slots: TimeSlot | null;
    }

    const typedData: CartItemFromDB[] = data || [];

    return typedData.map(item => ({
      id: item.id,
      pass: item.passes,
      eventActivity: item.event_activities ?? undefined,
      timeSlot: item.time_slots ?? undefined,
      quantity: item.quantity
    }));
  } catch (err) {
    console.error('Erreur getCartItems:', err);
    return [];
  }
}

// Supprimer un article du panier
export async function removeFromCart(cartItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);
      
    if (error) {
      console.error('Erreur suppression panier:', error);
      toast.error('Erreur lors de la suppression');
      return false;
    }
    
    toast.success('Article supprimé du panier');
    return true;
  } catch (err) {
    console.error('Erreur removeFromCart:', err);
    toast.error('Une erreur est survenue');
    return false;
  }
}

// Vider le panier
export async function clearCart(): Promise<boolean> {
  try {
    const sessionId = getSessionId();
    
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('session_id', sessionId);
      
    if (error) {
      console.error('Erreur vidage panier:', error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Erreur clearCart:', err);
    return false;
  }
}

// Calculer le total du panier
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + (item.pass.price * item.quantity), 0);
}