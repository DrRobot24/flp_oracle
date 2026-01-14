-- Allow authenticated users to save their predictions
-- This is needed for the "Run Simulation" (Dashboard) feature to work.

create policy "Enable insert for authenticated users only"
on predictions for insert
to authenticated
with check ( true );

-- Optionally allow them to see their own predictions
create policy "Enable select for users based on user_id"
on predictions for select
to authenticated
using ( true ); -- Or filter by user_id if you have that column
