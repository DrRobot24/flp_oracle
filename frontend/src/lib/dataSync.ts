/**
 * DATA SYNC MODULE
 * Fetches match data from football-data.co.uk and syncs to Supabase
 * Can be called from the browser (Admin UI)
 */

import { supabase } from './supabase'

export interface LeagueConfig {
    name: string
    code: string
    url: string
}

export interface SyncResult {
    league: string
    success: boolean
    matchesImported: number
    error?: string
}

// League Configurations - Season 2025-2026
// URLs use local Vite proxy to bypass CORS
export const LEAGUES: LeagueConfig[] = [
    // --- MAIN LEAGUES (Europe Top 5 + Others) ---
    { name: 'Premier League', code: 'PL', url: '/api/football-data/mmz4281/2526/E0.csv' },
    { name: 'Championship', code: 'E1', url: '/api/football-data/mmz4281/2526/E1.csv' },
    { name: 'Serie A', code: 'SA', url: '/api/football-data/mmz4281/2526/I1.csv' },
    { name: 'Serie B', code: 'I2', url: '/api/football-data/mmz4281/2526/I2.csv' },
    { name: 'La Liga', code: 'LL', url: '/api/football-data/mmz4281/2526/SP1.csv' },
    { name: 'Bundesliga', code: 'BL', url: '/api/football-data/mmz4281/2526/D1.csv' },
    { name: 'Ligue 1', code: 'L1', url: '/api/football-data/mmz4281/2526/F1.csv' },
    { name: 'Eredivisie', code: 'N1', url: '/api/football-data/mmz4281/2526/N1.csv' },
    { name: 'Primeira Liga', code: 'P1', url: '/api/football-data/mmz4281/2526/P1.csv' },
    { name: 'Jupiler League', code: 'B1', url: '/api/football-data/mmz4281/2526/B1.csv' },
    { name: 'Super Lig', code: 'T1', url: '/api/football-data/mmz4281/2526/T1.csv' },
    { name: 'Ethniki Katigoria', code: 'G1', url: '/api/football-data/mmz4281/2526/G1.csv' },
    { name: 'Scottish Premiership', code: 'SC0', url: '/api/football-data/mmz4281/2526/SC0.csv' },

    // --- EXTRA LEAGUES (Worldwide) ---
    // Note: These usually use /new/ folder on football-data.co.uk
    { name: 'Argentina Primera', code: 'ARG', url: '/api/football-data/new/ARG.csv' },
    { name: 'Brazil Serie A', code: 'BRA', url: '/api/football-data/new/BRA.csv' },
    { name: 'USA MLS', code: 'USA', url: '/api/football-data/new/USA.csv' },
    { name: 'Mexico Liga MX', code: 'MEX', url: '/api/football-data/new/MEX.csv' },
    { name: 'Japan J-League', code: 'JPN', url: '/api/football-data/new/JPN.csv' },
    { name: 'China Super League', code: 'CHN', url: '/api/football-data/new/CHN.csv' },
    { name: 'Norway Eliteserien', code: 'NOR', url: '/api/football-data/new/NOR.csv' },
    { name: 'Sweden Allsvenskan', code: 'SWE', url: '/api/football-data/new/SWE.csv' },
    { name: 'Denmark Superliga', code: 'DNK', url: '/api/football-data/new/DNK.csv' },
    { name: 'Poland Ekstraklasa', code: 'POL', url: '/api/football-data/new/POL.csv' },
    { name: 'Russia Premier', code: 'RUS', url: '/api/football-data/new/RUS.csv' },
    { name: 'Switzerland Super', code: 'SWZ', url: '/api/football-data/new/SWZ.csv' },
    { name: 'Austria Bundesliga', code: 'AUT', url: '/api/football-data/new/AUT.csv' }
]

const CURRENT_SEASON = '2025-2026'

/**
 * Parse CSV text into match objects
 */
