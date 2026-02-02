# Direttiva: Recupero Dati Football

Questa direttiva definisce il processo per il recupero dei dati storici delle partite di calcio dai principali campionati europei.

## Obiettivo
Mantenere aggiornato il database Supabase con gli ultimi risultati, gol e stime xG.

## Input
- Nessun input manuale richiesto. Lo script utilizza URL predefiniti per i campionati (Serie A, Premier League, La Liga, Bundesliga, Ligue 1) e le stagioni.

## Esecuzione
Eseguire lo script Python deterministico:
`python execution/fetch_football_data.py`

## Requisiti
- Python 3.x
- Librerie: `requests`, `supabase`, `python-dotenv`
- File `.env` configurato con `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (o anon key).

## Output
- Record inseriti o aggiornati nella tabella `matches` di Supabase.
- Log di esecuzione nel terminale che indica il numero di partite elaborate.

## Casi Limite e Gestione Errori
- **Dati mancanti**: Se un file CSV non è disponibile per una specifica stagione/campionato, lo script lo salterà e passerà al successivo.
- **Formato CSV**: Lo script gestisce le variazioni nelle intestazioni delle colonne cercando i nomi chiave.
- **Conflitti di Database**: Utilizza un upsert basato sulla combinazione univoca di (data, squadra in casa, squadra in trasferta) per evitare duplicati.
- **xG Missing**: Se i dati sui tiri non sono disponibili, xG verrà impostato a 0.

## ⚠️ Limiti Supabase (Lezioni Apprese)

### Row Level Security (RLS)
- Di default Supabase blocca le letture pubbliche. Per permettere query dal frontend:
```sql
CREATE POLICY "Allow public read" ON matches FOR SELECT USING (true);
```

### Limite 1000 righe per query
- Supabase restituisce massimo **1000 righe** per query di default.
- Per contare tutti i record usare: `select('*', { count: 'exact', head: true })`
- Per recuperare tutti i dati usare paginazione con `range(start, end)` o batch da 1000.

### Performance
- Query COUNT con `head: true` è istantanea (non trasferisce dati).
- Evitare di caricare tutti i 70k+ record nel frontend - usare filtri e paginazione.

## Script Correlati
- `execution/check_teams.py` - Verifica squadre nel DB
- `execution/check_current_season.py` - Verifica dati stagione corrente  
- `execution/db_cleanup.py` - Normalizzazione nomi squadre

## Configurazione Squadre
- File: `config/teams_2025_2026.yaml`
- Aggiornare ogni stagione con promozioni/retrocessioni
- I nomi devono corrispondere esattamente a quelli nel DB (es. "Verona" non "Hellas Verona")
