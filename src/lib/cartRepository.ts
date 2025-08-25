import { supabase, isSupabaseConfigured } from './supabase';

export interface CartRepository {
  isConfigured(): boolean;
  getPassRemainingStock(passId: string): Promise<number | null>;
  getEventActivityRemainingStock(eventActivityId: string): Promise<number | null>;
  getSlotRemainingCapacity(timeSlotId: string): Promise<number | null>;
  cleanupExpiredCartItems(): Promise<void>;
  findCartItem(sessionId: string, passId: string, eventActivityId?: string, timeSlotId?: string): Promise<{ id: string; quantity: number } | null>;
  updateCartItem(id: string, newQuantity: number): Promise<boolean>;
  insertCartItem(sessionId: string, passId: string, eventActivityId?: string, timeSlotId?: string, quantity?: number): Promise<boolean>;
}

export class SupabaseCartRepository implements CartRepository {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  async getPassRemainingStock(passId: string): Promise<number | null> {
    const { data } = await supabase.rpc('get_pass_remaining_stock', { pass_uuid: passId });
    return data as number | null;
  }

  async getEventActivityRemainingStock(eventActivityId: string): Promise<number | null> {
    const { data } = await supabase.rpc('get_event_activity_remaining_stock', { event_activity_id_param: eventActivityId });
    return data as number | null;
  }

  async getSlotRemainingCapacity(timeSlotId: string): Promise<number | null> {
    const { data } = await supabase.rpc('get_slot_remaining_capacity', { slot_uuid: timeSlotId });
    return data as number | null;
  }

  async cleanupExpiredCartItems(): Promise<void> {
    await supabase.rpc('cleanup_expired_cart_items');
  }

  async findCartItem(sessionId: string, passId: string, eventActivityId?: string, timeSlotId?: string): Promise<{ id: string; quantity: number } | null> {
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

    const { data } = await query.maybeSingle();
    return data as { id: string; quantity: number } | null;
  }

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

  async insertCartItem(sessionId: string, passId: string, eventActivityId?: string, timeSlotId?: string, quantity = 1): Promise<boolean> {
    const { error } = await supabase
      .from('cart_items')
      .insert({
        session_id: sessionId,
        pass_id: passId,
        event_activity_id: eventActivityId,
        time_slot_id: timeSlotId,
        quantity,
      });
    return !error;
  }
}
