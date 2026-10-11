-- =========================================================================
-- SCHOOLIQ: STUDENT PORTAL & SINGLE-FACE RECOGNITION DATABASE MIGRATION
-- Run this script in your Supabase Dashboard -> SQL Editor -> Click 'Run'
-- =========================================================================

-- 1. Link profiles table to students table (so a logged-in user can be a student)
ALTER TABLE IF EXISTS profiles 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

-- 2. Allow 'student' role in profiles (if a CHECK constraint exists on role)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('super_admin', 'school_admin', 'teacher', 'accountant', 'student'));
    END IF;
END $$;

-- 3. Create table for storing each student's registered single-face vector
CREATE TABLE IF NOT EXISTS student_face_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    descriptor JSONB NOT NULL, -- 128 floating-point numbers representing the student's face
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_student_face UNIQUE (student_id)
);

-- 4. Enable Row Level Security (RLS) on student_face_embeddings
ALTER TABLE student_face_embeddings ENABLE ROW LEVEL SECURITY;

-- 5. Allow authenticated users (students & admins) to read, register, and update face embeddings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'student_face_embeddings' AND policyname = 'Allow authenticated users full access to embeddings'
    ) THEN
        CREATE POLICY "Allow authenticated users full access to embeddings"
        ON student_face_embeddings
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END $$;

-- 6. Ensure student users can read their own student record
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'students' AND policyname = 'Students can read own record'
    ) THEN
        CREATE POLICY "Students can read own record"
        ON students
        FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE profiles.id = auth.uid() 
                AND profiles.student_id = students.id
            )
            OR
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('super_admin', 'school_admin', 'teacher')
            )
        );
    END IF;
END $$;
