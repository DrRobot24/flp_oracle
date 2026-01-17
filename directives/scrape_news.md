# Direttiva: Scraping Notizie Calcistiche

Questa direttiva definisce il processo per il recupero e l'elaborazione delle notizie calcistiche da fonti online.

## Obiettivo
Raccogliere notizie rilevanti sulle squadre per alimentare il sistema predittivo con informazioni su infortuni, squalifiche, cambi allenatore e stato di forma.

## Flusso di Lavoro

### 1. Scraping delle Notizie
```bash
python execution/news_scraper.py --match "Napoli" "Milan"
```

**Fonti monitorate:**
- ESPN FC (RSS)
- Sky Sports Football (RSS)
- Football Italia (HTML)

**Output:** `data/scraped_news/match_{home}_{away}.json`

### 2. Elaborazione NLP
```bash
python execution/news_processor.py --input data/scraped_news/match_napoli_milan.json
```

**Elaborazione:**
- Categorizzazione (infortunio, squalifica, forma, motivazione)
- Analisi del sentiment (-1 a +1)
- Estrazione giocatori chiave
- Keyword di impatto

**Output:** `data/scraped_news/match_napoli_milan_processed.json`

## Requisiti
- Python 3.10+
- Librerie: `requests`, `beautifulsoup4`, `python-dotenv`
- Opzionale: `spacy` con modello `en_core_web_sm` per NLP avanzato

### Installazione dipendenze
```bash
pip install requests beautifulsoup4 python-dotenv
# Opzionale per NLP avanzato:
pip install spacy
python -m spacy download en_core_web_sm
```

## Configurazione
I parametri sono definiti in `config/settings.yaml` nella sezione `news` e `scraper`.

## Rate Limiting
- Delay di 3 secondi tra richieste
- Timeout di 10 secondi
- Max 20 articoli per fonte
- Cache TTL di 30 minuti

## Output Esempio

```json
{
  "match": "Napoli vs Milan",
  "home_team": {
    "name": "Napoli",
    "summary": {
      "total_articles": 5,
      "avg_sentiment": -0.15,
      "injuries": 2,
      "key_players_mentioned": [
        {"name": "Osimhen", "role": "forward", "importance": 0.95}
      ]
    }
  },
  "away_team": {
    "name": "Milan",
    "summary": {
      "total_articles": 3,
      "avg_sentiment": 0.25,
      "injuries": 0,
      "key_players_mentioned": [
        {"name": "Leao", "role": "forward", "importance": 0.90}
      ]
    }
  }
}
```

## Casi Limite

- **Fonte non raggiungibile**: Lo scraper passa alla fonte successiva dopo timeout
- **Nessun articolo trovato**: Restituisce lista vuota, il modello usa solo dati storici
- **Rate limiting**: Rispetta automaticamente i delay configurati
- **Cache invalida**: Rigenera automaticamente dopo 30 minuti

## Integrazione con il Modello

L'output processato viene convertito in `NewsImpactItem[]` e passato a `OracleIntegrator.predict()`:

```typescript
import { OracleIntegrator } from './math/oracle';
import { NewsImpactItem } from './math/newsImpact';

const homeNews: NewsImpactItem[] = processedData.home_team.processed_articles.map(a => ({
    teamName: a.team_mentions[0] || homeTeam,
    category: a.category,
    sentiment: a.sentiment,
    sourceReliability: 0.85,
    publishedAt: new Date(a.published_at)
}));

const prediction = await oracle.predict(
    homeTeam, awayTeam,
    homeXG, awayXG,
    homeHistory, awayHistory,
    homeNews, awayNews
);
```

## Best Practices

1. **Non abusare delle fonti**: Mantieni delays ragionevoli
2. **Usa la cache**: Evita richieste duplicate
3. **Monitora i log**: Controlla eventuali errori di parsing
4. **Aggiorna i selettori**: I siti cambiano struttura periodicamente
