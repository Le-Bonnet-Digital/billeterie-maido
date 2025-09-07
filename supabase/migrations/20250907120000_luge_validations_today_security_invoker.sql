-- Ensure luge_validations_today view runs with invoker rights
DROP VIEW IF EXISTS public.luge_validations_today;
CREATE VIEW public.luge_validations_today WITH (security_invoker = true) AS
SELECT count(*) AS count
FROM public.reservation_validations
WHERE activity = 'luge_bracelet'::text
  AND validated_at::date = CURRENT_DATE;

GRANT SELECT ON TABLE public.luge_validations_today TO anon, authenticated, service_role;
