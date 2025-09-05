CREATE EXTENSION IF NOT EXISTS pgcrypto;

alter table "public"."cart_item_activities" alter column "id" set default gen_random_uuid();

alter table "public"."cart_items" alter column "id" set default gen_random_uuid();

alter table "public"."events" alter column "id" set default gen_random_uuid();

alter table "public"."passes" alter column "id" set default gen_random_uuid();

alter table "public"."reservation_validations" alter column "id" set default gen_random_uuid();

alter table "public"."reservations" alter column "id" set default gen_random_uuid();

alter table "public"."time_slots" alter column "id" set default gen_random_uuid();





