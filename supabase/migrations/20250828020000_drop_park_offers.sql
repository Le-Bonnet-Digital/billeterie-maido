-- Cleanup: drop unused Park Offers domain if present
DROP FUNCTION IF EXISTS get_park_offers_with_stock() CASCADE;
DROP FUNCTION IF EXISTS get_park_offer_remaining_stock(uuid) CASCADE;
DROP TABLE IF EXISTS park_offer_activities CASCADE;
DROP TABLE IF EXISTS park_offers CASCADE;

