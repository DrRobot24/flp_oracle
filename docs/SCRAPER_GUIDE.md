# 🗞️ Guida Scraper News

Ecco come utilizzare lo scraper per popolare il database con le ultime notizie.

## 1. Prerequisiti
Apri il terminale (Prompt dei comandi o PowerShell) nella cartella del progetto:
`c:\Users\dottf\Desktop\FLP`

Assicurati di aver installato le librerie (basta farlo una volta sola):
```bash
pip install -r requirements.txt
```

## 2. Comandi Disponibili

### Cerca notizie per una SQUADRA
Comando base per cercare news su una squadra specifica:
```bash
python execution/news_scraper.py --team "Juventus"
```
*(Puoi sostituire Juventus con Milan, Inter, Roma, Napoli, ecc.)*

### Cerca notizie per una PARTITA
Se vuoi news per entrambe le squadre di un match specifico:
```bash
python execution/news_scraper.py --match "Milan" "Inter"
```

## 3. Cosa succede dopo?
1. Lo script cercherà articoli sui siti configurati (Football Italia, Sky Sports, ESPN).
2. Analizzerà il testo per capire se è una buona o cattiva notizia.
3. Salverà tutto nel database **Supabase**.
4. **RISULTATO:** Vai sul tuo sito (Dashboard) e vedrai apparire le icone (🚑, 🔥) nel box "AI Insights".

## Risoluzione Problemi
*   **Errore "Supabase credentials not found":** Assicurati che il file `.env` nella cartella principale contenga `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
*   **Nessuna news trovata:** Riprova con il nome della squadra in inglese se necessario (es. "Rome" invece di "Roma"), anche se lo scraper gestisce i nomi comuni.
