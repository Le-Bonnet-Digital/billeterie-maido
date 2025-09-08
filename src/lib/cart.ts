import { supabase, isSupabaseConfigured } from './supabase';
import { getErrorMessage } from './errors';
import { logger } from './logger';
import type { CartRepository } from './cartRepository';
import { SupabaseCartRepository } from './cartRepository';
import { toastNotify, type NotifyFn } from './notifications';
import { safeStorage } from './storage';

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
  attendee?: {
    firstName?: string;
    lastName?: string;
    birthYear?: number;
    conditionsAck?: boolean;
  };
}

// Générer un ID de session unique si pas déjà existant
/**
 * Récupère l'identifiant de session du panier depuis le stockage.
 * En crée un nouveau s'il n'existe pas.
 * @returns Identifiant de session
 */
export function getSessionId(): string {
  let sessionId = safeStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    safeStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Vérifie la disponibilité des stocks pour un article donné.
 * @returns Un message d'erreur ou `null` si tout est disponible
 */
export async function validateStock(
  repo: CartRepository,
  passId: string,
  activities: { eventActivityId: string; timeSlotId?: string }[],
  quantity: number,
): Promise<string | null> {
  const passStock = await repo.getPassRemainingStock(passId);
  if (passStock !== null && passStock < quantity) {
    return 'Stock insuffisant pour ce pass';
  }

  for (const activity of activities) {
    const activityStock = await repo.getEventActivityRemainingStock(
      activity.eventActivityId,
    );
    if (activityStock !== null && activityStock < quantity) {
      return 'Stock insuffisant pour cette activité';
    }

    if (activity.timeSlotId) {
      const slotCapacity = await repo.getSlotRemainingCapacity(
        activity.timeSlotId,
      );
      if (slotCapacity !== null && slotCapacity < quantity) {
        return 'Plus de places disponibles pour ce créneau';
      }
    }
  }

  return null;
}

/**
 * Met à jour la quantité d'un article déjà présent dans le panier.
 * @returns `true` en cas de succès
 */
export async function updateExistingItem(
  repo: CartRepository,
  existingItem: { id: string; quantity: number },
  quantity: number,
): Promise<boolean> {
  return repo.updateCartItem(existingItem.id, existingItem.quantity + quantity);
}

/**
 * Insère un nouvel article dans le panier.
 * @returns `true` en cas de succès
 */
export async function insertNewItem(
  repo: CartRepository,
  sessionId: string,
  passId: string | null,
  activities: { eventActivityId: string; timeSlotId?: string }[] | undefined,
  quantity: number,
  attendee?: {
    firstName?: string;
    lastName?: string;
    birthYear?: number;
    conditionsAck?: boolean;
  },
  product?: { type?: 'event_pass' | 'activity_variant'; id?: string },
): Promise<boolean> {
  return repo.insertCartItem(
    sessionId,
    passId,
    activities,
    quantity,
    attendee,
    product,
  );
}

/**
 * Affiche une notification à l'utilisateur.
 * @param notify Fonction de notification
 * @param type Type de notification
 * @param message Message à afficher
 */
export function notifyUser(
  notify: NotifyFn,
  type: 'success' | 'error',
  message: string,
): void {
  notify(type, message);
}

// Ajouter un article au panier
/**
 * Ajoute un article au panier en gérant le stock et les notifications.
 * @returns `true` si l'opération réussit
 * @sideeffects Écrit dans le logger et affiche des notifications
 */
export async function addToCart(
  passId: string,
  activities: { eventActivityId: string; timeSlotId?: string }[],
  quantity = 1,
  repo: CartRepository = new SupabaseCartRepository(),
  notify: NotifyFn = toastNotify,
  attendee?: {
    firstName?: string;
    lastName?: string;
    birthYear?: number;
    conditionsAck?: boolean;
  },
): Promise<boolean> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    notifyUser(notify, 'error', 'La quantité doit être un entier positif');
    return false;
  }
  if (!repo.isConfigured()) {
    notifyUser(
      notify,
      'error',
      'Configuration requise. Veuillez connecter Supabase.',
    );
    return false;
  }

  try {
    const sessionId = getSessionId();

    const stockError = await validateStock(repo, passId, activities, quantity);
    if (stockError) {
      notifyUser(notify, 'error', stockError);
      return false;
    }

    await repo.cleanupExpiredCartItems();

    // Si des informations d'attestation/participant sont fournies ou si des activités sont associées,
    // on évite d'agréger afin de conserver les infos par billet.
    const existingItem =
      attendee || activities.length > 0
        ? null
        : await repo.findCartItem(sessionId, passId);

    let success = false;
    if (existingItem) {
      success = await updateExistingItem(repo, existingItem, quantity);
      if (!success) {
        notifyUser(notify, 'error', 'Erreur lors de la mise à jour du panier');
      }
    } else {
      success = await insertNewItem(
        repo,
        sessionId,
        passId,
        activities,
        quantity,
        attendee,
        { type: 'event_pass', id: passId },
      );
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
      query: { action: 'addToCart', passId, activities: activities.length },
    });
    notifyUser(notify, 'error', 'Une erreur est survenue');
    return false;
  }
}

