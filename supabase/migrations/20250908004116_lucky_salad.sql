/*
  # Add foreign key constraint for revoked_by column

  1. Foreign Key Constraints
    - Add foreign key constraint between reservation_validations.revoked_by and users.id
    - This enables PostgREST to resolve the relationship for the revoker user email

  2. Security
    - No RLS changes needed - existing policies remain in place
*/

-- Add foreign key constraint for revoked_by column
ALTER TABLE public.reservation_validations 
ADD CONSTRAINT reservation_validations_revoked_by_fkey 
FOREIGN KEY (revoked_by) REFERENCES public.users(id);