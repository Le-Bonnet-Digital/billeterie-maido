import { supabase, isSupabaseConfigured } from './supabase';
import { getErrorMessage } from './errors';
import { logger } from './logger';
import type { CartRepository } from './cartRepository';
import { SupabaseCartRepository } from './cartRepository';
import { toastNotify, type NotifyFn } from './notifications';

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

export async function validateStock(
  repo: CartRepository,
  passId: string,
  eventActivityId: string | undefined,
  timeSlotId: string | undefined,
  quantity: number,
): Promise<string | null> {
  const passStock = await repo.getPassRemainingStock(passId);
  if (passStock !== null && passStock < quantity) {
    return 'Stock insuffisant pour ce pass';
  }

  if (eventActivityId) {
    const activityStock = await repo.getEventActivityRemainingStock(eventActivityId);
    if (activityStock !== null && activityStock < quantity) {
      return 'Stock insuffisant pour cette activité';
    }
  }

  if (timeSlotId) {
    const slotCapacity = await repo.getSlotRemainingCapacity(timeSlotId);
    if (slotCapacity !== null && slotCapacity < quantity) {
      return 'Plus de places disponibles pour ce créneau';
    }
  }
  return null;
}

export async function updateExistingItem(
  repo: CartRepository,
  existingItem: { id: string; quantity: number },
  quantity: number,
): Promise<boolean> {
  return repo.updateCartItem(existingItem.id, existingItem.quantity + quantity);
}

export async function insertNewItem(
  repo: CartRepository,
  sessionId: string,
  passId: string,
  eventActivityId: string | undefined,
  timeSlotId: string | undefined,
  quantity: number,
): Promise<boolean> {
  return repo.insertCartItem(sessionId, passId, eventActivityId, timeSlotId, quantity);
}

export function notifyUser(notify: NotifyFn, type: 'success' | 'error', message: string): void {
  notify(type, message);
}

// Ajouter un article au panier
export async function addToCart(
  passId: string,
  eventActivityId?: string,
  timeSlotId?: string,
  quantity = 1,
  repo: CartRepository = new SupabaseCartRepository(),
  notify: NotifyFn = toastNotify,
): Promise<boolean> {
  if (!repo.isConfigured()) {
    notifyUser(notify, 'error', 'Configuration requise. Veuillez connecter Supabase.');
    return false;
  }

  try {
    const sessionId = getSessionId();

    const stockError = await validateStock(repo, passId, eventActivityId, timeSlotId, quantity);
    if (stockError) {
      notifyUser(notify, 'error', stockError);
      return false;
    }

    await repo.cleanupExpiredCartItems();

    const existingItem = await repo.findCartItem(sessionId, passId, eventActivityId, timeSlotId);

    let success = false;
    if (existingItem) {
      success = await updateExistingItem(repo, existingItem, quantity);
      if (!success) {
        notifyUser(notify, 'error', 'Erreur lors de la mise à jour du panier');
      }
    } else {
      success = await insertNewItem(repo, sessionId, passId, eventActivityId, timeSlotId, quantity);
      if (!success) {
        notifyUser(notify, 'error', "Erreur lors de l'ajout au panier");
      }
    }

    if (success) {
      notifyUser(notify, 'success', 'Article ajouté au panier');
    }

    return success;
  } catch (err) {
    logger.error('Erreur addToCart', {
      error: err,
      query: { action: 'addToCart', passId, eventActivityId, timeSlotId },
    });
    notifyUser(notify, 'error', 'Une erreur est survenue');
    return false;
  }
}

// Récupérer les articles du panier
export async function getCartItems(): Promise<CartItem[]> {
  if (!isSupabaseConfigured()) {
    logger.warn('Supabase not configured, returning empty cart');
    return [];
  }

  try {
    const sessionId = getSessionId();
    
    // Nettoyer les articles expirés
    try {
      await supabase.rpc('cleanup_expired_cart_items');
    } catch (cleanupError) {
      logger.warn('Could not cleanup expired cart items', {
        error: cleanupError,
        query: { function: 'cleanup_expired_cart_items' }
      });
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
      logger.error('Erreur récupération panier', {
        error,
        query: { table: 'cart_items', action: 'select', sessionId }
      });
      // Si c'est une erreur de connectivité, retourner un tableau vide plutôt que de faire planter l'app
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
        logger.warn('Network error, returning empty cart', { error });
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
    logger.error('Erreur getCartItems', { error: err });
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
      logger.error('Erreur suppression panier', {
        error,
        query: { table: 'cart_items', action: 'delete', id: cartItemId }
      });
      notifyUser(toastNotify, 'error', 'Erreur lors de la suppression');
      return false;
    }

    notifyUser(toastNotify, 'success', 'Article supprimé du panier');
    return true;
  } catch (err) {
    logger.error('Erreur removeFromCart', { error: err, query: { id: cartItemId } });
    notifyUser(toastNotify, 'error', 'Une erreur est survenue');
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
      logger.error('Erreur vidage panier', {
        error,
        query: { table: 'cart_items', action: 'clear', sessionId }
      });
      return false;
    }
    
    return true;
  } catch (err) {
    logger.error('Erreur clearCart', { error: err });
    return false;
  }
}

// Calculer le total du panier
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + (item.pass.price * item.quantity), 0);
}