// Récupérer les articles du panier
/**
 * Récupère les articles du panier courant.
 * @returns La liste des articles
 */
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
        query: { function: 'cleanup_expired_cart_items' },
      });
    }

    const baseQuery = () =>
      supabase
        .from('cart_items')
        .select(
          `
        id,
        quantity,
        attendee_first_name,
        attendee_last_name,
        attendee_birth_year,
        access_conditions_ack,
        product_type,
        product_id,
        pass_id,
        time_slot_id
      `,
        )
        .eq('session_id', sessionId)
        .gt('reserved_until', new Date().toISOString());

    // 1st attempt: with attendee fields
    type CartRow = CartItemFromDB & {
      product_type?: 'event_pass' | 'activity_variant' | null;
      product_id?: string | null;
    };
    type QueryResult<T> = { data: T[] | null; error: unknown | null };
    let res = (await baseQuery()) as QueryResult<CartRow>;

    // Fallback if DB not migrated yet OR any server error (reduce 500 noise)
    if (res?.error) {
      const simpleQuery = () =>
        supabase
          .from('cart_items')
          .select(
            `
          id,
          quantity,
          product_type,
          product_id,
          pass_id,
          time_slot_id
        `,
          )
          .eq('session_id', sessionId)
          .gt('reserved_until', new Date().toISOString());
      try {
        res = (await simpleQuery()) as QueryResult<CartRow>;
      } catch {
        void 0; // keep original error handling below
      }
    }

    const { data, error } = res;
    if (error) {
      logger.error('Erreur récupération panier', {
        error,
        query: { table: 'cart_items', action: 'select', sessionId },
      });
      // Si c'est une erreur de connectivité, retourner un tableau vide plutôt que de faire planter l'app
      const errorMessage = getErrorMessage(error);
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('fetch')
      ) {
        logger.warn('Network error, returning empty cart', { error });
        return [];
      }
      return [];
    }

    interface CartItemFromDB {
      id: string;
      quantity: number;
      pass_id?: string | null;
      time_slot_id?: string | null;
      attendee_first_name?: string | null;
      attendee_last_name?: string | null;
      attendee_birth_year?: number | null;
      access_conditions_ack?: boolean | null;
    }

    const typedData: CartRow[] = (data || []) as CartRow[];

    // Preload related entities without using PostgREST embeddings (avoid FK dependency)
    const passIds = Array.from(
      new Set(
        typedData
          .filter((i) => i.product_type !== 'activity_variant' && !!i.pass_id)
          .map((i) => i.pass_id as string),
      ),
    );
    const passesById: Record<string, Pass> = {};
    if (passIds.length > 0) {
      try {
        const { data: passes } = await supabase
          .from('passes')
          .select('id, name, price, description')
          .in('id', passIds);
        (passes || []).forEach((p) => {
          passesById[p.id] = {
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description,
          };
        });
      } catch {
        void 0;
      }
    }

    // Charger les activités et créneaux associés aux items du panier
    const cartItemIds = typedData.map((i) => i.id);
    interface CartItemActivityRow {
      cart_item_id: string;
      event_activity_id: string;
      time_slot_id: string | null;
      event_activities: {
        id: string;
        activities: { id: string; name: string; icon: string };
      };
    }
    let activityRows: CartItemActivityRow[] = [];
    const activitiesByItem: Record<string, CartItemActivityRow> = {};
    if (cartItemIds.length > 0) {
      try {
        const { data: actRows } = await supabase
          .from('cart_item_activities')
          .select(
            `cart_item_id, event_activity_id, time_slot_id, event_activities!inner(id, activities(id, name, icon))`,
          )
          .in('cart_item_id', cartItemIds);
        activityRows = (actRows || []) as unknown as CartItemActivityRow[];
        activityRows.forEach((row) => {
          if (!activitiesByItem[row.cart_item_id]) {
            activitiesByItem[row.cart_item_id] = row;
          }
        });
      } catch {
        void 0;
      }
    }

    const slotIds = Array.from(
      new Set(
        activityRows
          .filter((r) => !!r.time_slot_id)
          .map((r) => r.time_slot_id as string),
      ),
    );
    const slotsById: Record<string, TimeSlot> = {};
    if (slotIds.length > 0) {
      try {
        const { data: slots } = await supabase
          .from('time_slots')
          .select('id, slot_time')
          .in('id', slotIds);
        (slots || []).forEach((s) => {
          slotsById[s.id] = { id: s.id, slot_time: s.slot_time };
        });
      } catch {
        void 0;
      }
    }

    // For activity variants, load minimal info to display in cart
    const missingVariantIds = typedData
      .filter((i) => i.product_type === 'activity_variant' && !!i.product_id)
      .map((i) => i.product_id as string);
    const variantsById: Record<
      string,
      { id: string; name: string; price: number; description: string }
    > = {};
    if (missingVariantIds.length > 0) {
      try {
        const { data: variants } = await supabase
          .from('activity_variants')
          .select('id, name, price, activity_id')
          .in('id', missingVariantIds);
        // Fetch activity descriptions for better display (optional)
        const actIds = Array.from(
          new Set(
            (variants || []).map((v: { activity_id: string }) => v.activity_id),
          ),
        );
        const actsById: Record<string, { description?: string }> = {};
        if (actIds.length > 0) {
          const { data: acts } = await supabase
            .from('activities')
            .select('id, parc_description')
            .in('id', actIds);
          (acts || []).forEach(
            (a: { id: string; parc_description: string | null }) => {
              actsById[a.id] = { description: a.parc_description || '' };
            },
          );
        }
        (variants || []).forEach(
          (v: {
            id: string;
            name: string;
            price: number;
            activity_id: string;
          }) => {
            variantsById[v.id] = {
              id: v.id,
              name: v.name,
              price: v.price,
              description: actsById[v.activity_id]?.description || '',
            };
          },
        );
      } catch {
        void 0;
      }
    }

    return typedData.map((item) => {
      let pass: Pass | undefined;
      if (item.product_type === 'activity_variant') {
        const v = variantsById[item.product_id as string];
        if (v)
          pass = {
            id: v.id,
            name: v.name,
            price: v.price,
            description: v.description || '',
          } as Pass;
      } else if (item.pass_id) {
        const p = passesById[item.pass_id];
        if (p) pass = p;
      }
      const activityInfo = activitiesByItem[item.id];
      return {
        id: item.id,
        pass: pass as Pass, // expected by consumers
        eventActivity: activityInfo
          ? {
              id: activityInfo.event_activity_id,
              activities: activityInfo.event_activities.activities,
            }
          : undefined,
        timeSlot: activityInfo?.time_slot_id
          ? slotsById[activityInfo.time_slot_id]
          : undefined,
        quantity: item.quantity,
        attendee: {
          firstName: item.attendee_first_name ?? undefined,
          lastName: item.attendee_last_name ?? undefined,
          birthYear: item.attendee_birth_year ?? undefined,
          conditionsAck: item.access_conditions_ack ?? undefined,
        },
      } as CartItem;
    });
  } catch (err) {
    logger.error('Erreur getCartItems', { error: err });
    return [];
  }
}

