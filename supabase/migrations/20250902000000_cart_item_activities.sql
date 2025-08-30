-- Create cart_item_activities table to store selected activities per cart item
CREATE TABLE IF NOT EXISTS cart_item_activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_item_id uuid NOT NULL REFERENCES cart_items(id) ON DELETE CASCADE,
  event_activity_id uuid NOT NULL REFERENCES event_activities(id) ON DELETE CASCADE,
  time_slot_id uuid REFERENCES time_slots(id) ON DELETE CASCADE
);

ALTER TABLE cart_item_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage their cart item activities"
  ON cart_item_activities FOR ALL
  USING (true);
