-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also create default admin profile if it doesn't exist
INSERT INTO public.profiles (user_id, email, first_name, last_name, role, is_active)
SELECT 
  au.id,
  'admin@labforge.com',
  'Admin',
  'User',
  'universal_owner',
  TRUE
FROM auth.users au
WHERE au.email = 'admin@labforge.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = au.id
  );