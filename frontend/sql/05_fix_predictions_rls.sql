-- =====================================================
-- FIX: Aggiungere policy RLS per utenti autenticati
-- =====================================================
-- Esegui questo script in Supabase Dashboard → SQL Editor
-- 
-- Problema: Le policy esistenti permettono solo a utenti 
-- anonimi (anon) di inserire/leggere predictions.
-- Gli utenti loggati (authenticated) non possono salvare.
-- =====================================================

-- Policy per permettere INSERT agli utenti autenticati
CREATE POLICY "Allow authenticated inserts" 
ON predictions 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy per permettere SELECT agli utenti autenticati
CREATE POLICY "Allow authenticated read" 
ON predictions 
FOR SELECT 
TO authenticated 
USING (true);

-- (Opzionale) Policy per permettere UPDATE/DELETE solo delle proprie predictions
-- Richiede prima di aggiungere una colonna user_id:
-- ALTER TABLE predictions ADD COLUMN user_id uuid REFERENCES auth.users(id);
-- CREATE POLICY "Users can update own predictions" ON predictions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICA: Dopo aver eseguito, controlla le policy
-- =====================================================
-- SELECT * FROM pg_policies WHERE tablename = 'predictions';