function parseCSV(text: string, leagueCode: string): any[] {
    const rows = text.split('\n').map(row => {
        // Handle quoted fields properly
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (const char of row) {
            if (char === '"') {
                inQuotes = !inQuotes
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim())
                current = ''
            } else {
                current += char
            }
        }
        result.push(current.trim())
        return result
    })

    const headers = rows[0].map(h => h.trim())

    // Indices - Core fields (Flexible for Main vs Extra)
    const dateIdx = headers.indexOf('Date')
    const homeIdx = headers.indexOf('HomeTeam') !== -1 ? headers.indexOf('HomeTeam') : headers.indexOf('Home')
    const awayIdx = headers.indexOf('AwayTeam') !== -1 ? headers.indexOf('AwayTeam') : headers.indexOf('Away')
    const fthgIdx = headers.indexOf('FTHG') !== -1 ? headers.indexOf('FTHG') : headers.indexOf('HG')
    const ftagIdx = headers.indexOf('FTAG') !== -1 ? headers.indexOf('FTAG') : headers.indexOf('AG')

    // Shot stats for xG estimation (Main leagues only)
    const hstIdx = headers.indexOf('HST')  // Home Shots on Target
    const astIdx = headers.indexOf('AST')  // Away Shots on Target
    const hsIdx = headers.indexOf('HS')    // Home Shots
    const asIdx = headers.indexOf('AS')    // Away Shots

    if (dateIdx === -1 || homeIdx === -1 || awayIdx === -1) {
        throw new Error('CSV format error: required headers not found')
    }

    const matches = []

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

        if (isNaN(fthg) || isNaN(ftag)) continue

        // Date convert DD/MM/YYYY -> YYYY-MM-DD
        const parts = dateRaw.split('/')
        if (parts.length !== 3) continue
        let year = parts[2]
        if (year.length === 2) year = '20' + year
        const isoDate = `${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`

        // Calculate estimated xG from shots data
        let homeXg = 0
        let awayXg = 0

        if (hstIdx !== -1 && hsIdx !== -1) {
            const hst = parseFloat(row[hstIdx]) || 0
            const hs = parseFloat(row[hsIdx]) || 0
            const ast = parseFloat(row[astIdx]) || 0
            const as = parseFloat(row[asIdx]) || 0

            // Simple xG model: Shots on Target * 0.32 + Other Shots * 0.04
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
            league: leagueCode,
            season: CURRENT_SEASON
        })
    }

    return matches
}

/**
 * Sync a single league
 */
export async function syncLeague(league: LeagueConfig, onProgress?: (msg: string) => void): Promise<SyncResult> {
    onProgress?.(`Fetching ${league.name}...`)

    try {
        // In development, Vite proxy handles CORS
        // The URLs are already configured to use /api/football-data proxy
        const response = await fetch(league.url)
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const text = await response.text()
        onProgress?.(`Parsing ${league.name} data...`)

        const matches = parseCSV(text, league.code)

        if (matches.length === 0) {
            return { league: league.name, success: false, matchesImported: 0, error: 'No matches parsed' }
        }

        onProgress?.(`Upserting ${matches.length} matches for ${league.name}...`)

        // Upsert to avoid duplicates (requires UNIQUE constraint on date, home_team, away_team)
        const { error } = await supabase
            .from('matches')
            .upsert(matches, {
                onConflict: 'date,home_team,away_team',
                ignoreDuplicates: false
            })

        if (error) {
            return { league: league.name, success: false, matchesImported: 0, error: error.message }
        }

        return { league: league.name, success: true, matchesImported: matches.length }

    } catch (err: any) {
        return { league: league.name, success: false, matchesImported: 0, error: err.message }
    }
}

/**
 * Sync all configured leagues
 */
export async function syncAllLeagues(onProgress?: (msg: string) => void): Promise<SyncResult[]> {
    const results: SyncResult[] = []

    for (const league of LEAGUES) {
        const result = await syncLeague(league, onProgress)
        results.push(result)

        // Small delay between requests to be nice to the server
        await new Promise(r => setTimeout(r, 500))
    }

    return results
}

/**
 * Get sync status / stats from DB
 */
export async function getSyncStats(): Promise<{ league: string; count: number; latestDate: string }[]> {
    const { data, error } = await supabase
        .from('matches')
        .select('league, date')
        .order('date', { ascending: false })

    if (error || !data) return []

    // Group by league
    const stats: Record<string, { count: number; latestDate: string }> = {}

    data.forEach(m => {
        if (!stats[m.league]) {
            stats[m.league] = { count: 0, latestDate: m.date }
        }
        stats[m.league].count++
    })

    return Object.entries(stats).map(([league, s]) => ({
        league,
        count: s.count,
        latestDate: s.latestDate
    }))
}

