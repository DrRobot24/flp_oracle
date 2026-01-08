
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL) {
    console.error('Missing VITE_SUPABASE_URL in .env')
    process.exit(1)
}

if (SERVICE_KEY) {
    console.log("✅ Using Service Role Key (Admin Mode)")
} else {
    console.warn("⚠️  Service Role Key NOT found. Falling back to Anon Key (Expect RLS errors!)")
}

const SUPABASE_KEY = SERVICE_KEY || ANON_KEY

if (!SUPABASE_KEY) {
    console.error('Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

// URL for Premier League 2024/2025 JSON data
// Using jokecamp or similar open source. For consistency, let's use a known raw CSV or JSON.
// Often GitHub repos have raw CSVs. Let's use a direct raw CSV link for PL 24/25 from football-data.co.uk (via a proxy or direct if possible, but often CORS issues in browser, here in node it's fine)
// Better yet, let's use a hardcoded sample or dynamic fetch if we have a stable JSON URL.
// Since stable JSONs vary, I'll use a fetch to a raw GitHub content that mirrors football-data.co.uk or similar.
// For now, I'll mock the fetch with a real URL if found, or write a flexible parser.

// Let's use the 'football-csv' organization or similar.
// Actually, standard football-data.co.uk CSV is easiest to parse.
// League Configurations
const LEAGUES = [
    { name: 'Premier League', code: 'PL', url: 'https://www.football-data.co.uk/mmz4281/2425/E0.csv' },
    { name: 'Serie A', code: 'SA', url: 'https://www.football-data.co.uk/mmz4281/2425/I1.csv' },
    { name: 'La Liga', code: 'LL', url: 'https://www.football-data.co.uk/mmz4281/2425/SP1.csv' },
    { name: 'Bundesliga', code: 'BL', url: 'https://www.football-data.co.uk/mmz4281/2425/D1.csv' },
    { name: 'Ligue 1', code: 'L1', url: 'https://www.football-data.co.uk/mmz4281/2425/F1.csv' }
]

async function fetchAndInsert() {
    for (const league of LEAGUES) {
        console.log(`Fetching ${league.name} data from ${league.url}...`)

        try {
            const response = await fetch(league.url)
            if (!response.ok) {
                console.error(`Failed to fetch ${league.name}: ${response.statusText}`)
                continue
            }

            const text = await response.text()

            // Simple CSV parse
            const rows = text.split('\n').map(row => row.split(','))
            const headers = rows[0].map(h => h.trim())

            // Indices
            const dateIdx = headers.indexOf('Date')
            const homeIdx = headers.indexOf('HomeTeam')
            const awayIdx = headers.indexOf('AwayTeam')
            const fthgIdx = headers.indexOf('FTHG')
            const ftagIdx = headers.indexOf('FTAG')

            if (dateIdx === -1 || homeIdx === -1) {
                console.error(`CSV format error for ${league.name}: headers not found`)
                continue
            }

            const matches = []

            // Start from 1 to skip header
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i]
                if (row.length < 5) continue

                const dateRaw = row[dateIdx]
                const home = row[homeIdx]
                const away = row[awayIdx]
                const fthgStr = row[fthgIdx]
                const ftagStr = row[ftagIdx]

                if (!home || !away || !fthgStr) continue

                const fthg = parseInt(fthgStr)
                const ftag = parseInt(ftagStr)

                // Date convert DD/MM/YYYY -> YYYY-MM-DD
                const parts = dateRaw.split('/')
                if (parts.length !== 3) continue
                let year = parts[2]
                if (year.length === 2) year = '20' + year
                const isoDate = `${year}-${parts[1]}-${parts[0]}`

                matches.push({
                    date: isoDate,
                    home_team: home,
                    away_team: away,
                    home_goals: fthg,
                    away_goals: ftag,
                    league: league.code,
                    season: '2024-2025'
                })
            }

            console.log(`Parsed ${matches.length} matches for ${league.name}. Upserting...`)

            const { error } = await supabase.from('matches').upsert(matches, { onConflict: 'date,home_team,away_team' })

            if (error) {
                console.error(`Supabase Error (${league.name}):`, error)
            } else {
                console.log(`Success! ${league.name} updated.`)
            }

        } catch (err) {
            console.error(`Script failed for ${league.name}:`, err)
        }
    }
}

fetchAndInsert()
