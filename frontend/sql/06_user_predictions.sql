-- =====================================================
-- UPGRADE: Aggiungere previsioni utente con stake
-- =====================================================
-- Esegui questo script in Supabase Dashboard → SQL Editor
-- =====================================================

-- Aggiungi nuove colonne per previsioni utente
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS user_prediction text, -- '1', 'X', '2'
ADD COLUMN IF NOT EXISTS stake integer DEFAULT 5 CHECK (stake >= 1 AND stake <= 10),
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_user_bet boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS match_date date;

-- Crea indice per evitare duplicati (1 previsione per utente per match)
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_match_prediction 
ON predictions (user_id, home_team, away_team, match_date) 
WHERE is_user_bet = true;

-- Permetti UPDATE per gli utenti autenticati (per modificare la propria previsione)
CREATE POLICY "Users can update own predictions" 
ON predictions FOR UPDATE TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permetti DELETE per gli utenti autenticati (per cancellare la propria previsione)
CREATE POLICY "Users can delete own predictions" 
ON predictions FOR DELETE TO authenticated 
USING (auth.uid() = user_id);
