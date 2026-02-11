-- Upgrade the admin user to universal_owner role
SELECT public.make_user_universal_owner('admin@labforge.com');