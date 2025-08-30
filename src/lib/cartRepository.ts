import { supabase, isSupabaseConfigured } from './supabase';
import { logger } from './logger';

/** Interface décrivant les opérations possibles sur le panier. */
export interface CartRepository {
  isConfigured(): boolean;
  getPassRemainingStock(passId: string): Promise<number | null>;
  getEventActivityRemainingStock(eventActivityId: string): Promise<number | null>;
  getSlotRemainingCapacity(timeSlotId: string): Promise<number | null>;
  getActivityVariantRemainingStock(variantId: string): Promise<number | null>;
  cleanupExpiredCartItems(): Promise<void>;
  findCartItem(sessionId: string, passId: string): Promise<{ id: string; quantity: number } | null>;
  updateCartItem(id: string, newQuantity: number): Promise<boolean>;
  insertCartItem(
    sessionId: string,
    passId: string | null,
    activities?: { eventActivityId: string; timeSlotId?: string }[],
    quantity?: number,
    attendee?: { firstName?: string; lastName?: string; birthYear?: number; conditionsAck?: boolean },
    product?: { type?: 'event_pass' | 'activity_variant'; id?: string }
  ): Promise<boolean>;
}

/**
 * Implémentation de `CartRepository` basée sur Supabase.
 */
export class SupabaseCartRepository implements CartRepository {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /** @inheritdoc */
  async getPassRemainingStock(passId: string): Promise<number | null> {
    const { data } = await supabase.rpc('get_pass_remaining_stock', { pass_uuid: passId });
    return data as number | null;
  }

  /** @inheritdoc */
  async getEventActivityRemainingStock(eventActivityId: string): Promise<number | null> {
    const { data } = await supabase.rpc('get_event_activity_remaining_stock', { event_activity_id_param: eventActivityId });
    return data as number | null;
  }

  /** @inheritdoc */
  async getSlotRemainingCapacity(timeSlotId: string): Promise<number | null> {
    const { data } = await supabase.rpc('get_slot_remaining_capacity', { slot_uuid: timeSlotId });
    return data as number | null;
  }

  /** @inheritdoc */
  async getActivityVariantRemainingStock(variantId: string): Promise<number | null> {
    const { data } = await supabase.rpc('get_activity_variant_remaining_stock', { variant_uuid: variantId });
    return data as number | null;
  }

  /** @inheritdoc */
  async cleanupExpiredCartItems(): Promise<void> {
    await supabase.rpc('cleanup_expired_cart_items');
  }

  /** @inheritdoc */
  async findCartItem(sessionId: string, passId: string): Promise<{ id: string; quantity: number } | null> {
    const { data } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('session_id', sessionId)
      .eq('pass_id', passId)
      .maybeSingle();
    return data as { id: string; quantity: number } | null;
  }

  /** @inheritdoc */
  async updateCartItem(id: string, newQuantity: number): Promise<boolean> {
    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: newQuantity,
        reserved_until: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      })
      .eq('id', id);
    return !error;
  }

  /** @inheritdoc */
  async insertCartItem(
    sessionId: string,
    passId: string | null,
    activities: { eventActivityId: string; timeSlotId?: string }[] = [],
    quantity = 1,
    attendee?: { firstName?: string; lastName?: string; birthYear?: number; conditionsAck?: boolean },
    product?: { type?: 'event_pass' | 'activity_variant'; id?: string }
  ): Promise<boolean> {
    const { error } = await supabase.rpc('reserve_pass_with_stock_check', {
      session_id: sessionId,
      pass_id: product?.type === 'activity_variant' ? null : passId,
      activities: activities.map(a => ({ event_activity_id: a.eventActivityId, time_slot_id: a.timeSlotId ?? null })),
      quantity,
      attendee_first_name: attendee?.firstName,
      attendee_last_name: attendee?.lastName,
      attendee_birth_year: attendee?.birthYear,
      access_conditions_ack: attendee?.conditionsAck ?? false,
      product_type: product?.type ?? 'event_pass',
      product_id: product?.id ?? null,
    });
    if (error) {
      logger.error('Erreur insertion cart_items', {
        error,
        payload: {
          sessionId,
          passId: product?.type === 'event_pass' ? passId : null,
          activitiesLength: activities.length,
          quantity,
          productType: product?.type ?? 'event_pass',
          productId: product?.id ?? null,
          attendeeProvided: !!attendee,
        },
      });
      return false;
    }
    return true;
  }
}
