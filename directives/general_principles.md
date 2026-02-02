# Direttiva Generale: Architettura MAGOTTO

Questo documento definisce i principi fondamentali e l'architettura del progetto MAGOTTO.

## Visione
MAGOTTO è uno strumento avanzato per l'analisi e la previsione dei risultati calcistici, progettato per essere potenziato da agenti AI che operano in modo affidabile e deterministico.

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
```
MAG8/
├── .env                 # Variabili ambiente (mai committare)
├── README.md            # Documentazione principale
├── requirements.txt     # Dipendenze Python
├── config/              # Configurazioni YAML (squadre, settings)
├── data/                # CSV e dati scraping
│   └── scraped_news/    # News scrappate
├── directives/          # SOP per agenti AI
├── docs/                # Documentazione estesa
├── execution/           # Script Python deterministici
└── frontend/            # App React/Vite/Tailwind
    ├── src/
    │   ├── components/  # Componenti React
    │   ├── hooks/       # Custom hooks
    │   ├── lib/         # Utilities e API
    │   ├── math/        # Algoritmi (Fourier, Poisson, Oracle)
    │   └── pages/       # Pagine principali
    └── public/          # Asset statici
```

## Principi per l'Agente
1. **Verifica sempre le direttive** prima di agire.
2. **Usa gli script in `execution/`** invece di scrivere codice ad-hoc ogni volta.
3. **Aggiorna le direttive** quando impari nuovi limiti o ottimizzazioni.
4. **Mantieni separata la logica AI dalla logica di business deterministica.**

## Stack Tecnologico

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React hooks + Context API
- **Charts**: Recharts
- **Database Client**: @supabase/supabase-js

### Backend/Database  
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (se necessario)

### Python (Execution)
- **Runtime**: Python 3.x
- **DB Client**: supabase-py
- **HTTP**: requests
- **Config**: python-dotenv, PyYAML

## Best Practices Codice

### TypeScript/React
- Usare `import type` per tipi (Vite lo richiede)
- Estrarre hook custom per logica complessa
- Componenti in file separati quando superano 200 righe
- Costanti centralizzate in `lib/constants.ts`

### Supabase
- RLS policies per sicurezza
- `{ count: 'exact', head: true }` per conteggi veloci
- Paginazione per dataset grandi (limite 1000 righe/query)
- Service role key solo in script Python, mai nel frontend
