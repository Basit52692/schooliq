-- =========================================================================
-- FIX: ALLOW STUDENTS TO MARK THEIR OWN ATTENDANCE IN SUPABASE (RLS)
-- Run this script in Supabase Dashboard -> SQL Editor -> Click 'Run'
-- =========================================================================

-- 1. Ensure RLS on attendance allows students to insert/update their own record
DO $$
BEGIN
    -- Drop any conflicting student policy if previously created
    DROP POLICY IF EXISTS "Students can mark own attendance" ON attendance;
    DROP POLICY IF EXISTS "Allow student attendance self-mark" ON attendance;

    -- Create comprehensive policy allowing students to insert/update their own attendance
    CREATE POLICY "Students can mark own attendance"
    ON attendance
    FOR ALL
    TO authenticated
    USING (
        -- Allow if the logged-in user is the student whose attendance is being marked
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.student_id = attendance.student_id
                OR profiles.role IN ('super_admin', 'school_admin', 'teacher')
            )
        )
    )
    WITH CHECK (
        -- Allow insertion/upsert if the student matches or user is staff
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND (
                profiles.student_id = attendance.student_id
                OR profiles.role IN ('super_admin', 'school_admin', 'teacher')
            )
        )
    );
END $$;
