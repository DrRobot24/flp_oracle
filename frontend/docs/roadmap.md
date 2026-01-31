# MAGOTTO Project Roadmap

> **Last Updated**: 1 Febbraio 2026  
> **Version**: Beta 0.2  
> **Overall Progress**: 81%

---

## 📊 Database Status

| Tabella | Righe | Stato |
|---------|-------|-------|
| `matches` | **69,765** | ✅ Popolata (10+ stagioni) |
| `predictions` | 113 | ✅ Funzionante |
| `profiles` | 1 | ✅ Admin presente |
| `news` | 80 | ✅ Scraper attivo |

### Campionati Disponibili
| Codice | Lega | Partite |
|--------|------|---------|
| SA | Serie A 🇮🇹 | 210 |
| I2 | Serie B 🇮🇹 | 173 |
| PL | Premier League 🇬🇧 | 116 |
| E1 | Championship 🇬🇧 | 190 |
| BL | Bundesliga 🇩🇪 | 18 |
| LL | La Liga 🇪🇸 | 28 |
| POL | Ekstraklasa 🇵🇱 | 117 |
| CL | Champions League 🇪🇺 | 73 |

---

## 🧮 Motori Matematici

| Engine | File | Stato | Descrizione |
|--------|------|-------|-------------|
| **Poisson Model** | `math/poisson.ts` | ✅ | 1X2, GG, Over/Under |
| **Fourier (FFT)** | `math/fourier.ts` | ✅ | Analisi cicli forma |
| **Geometric Engine** | `math/geometric.ts` | ✅ | Phase Space trajectories |
| **News Impact** | `math/newsImpact.ts` | ✅ | Decay temporale + modifier |
| **Oracle Integrator** | `math/oracle.ts` | ✅ | Ensemble unificato |

---

## 🚀 Roadmap Dettagliata

### ✅ Phase 1: Foundation (100%)
- [x] **Project Setup**: React + Vite + TypeScript
- [x] **Database**: Supabase integration con tabelle `predictions`, `matches`, `profiles`
- [x] **Auth**: RBAC System (Admin vs User) + Protected Routes
- [x] **Math**: Poisson & Geometric Engine funzionanti

### ✅ Phase 2: Data Ingestion (100%)
- [x] **Admin Upload**: CSV Data Ingestion via `DataUploader`
- [x] **Schema**: `matches` table con 69,765 partite storiche
- [x] **Data Wiring**: Dropdowns popolati da DB
- [x] **Real Trajectories**: Rolling averages per Goals For/Against
- [x] **Team Normalization**: Mapping nomi squadre (Inter, Man City, etc.)
- [x] **League Selector**: Filtro campionati (max 3) per dropdown pulito
- [x] **News Scraper**: Sistema scraping news con RSS feeds

### ✅ Phase 3: Advanced Algorithms (85%)
- [x] **Monte Carlo Simulation**: 10,000 simulazioni per confidence intervals
- [x] **FFT (Fast Fourier Transform)**: Analisi cicli forma squadre
- [x] **News Impact Engine**: Modifica xG basata su news (infortuni, etc.)
- [x] **Oracle Ensemble**: Combinazione pesata di tutti i modelli
- [ ] **Sensitivity Analysis**: Sliders "What If" (parziale)

### 🚧 Phase 4: Polish & Social (40%)
- [x] **UI Components**: Glass panels, gradients, animazioni
- [x] **Head to Head**: Storico scontri diretti
- [x] **User Predictions**: Sistema pronostici utente
- [x] **Cookie Consent**: GDPR compliant
- [x] **Data Source Info**: Statistiche database visibili
- [ ] **Leaderboard Reale**: Classifica utenti (UI pronta, manca backend)
- [ ] **Mobile Optimization**: Responsive ma non ottimizzato
- [ ] **Dark/Light Toggle**: Già dark di default

---

## 🖥️ Struttura Frontend

### Pages
| Pagina | File | Stato |
|--------|------|-------|
| Dashboard | `pages/Dashboard.tsx` | ✅ Completa |
| Login | `pages/Login.tsx` | ✅ Completa |
| Profile | `pages/Profile.tsx` | ✅ Completa |
| Predictions | `pages/Predictions.tsx` | ✅ Completa |
| Leaderboard | `pages/Leaderboard.tsx` | ⚠️ Mockup |
| About | `pages/About.tsx` | ✅ Completa |
| Privacy/Terms/Contact | `pages/*.tsx` | ✅ Complete |

### Components
| Componente | Stato | Note |
|------------|-------|------|
| `DataUploader` | ✅ | CSV import (Admin only) |
| `HeadToHead` | ✅ | Storico scontri diretti |
| `UserPrediction` | ✅ | Pronostico utente con stake |
| `NewsPanel` | ✅ | News per team |
| `AIInsights` | ✅ | Spiegazioni predizioni |
| `DataSourceInfo` | ✅ | Info database |
| `DatabaseStats` | ✅ | Statistiche partite |
| `CookieConsent` | ✅ | Banner GDPR |
| `MainLayout` | ✅ | Layout condiviso |

---

## 🔧 Scripts Python (`/execution`)

| Script | Funzione | Stato |
|--------|----------|-------|
| `fetch_football_data.py` | Import dati da football-data.co.uk | ✅ |
| `news_scraper.py` | Scraping news RSS | ✅ |
| `news_processor.py` | Elaborazione sentiment news | ✅ |
| `db_cleanup.py` | Normalizzazione nomi squadre | ✅ |
| `sync_teams.py` | Mapping sinonimi squadre | ✅ |
| `check_teams.py` | Verifica squadre per lega | ✅ |
| `import_cl.py` | Import Champions League | ✅ |

---

## ❌ TODO (Priorità)

### 🔴 Alta Priorità
1. **Tabella `user_predictions`** - Separare predizioni utente da AI
2. **Leaderboard dinamica** - Classifica reale basata su risultati
3. **Verifica risultati** - Confronto predizioni vs risultati reali

### 🟠 Media Priorità
4. **Mobile optimization** - Test e fix responsive
5. **Notifiche** - Alert per match imminenti
6. **Export dati** - Download predizioni in CSV

### 🟢 Bassa Priorità
7. **Dark/Light toggle** - Già dark di default
8. **PWA** - Offline support
9. **Multi-lingua** - i18n

---

## 📈 Progress Bar

```
Phase 1: Foundation     ████████████████████ 100%
Phase 2: Data           ████████████████████ 100%
Phase 3: Algorithms     █████████████████░░░  85%
Phase 4: Polish/Deploy  ████████░░░░░░░░░░░░  40%
─────────────────────────────────────────────────
TOTALE                  ████████████████░░░░  81%
```

---

## 📝 Changelog

### v0.2 (1 Feb 2026)
- ✅ League Selector con filtro max 3 campionati
- ✅ Fix dropdown squadre italiane
- ✅ Normalizzazione completa nomi squadre
- ✅ DataSourceInfo component
- ✅ 69,765 partite importate

### v0.1 (Gennaio 2026)
- 🚀 Release iniziale Beta
- ✅ Oracle Engine funzionante
- ✅ Sistema predizioni completo