// Supprimer un article du panier
/**
 * Supprime un article du panier.
 * @param cartItemId Identifiant de l'article
 * @returns `true` si la suppression réussit
 */
export async function removeFromCart(cartItemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      logger.error('Erreur suppression panier', {
        error,
        query: { table: 'cart_items', action: 'delete', id: cartItemId },
      });
      notifyUser(toastNotify, 'error', 'Erreur lors de la suppression');
      return false;
    }

    notifyUser(toastNotify, 'success', 'Article supprimé du panier');
    return true;
  } catch (err) {
    logger.error('Erreur removeFromCart', {
      error: err,
      query: { id: cartItemId },
    });
    notifyUser(toastNotify, 'error', 'Une erreur est survenue');
    return false;
  }
}

// Vider le panier
/**
 * Vide entièrement le panier.
 * @returns `true` si l'opération réussit
 */
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
        query: { table: 'cart_items', action: 'clear', sessionId },
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
/**
 * Calcule le montant total du panier.
 * @param items Articles du panier
 * @returns Total en euros
 */
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce(
    (total, item) => total + item.pass.price * item.quantity,
    0,
  );
}

// Add an activity variant to cart (Parc activity-first model)
export async function addActivityVariantToCart(
  variantId: string,
  quantity = 1,
  repo: CartRepository = new SupabaseCartRepository(),
  notify: NotifyFn = toastNotify,
  attendee?: {
    firstName?: string;
    lastName?: string;
    birthYear?: number;
    conditionsAck?: boolean;
  },
): Promise<boolean> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    notifyUser(notify, 'error', 'La quantité doit être un entier positif');
    return false;
  }
  if (!repo.isConfigured()) {
    notifyUser(
      notify,
      'error',
      'Configuration requise. Veuillez connecter Supabase.',
    );
    return false;
  }

  try {
    const sessionId = getSessionId();
    const remaining = await repo.getActivityVariantRemainingStock(variantId);
    if (remaining !== null && remaining < quantity) {
      notifyUser(notify, 'error', 'Stock insuffisant pour cette variante');
      return false;
    }

    await repo.cleanupExpiredCartItems();

    const success = await insertNewItem(
      repo,
      sessionId,
      null,
      undefined,
      quantity,
      attendee,
      { type: 'activity_variant', id: variantId },
    );

    if (success) notifyUser(notify, 'success', 'Variante ajoutée au panier');
    return success;
  } catch (err) {
    logger.error('Erreur addActivityVariantToCart', {
      error: err,
      query: { action: 'addActivityVariantToCart', variantId },
    });
    notifyUser(notify, 'error', 'Une erreur est survenue');
    return false;
  }
}
