-- Fix the handle_new_user trigger to handle existing profiles
-- This will prevent the duplicate key error when signing up with admin@labforge.com

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Use INSERT ... ON CONFLICT to handle existing profiles
  INSERT INTO public.profiles (user_id, email, first_name, last_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'scientist', -- Default role
    TRUE
  )
  ON CONFLICT (email) 
  DO UPDATE SET 
    user_id = EXCLUDED.user_id,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    -- Keep existing role if it's already set (like universal_owner)
    role = CASE 
      WHEN profiles.role != 'scientist' THEN profiles.role 
      ELSE EXCLUDED.role 
    END,
    is_active = TRUE;
  
  RETURN NEW;
END;
$function$;