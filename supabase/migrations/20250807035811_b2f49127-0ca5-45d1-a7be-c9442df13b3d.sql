-- Add scientist rtali@iastate.edu to the test lab
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
  'rtali@iastate.edu',
  'R',
  'Tali',
  'scientist',
  (SELECT id FROM public.labs WHERE name = 'Test Lab' LIMIT 1),
  true
);