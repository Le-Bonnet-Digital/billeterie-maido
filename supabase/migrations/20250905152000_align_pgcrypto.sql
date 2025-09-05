CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.cart_item_activities     ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.cart_items               ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.events                   ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.passes                   ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.reservation_validations  ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.reservations             ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.time_slots               ALTER COLUMN id SET DEFAULT gen_random_uuid();
