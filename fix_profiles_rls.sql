-- =========================================================================
-- FIX: ALLOW ADMINS TO INSERT PROFILES FOR STUDENTS & STAFF
-- Run this script in Supabase Dashboard -> SQL Editor -> Click 'Run'
-- =========================================================================

-- 1. Grant table privileges on profiles to authenticated users
GRANT ALL ON TABLE public.profiles TO authenticated;

-- 2. Allow school_admin and super_admin to insert profiles for students
DO $$
BEGIN
    DROP POLICY IF EXISTS "School admins can insert profiles" ON profiles;

    CREATE POLICY "School admins can insert profiles"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles AS admin_p
            WHERE admin_p.id = auth.uid()
            AND admin_p.role IN ('school_admin', 'super_admin')
        )
        OR id = auth.uid()
    );
END $$;
