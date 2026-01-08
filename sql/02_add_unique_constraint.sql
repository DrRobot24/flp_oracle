-- Add a unique constraint to the matches table to prevent duplicates
-- This allows the UPSERT operation to work correctly based on Date + Teams

ALTER TABLE matches
ADD CONSTRAINT matches_date_teams_unique UNIQUE (date, home_team, away_team);
