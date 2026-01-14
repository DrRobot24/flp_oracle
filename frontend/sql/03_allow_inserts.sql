-- Secure RLS Policies for Matches Table

-- 1. Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- 2. Allow everyone to READ (needed for the dashboard public view)
CREATE POLICY "Public Read Access"
ON matches FOR SELECT
USING (true);

-- 3. Allow only ADMINS to INSERT/UPDATE/DELETE
-- Assuming you have a custom claim 'app_role' = 'admin' OR use the service_role key which bypasses RLS automatically.
-- For the script using service_role key, no policy is needed as it bypasses RLS.
-- But if you want to allow a logged-in admin user from the frontend:

CREATE POLICY "Admin Write Access"
ON matches FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' = 'admin@flp.com' -- Simple email check for now, or use custom claims
);

CREATE POLICY "Admin Update Access"
ON matches FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'admin@flp.com'
);
