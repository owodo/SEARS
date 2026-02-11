-- Create a test lab
INSERT INTO public.labs (name, description, is_active)
VALUES ('Test Lab', 'A test laboratory for development purposes', true);

-- Create a lab owner profile
-- Note: We'll need to create the auth user separately since we can't directly insert into auth.users
INSERT INTO public.profiles (
  user_id, 
  email, 
  first_name, 
  last_name, 
  role, 
  lab_id,
  is_active
) VALUES (
  gen_random_uuid(), -- temporary user_id, will be updated when auth user is created
  'labowner@test.com',
  'Lab',
  'Owner',
  'lab_owner',
  (SELECT id FROM public.labs WHERE name = 'Test Lab' LIMIT 1),
  true
);