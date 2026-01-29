# 🚀 Guida AdSense per MAGOTTO

## Step 1: Pubblica il Sito Online

AdSense non approva siti su `localhost`. Ti serve un dominio pubblico.

**Opzioni Hosting (Gratis):**
- [Vercel](https://vercel.com) ← Consigliato per React/Vite
- [Netlify](https://netlify.com)
- [GitHub Pages](https://pages.github.com)

**Dominio (~10€/anno):**
- [Namecheap](https://namecheap.com)
- [Google Domains](https://domains.google)

---

## Step 2: Prepara il Contenuto

Google vuole vedere un sito "completo". Aggiungi:

| Pagina | Obbligatoria? | Note |
|--------|---------------|------|
| About / Chi Siamo | ✅ Sì | Spiega cos'è MAGOTTO |
| Privacy Policy | ✅ Sì | Genera su [privacypolicygenerator.info](https://privacypolicygenerator.info) |
| Cookie Policy | ✅ Sì | Stessa cosa |
| Contatti | ✅ Sì | Anche solo un'email |
| Contenuto originale | ✅ Sì | 10-15 articoli/guide sulle previsioni |

---

## Step 3: Iscriviti ad AdSense

1. Vai su **[adsense.google.com](https://adsense.google.com)**
2. Accedi con il tuo account Google
3. Inserisci l'URL del tuo sito (es. `https://magotto.app`)
4. Google ti darà un codice Publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`)

---

## Step 4: Incolla il Codice

Apri `frontend/index.html` e **decommenta** questa riga (già preparata):

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-TUO_ID_QUI" crossorigin="anonymous"></script>
```

Poi, nella dashboard AdSense, crea le **Unità Pubblicitarie** e copia gli "Ad Slot ID" nei componenti `AdSpace`:

```tsx
<AdSpace type="leaderboard" adClient="ca-pub-TUO_ID" adSlot="1234567890" />
```

---

## Step 5: Attendi l'Approvazione

- Tempo: **24 ore - 2 settimane**
- Google verifica contenuto e conformità alle policy

---

## ⚠️ Nota per Siti di Previsioni Sportive

AdSense può essere severo con il "betting". Per essere approvato:

- ✅ Presenta l'algoritmo come **strumento statistico/educativo**
- ✅ Non promettere guadagni sicuri
- ✅ Evita linguaggio tipo "scommetti e vinci"
- ❌ Se rifiutato, usa **affiliazioni dirette** (Bet365 Partners, Eurobet, etc.)

---

## Alternative ad AdSense

| Network | Pro | Contro |
|---------|-----|--------|
| [Media.net](https://media.net) | Circuito Yahoo/Bing, buoni CPM | Richiede traffico |
| [Adsterra](https://adsterra.com) | Accetta quasi tutto | Ads più "aggressivi" |
| [PropellerAds](https://propellerads.com) | Popunder, alto rendimento | UX discutibile |
| **Affiliazioni Betting** | CPA altissimo (50€+) | Serve traffico targetizzato |

---

Buona fortuna! 🍀
