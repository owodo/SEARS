-- Check if profile exists and create it if not, then upgrade to universal_owner
DO $$
BEGIN
  -- Insert or update the profile for the admin user
  INSERT INTO public.profiles (user_id, email, first_name, last_name, role, is_active)
  VALUES (
    '6d903b11-7d4c-47ff-82e7-e0d8e2e8ce16',
    'admin@labforge.com',
    'Admin',
    'User', 
    'universal_owner',
    TRUE
  )
  ON CONFLICT (email) 
  DO UPDATE SET 
    role = 'universal_owner',
    user_id = EXCLUDED.user_id,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    is_active = TRUE;
END $$;