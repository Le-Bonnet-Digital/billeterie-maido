-- Seed script for demo Luge validations
-- Creates a provider user, a dummy reservation and three luge validations

-- 1) Provider user (luge_provider)
INSERT INTO public.users (id, email, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'luge_provider@example.com', 'luge_provider')
ON CONFLICT (id) DO NOTHING;

-- 2) Demo reservation marked as paid
WITH demo_res AS (
  INSERT INTO public.reservations (reservation_number, client_email, payment_status)
  VALUES ('DEMO-LUGE-001', 'demo-client@example.com', 'paid')
  RETURNING id
)
-- 3) Three luge validation entries referencing the reservation
INSERT INTO public.reservation_validations (reservation_id, activity, validated_by)
SELECT id, 'luge_bracelet', '00000000-0000-0000-0000-000000000001' FROM demo_res
UNION ALL
SELECT id, 'luge_bracelet', '00000000-0000-0000-0000-000000000001' FROM demo_res
UNION ALL
SELECT id, 'luge_bracelet', '00000000-0000-0000-0000-000000000001' FROM demo_res;
