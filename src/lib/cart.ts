import { supabase } from './supabase';
import { isSupabaseConfigured } from './supabase';
import { toast } from 'react-hot-toast';

export interface CartItem {
  id: string;
  pass: {
    id: string;
    name: string;
    price: number;
    description: string;
  };
  timeSlot?: {
    id: string;
    activity: string;
    slot_time: string;
  };
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
export async function addToCart(passId: string, timeSlotId?: string, quantity = 1): Promise<boolean> {
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
    
    // Si créneau requis, vérifier la capacité
    if (timeSlotId) {
      // Check both slot capacity and activity resource capacity
      const { data: slotData } = await supabase
        .from('time_slots')
        .select(`
          capacity,
          activity_resource_id,
          activity_resources!time_slots_activity_resource_id_fkey (
            id,
            total_capacity
          )
        `)
        .eq('id', timeSlotId)
        .single();
      
      if (slotData) {
        // Get slot remaining capacity
        const { data: slotCapacityData } = await supabase
          .rpc('get_slot_remaining_capacity', { slot_uuid: timeSlotId });
        
        // Get activity resource remaining capacity
        let activityCapacity = 999999;
        if (slotData.activity_resources) {
          const { data: activityCapacityData } = await supabase
            .rpc('get_activity_remaining_capacity', { 
              activity_resource_uuid: slotData.activity_resources.id 
            });
          activityCapacity = activityCapacityData || 0;
        }
        
        const remainingCapacity = Math.min(slotCapacityData || 0, activityCapacity);
        
        if (remainingCapacity < quantity) {
          toast.error('Plus de places disponibles pour ce créneau');
          return false;
        }
      }
    }
    
    // Nettoyer les articles expirés
    await supabase.rpc('cleanup_expired_cart_items');
    
    // Vérifier si l'article existe déjà dans le panier
    let query = supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('session_id', sessionId)
      .eq('pass_id', passId);
    
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
    return [];
  }

  try {
    const sessionId = getSessionId();
    
    // Nettoyer les articles expirés
    await supabase.rpc('cleanup_expired_cart_items');
    
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        passes:pass_id (
          id,
          name,
          price,
          description
        ),
        time_slots:time_slot_id (
          id,
          activity,
          slot_time
        )
      `)
      .eq('session_id', sessionId)
      .gt('reserved_until', new Date().toISOString());
      
    if (error) {
      console.error('Erreur récupération panier:', error);
      return [];
    }
    
    return (data || []).map(item => ({
      id: item.id,
      pass: item.passes as any,
      timeSlot: item.time_slots as any,
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