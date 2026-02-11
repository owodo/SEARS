-- Create admin user account in auth.users
-- Note: This creates the auth user, the profile will be created automatically by the trigger

-- First, let's check if we can create a user directly (this might not work in some setups)
-- We'll use a simple password for testing: "admin123"

-- Since we can't directly insert into auth.users via SQL, we'll need to create via the signup process
-- But let's ensure our trigger and profile setup is ready

-- Make sure we have a way to identify universal owners
DO $$
BEGIN
  -- Check if admin profile exists and create one if needed
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@labforge.com') THEN
    -- Create a placeholder profile that will be updated when the user signs up
    INSERT INTO profiles (user_id, email, first_name, last_name, role, is_active)
    VALUES (
      gen_random_uuid(), -- temporary UUID, will be replaced when user actually signs up
      'admin@labforge.com',
      'Admin',
      'User', 
      'universal_owner',
      TRUE
    );
  END IF;
END $$;