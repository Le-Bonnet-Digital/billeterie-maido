/*
  # Add validation revocation support

  1. New Columns
    - `revoked_at` (timestamp) - when validation was revoked
    - `revoked_by` (uuid) - who revoked the validation
    - `revoke_reason` (text) - reason for revocation

  2. Security
    - Only admins can revoke validations via RLS policy
*/

-- Add revocation columns to reservation_validations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservation_validations' AND column_name = 'revoked_at'
  ) THEN
    ALTER TABLE public.reservation_validations ADD COLUMN revoked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservation_validations' AND column_name = 'revoked_by'
  ) THEN
    ALTER TABLE public.reservation_validations ADD COLUMN revoked_by uuid REFERENCES public.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reservation_validations' AND column_name = 'revoke_reason'
  ) THEN
    ALTER TABLE public.reservation_validations ADD COLUMN revoke_reason text;
  END IF;
END $$;

-- Add RLS policy for admins to revoke validations
CREATE POLICY IF NOT EXISTS "Admins can revoke validations"
ON public.reservation_validations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  )
);