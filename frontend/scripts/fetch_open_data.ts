
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

// Season codes for football-data.co.uk
const SEASONS = [
    { code: '2526', name: '2025-2026' },
    { code: '2425', name: '2024-2025' },
    { code: '2324', name: '2023-2024' },
    { code: '2223', name: '2022-2023' },
    { code: '2122', name: '2021-2022' },
    { code: '2021', name: '2020-2021' },
    { code: '1920', name: '2019-2020' },
    { code: '1819', name: '2018-2019' },
    { code: '1718', name: '2017-2018' },
    { code: '1617', name: '2016-2017' },
]

// League configurations
const LEAGUE_CONFIGS = [
    { name: 'Premier League', code: 'PL', file: 'E0.csv' },
    { name: 'Serie A', code: 'SA', file: 'I1.csv' },
    { name: 'La Liga', code: 'LL', file: 'SP1.csv' },
    { name: 'Bundesliga', code: 'BL', file: 'D1.csv' },
    { name: 'Ligue 1', code: 'L1', file: 'F1.csv' }
]

// Generate all league+season combinations
const LEAGUES: { name: string; code: string; url: string; season: string }[] = []
for (const season of SEASONS) {
    for (const league of LEAGUE_CONFIGS) {
        LEAGUES.push({
            name: league.name,
            code: league.code,
            url: `https://www.football-data.co.uk/mmz4281/${season.code}/${league.file}`,
            season: season.name
        })
    }
}

const CURRENT_SEASON = '2025-2026' // For display purposes

async function fetchAndInsert() {
    let totalMatches = 0
    let totalSeasons = 0
    
    for (const league of LEAGUES) {
        console.log(`\n📥 Fetching ${league.name} ${league.season} from ${league.url}...`)

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

            // Indices - Core fields
            const dateIdx = headers.indexOf('Date')
            const homeIdx = headers.indexOf('HomeTeam')
            const awayIdx = headers.indexOf('AwayTeam')
            const fthgIdx = headers.indexOf('FTHG')
            const ftagIdx = headers.indexOf('FTAG')
            
            // xG indices (football-data.co.uk uses different column names)
            // Some seasons have: AvgH, AvgD, AvgA (betting odds) but no direct xG
            // Newer files may have: HomeXG, AwayXG or we estimate from shots
            const homeXgIdx = headers.indexOf('AvgH') !== -1 ? -1 : headers.indexOf('HST') // Home Shots on Target as proxy
            const awayXgIdx = headers.indexOf('AvgA') !== -1 ? -1 : headers.indexOf('AST') // Away Shots on Target as proxy
            const hstIdx = headers.indexOf('HST')  // Home Shots on Target
            const astIdx = headers.indexOf('AST')  // Away Shots on Target
            const hsIdx = headers.indexOf('HS')    // Home Shots
            const asIdx = headers.indexOf('AS')    // Away Shots

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

                // Calculate estimated xG from shots data
                // Simple model: xG ≈ (Shots on Target * 0.3) + (Other Shots * 0.05)
                let homeXg = 0
                let awayXg = 0
                
                if (hstIdx !== -1 && hsIdx !== -1) {
                    const hst = parseFloat(row[hstIdx]) || 0
                    const hs = parseFloat(row[hsIdx]) || 0
                    const ast = parseFloat(row[astIdx]) || 0
                    const as = parseFloat(row[asIdx]) || 0
                    
                    homeXg = (hst * 0.32) + ((hs - hst) * 0.04)
                    awayXg = (ast * 0.32) + ((as - ast) * 0.04)
                }

                matches.push({
                    date: isoDate,
                    home_team: home,
                    away_team: away,
                    home_goals: fthg,
                    away_goals: ftag,
                    home_xg: Math.round(homeXg * 100) / 100,
                    away_xg: Math.round(awayXg * 100) / 100,
                    league: league.code,
                    season: league.season  // Use actual season from loop
                })
            }

            console.log(`✅ Parsed ${matches.length} matches for ${league.name} ${league.season}. Upserting...`)
            totalMatches += matches.length
            totalSeasons++

            const { error } = await supabase.from('matches').upsert(matches, { onConflict: 'date,home_team,away_team' })

            if (error) {
                console.error(`❌ Supabase Error (${league.name} ${league.season}):`, error)
            } else {
                console.log(`✅ Success! ${league.name} ${league.season} updated.`)
            }

        } catch (err) {
            console.error(`❌ Script failed for ${league.name} ${league.season}:`, err)
        }
    }
    
    console.log(`\n${'='.repeat(50)}`)
    console.log(`🏆 IMPORT COMPLETE!`)
    console.log(`📊 Total Matches: ${totalMatches}`)
    console.log(`📅 Seasons Processed: ${totalSeasons}`)
    console.log(`${'='.repeat(50)}`)
}

fetchAndInsert()