/**
 * Get detailed database statistics per league
 */
export interface LeagueStats {
    league: string
    leagueName: string
    count: number
    firstDate: string
    lastDate: string
    seasons: number
}

const LEAGUE_NAMES: Record<string, string> = {
    'PL': 'Premier League',
    'E1': 'Championship',
    'SA': 'Serie A',
    'I2': 'Serie B',
    'LL': 'La Liga',
    'BL': 'Bundesliga',
    'L1': 'Ligue 1',
    'N1': 'Eredivisie',
    'P1': 'Primeira Liga',
    'B1': 'Jupiler League',
    'T1': 'Super Lig',
    'G1': 'Ethniki Katigoria',
    'SC0': 'Scottish Premiership',
    'ARG': 'Argentina Primera',
    'BRA': 'Brazil Serie A',
    'USA': 'USA MLS',
    'MEX': 'Mexico Liga MX',
    'JPN': 'Japan J-League',
    'CHN': 'China Super League',
    'NOR': 'Norway Eliteserien',
    'SWE': 'Sweden Allsvenskan',
    'DNK': 'Denmark Superliga',
    'POL': 'Poland Ekstraklasa',
    'RUS': 'Russia Premier',
    'SWZ': 'Switzerland Super',
    'AUT': 'Austria Bundesliga',
    'CL': 'Champions League'
}

const LEAGUE_FLAGS: Record<string, string> = {
    'PL': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'E1': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'SA': '🇮🇹',
    'I2': '🇮🇹',
    'LL': '🇪🇸',
    'BL': '🇩🇪',
    'L1': '🇫🇷',
    'N1': '🇳🇱',
    'P1': '🇵🇹',
    'B1': '🇧🇪',
    'T1': '🇹🇷',
    'G1': '🇬🇷',
    'SC0': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'ARG': '🇦🇷',
    'BRA': '🇧🇷',
    'USA': '🇺🇸',
    'MEX': '🇲🇽',
    'JPN': '🇯🇵',
    'CHN': '🇨🇳',
    'NOR': '🇳🇴',
    'SWE': '🇸🇪',
    'DNK': '🇩🇰',
    'POL': '🇵🇱',
    'RUS': '🇷🇺',
    'SWZ': '🇨🇭',
    'AUT': '🇦🇹',
    'CL': '🇪🇺'
}

export async function getDetailedStats(): Promise<{ leagues: LeagueStats[], total: number, yearSpan: string }> {
    const { data, error } = await supabase
        .from('matches')
        .select('league, date, season')
        .order('date', { ascending: true })

    if (error || !data) return { leagues: [], total: 0, yearSpan: '' }

    // Group by league
    const stats: Record<string, {
        count: number
        firstDate: string
        lastDate: string
        seasons: Set<string>
    }> = {}

    let globalFirst = ''
    let globalLast = ''

    data.forEach(m => {
        if (!stats[m.league]) {
            stats[m.league] = {
                count: 0,
                firstDate: m.date,
                lastDate: m.date,
                seasons: new Set()
            }
        }
        stats[m.league].count++
        stats[m.league].lastDate = m.date
        if (m.season) stats[m.league].seasons.add(m.season)

        if (!globalFirst || m.date < globalFirst) globalFirst = m.date
        if (!globalLast || m.date > globalLast) globalLast = m.date
    })

    const leagues = Object.entries(stats).map(([league, s]) => ({
        league,
        leagueName: LEAGUE_NAMES[league] || league,
        flag: LEAGUE_FLAGS[league] || '⚽',
        count: s.count,
        firstDate: s.firstDate,
        lastDate: s.lastDate,
        seasons: s.seasons.size
    })).sort((a, b) => b.count - a.count)

    const firstYear = globalFirst ? new Date(globalFirst).getFullYear() : 0
    const lastYear = globalLast ? new Date(globalLast).getFullYear() : 0

    return {
        leagues,
        total: data.length,
        yearSpan: `${firstYear} - ${lastYear}`
    }
}

export { LEAGUE_FLAGS, LEAGUE_NAMES }
