-- Create admin user directly in auth.users table
-- This bypasses email confirmation for the admin account

DO $$
DECLARE
    user_id uuid;
    encrypted_password text;
BEGIN
    -- Generate a UUID for the admin user
    user_id := gen_random_uuid();
    
    -- Create password hash for "admin123"
    -- Note: This uses Supabase's built-in password hashing
    encrypted_password := crypt('admin123', gen_salt('bf'));
    
    -- Insert directly into auth.users table
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'admin@labforge.com',
        encrypted_password,
        now(), -- Email confirmed immediately
        null,
        null,
        '{"provider": "email", "providers": ["email"]}',
        '{"first_name": "Admin", "last_name": "User"}',
        now(),
        now(),
        '',
        '',
        '',
        ''
    ) ON CONFLICT (email) DO NOTHING;
    
    -- Create or update the profile
    INSERT INTO public.profiles (
        user_id,
        email,
        first_name,
        last_name,
        role,
        is_active
    ) VALUES (
        user_id,
        'admin@labforge.com',
        'Admin',
        'User',
        'universal_owner',
        true
    ) ON CONFLICT (email) 
    DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        role = 'universal_owner',
        is_active = true;
        
    RAISE NOTICE 'Admin user created with email: admin@labforge.com and password: admin123';
END $$;