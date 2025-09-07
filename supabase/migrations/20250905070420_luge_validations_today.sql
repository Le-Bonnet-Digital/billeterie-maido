-- Create view for counting today's luge validations
DROP VIEW IF EXISTS public.luge_validations_today;
CREATE VIEW public.luge_validations_today SECURITY INVOKER AS
SELECT count(*) AS count
FROM public.reservation_validations
WHERE activity = 'luge_bracelet'::text
  AND validated_at::date = CURRENT_DATE;

GRANT SELECT ON TABLE public.luge_validations_today TO anon, authenticated, service_role;
