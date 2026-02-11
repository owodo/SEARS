-- Create profiles for any existing users who don't have them
INSERT INTO public.profiles (user_id, email, first_name, last_name, role, is_active)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'last_name', 'Name'),
  'scientist',
  TRUE
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
);

-- Update the trigger function to be more secure with proper search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'scientist', -- Default role
    TRUE
  );
  RETURN NEW;
END;
$$;