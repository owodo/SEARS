-- Remove the existing placeholder profile so signup can work without conflicts
DELETE FROM public.profiles WHERE email = 'admin@labforge.com';

-- Note: To disable email confirmation for signup, you need to:
-- 1. Go to Authentication > Settings in Supabase dashboard
-- 2. Turn OFF "Enable email confirmations"
-- 3. Then the signup process will work immediately without email verification

-- After signup, we can update the role to universal_owner
-- This function will be called after successful signup to upgrade the role
CREATE OR REPLACE FUNCTION public.make_user_universal_owner(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.profiles 
  SET role = 'universal_owner'
  WHERE email = target_email;
  
  RETURN FOUND;
END;
$$;