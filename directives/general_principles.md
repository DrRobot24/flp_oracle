# Direttiva Generale: Architettura FLP

Questo documento definisce i principi fondamentali e l'architettura del progetto Football League Predictor (FLP).

## Visione
FLP è uno strumento avanzato per l'analisi e la previsione dei risultati calcistici, progettato per essere potenziato da agenti AI che operano in modo affidabile e deterministico.

## Architettura a 3 Livelli

### 1. Livello Direttiva (`directives/`)
Contiene le Standard Operating Procedures (SOP) in Markdown. Gli agenti AI leggono questi file per capire *cosa* fare.
- Esempio: `directives/fetch_football_data.md`

### 2. Livello Orchestrazione (AI Agent)
L'agente AI (come te, Antigravity) agisce come il cervello che interpreta le direttive, decide quali strumenti eseguire e gestisce il flusso di lavoro.

### 3. Livello Esecuzione (`execution/`)
Contiene script Python deterministici che eseguono il lavoro pesante in modo affidabile.
- Esempio: `execution/fetch_football_data.py`

## Struttura del Progetto
- `/frontend`: Applicazione React/Vite/Tailwind (la UI dell'utente).
- `/backend`: API server (se necessario).
- `/directives`: Istruzioni per gli agenti.
- `/execution`: Tool e script di supporto.
- `/.tmp`: Storage temporaneo per l'elaborazione dati.

## Principi per l'Agente
1. **Verifica sempre le direttive** prima di agire.
2. **Usa gli script in `execution/`** invece di scrivere codice ad-hoc ogni volta.
3. **Aggiorna le direttive** quando impari nuovi limiti o ottimizzazioni.
4. **Mantieni separata la logica AI dalla logica di business deterministica.**
