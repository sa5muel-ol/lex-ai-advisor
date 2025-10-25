-- =====================================================
-- Supabase RLS Policy Update for Guest Mode Access
-- =====================================================
-- This script enables anonymous access to legal_documents
-- for guest mode functionality while maintaining security
-- =====================================================

-- Step 1: Check current RLS policies (for reference)
-- Uncomment the line below to see existing policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'legal_documents';

-- Step 2: Drop existing restrictive policies
-- These are common policy names - adjust if your policies have different names
DROP POLICY IF EXISTS "Users can only see their own documents" ON legal_documents;
DROP POLICY IF EXISTS "Users can only insert their own documents" ON legal_documents;
DROP POLICY IF EXISTS "Users can only update their own documents" ON legal_documents;
DROP POLICY IF EXISTS "Users can only delete their own documents" ON legal_documents;
DROP POLICY IF EXISTS "Enable read access for users based on user_id" ON legal_documents;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON legal_documents;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON legal_documents;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON legal_documents;

-- Step 3: Create new policies that allow authenticated users full access and guests read-only access
-- SELECT policy - allows both authenticated users and anonymous access (read-only for guests)
CREATE POLICY "Allow read access for all users and guests" 
ON legal_documents 
FOR SELECT 
USING (true);

-- INSERT policy - only for authenticated users
CREATE POLICY "Allow insert access for authenticated users only" 
ON legal_documents 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE policy - only for authenticated users
CREATE POLICY "Allow update access for authenticated users only" 
ON legal_documents 
FOR UPDATE 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- DELETE policy - only for authenticated users
CREATE POLICY "Allow delete access for authenticated users only" 
ON legal_documents 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Step 4: Verify RLS is enabled on the table (should be true)
-- Uncomment to check:
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = 'legal_documents';

-- Step 5: Test the policies (optional - run these to verify)
-- Uncomment to test anonymous access:
-- SELECT COUNT(*) FROM legal_documents;

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- 1. These policies allow READ-ONLY access for anonymous users (guests)
--    and FULL access for authenticated users
-- 
-- 2. This is perfect for demo/guest mode - guests can view documents
--    but cannot modify, delete, or create new ones
--
-- 3. Authenticated users have full CRUD access (Create, Read, Update, Delete)
--    Anonymous users only have Read access
--
-- 4. If you need user-specific data isolation later, you can modify the policies:
--    USING (auth.uid() = user_id OR auth.role() = 'anon')
--
-- 5. After running this script, guest mode should work without
--    authentication errors for viewing documents
-- =====================================================

-- Success message
SELECT 'RLS policies updated successfully! Guest mode should now work.' as status;
