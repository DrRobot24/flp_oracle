/**
 * CONSTANTS - Centralized configuration for leagues and other app-wide constants
 * Single source of truth for league metadata across the application
 */

// League metadata with display information
export interface LeagueInfo {
    name: string
    country: string
    flag: string
}

// Sync configuration for data import
export interface LeagueSyncConfig {
    name: string
    code: string
    url: string
}

/**
 * Complete league information - SINGLE SOURCE OF TRUTH
 * Used by: api.ts, DataSourceInfo.tsx, dataSync.ts, DataUploader.tsx
 */
export const LEAGUES: Record<string, LeagueInfo> = {
    // --- TOP 5 EUROPEAN LEAGUES ---
    'SA': { name: 'Serie A', country: '🇮🇹', flag: 'IT' },
    'I2': { name: 'Serie B', country: '🇮🇹', flag: 'IT' },
    'PL': { name: 'Premier League', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', flag: 'GB' },
    'E1': { name: 'Championship', country: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', flag: 'GB' },
    'BL': { name: 'Bundesliga', country: '🇩🇪', flag: 'DE' },
    'LL': { name: 'La Liga', country: '🇪🇸', flag: 'ES' },
    'L1': { name: 'Ligue 1', country: '🇫🇷', flag: 'FR' },

    // --- OTHER EUROPEAN LEAGUES ---
    'N1': { name: 'Eredivisie', country: '🇳🇱', flag: 'NL' },
    'P1': { name: 'Primeira Liga', country: '🇵🇹', flag: 'PT' },
    'B1': { name: 'Jupiler Pro', country: '🇧🇪', flag: 'BE' },
    'T1': { name: 'Süper Lig', country: '🇹🇷', flag: 'TR' },
    'G1': { name: 'Super League', country: '🇬🇷', flag: 'GR' },
    'SC0': { name: 'Premiership', country: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', flag: 'SCO' },
    'POL': { name: 'Ekstraklasa', country: '🇵🇱', flag: 'PL' },
    'RUS': { name: 'Premier Liga', country: '🇷🇺', flag: 'RU' },
    'SWZ': { name: 'Super League', country: '🇨🇭', flag: 'CH' },
    'AUT': { name: 'Bundesliga', country: '🇦🇹', flag: 'AT' },
    'NOR': { name: 'Eliteserien', country: '🇳🇴', flag: 'NO' },
    'SWE': { name: 'Allsvenskan', country: '🇸🇪', flag: 'SE' },
    'DNK': { name: 'Superliga', country: '🇩🇰', flag: 'DK' },

    // --- INTERNATIONAL ---
    'CL': { name: 'Champions League', country: '🇪🇺', flag: 'EU' },

    // --- AMERICAS ---
    'ARG': { name: 'Primera División', country: '🇦🇷', flag: 'AR' },
    'BRA': { name: 'Brasileirão', country: '🇧🇷', flag: 'BR' },
    'USA': { name: 'MLS', country: '🇺🇸', flag: 'US' },
    'MEX': { name: 'Liga MX', country: '🇲🇽', flag: 'MX' },

    // --- ASIA ---
    'JPN': { name: 'J-League', country: '🇯🇵', flag: 'JP' },
    'CHN': { name: 'Super League', country: '🇨🇳', flag: 'CN' },
} as const

export type LeagueCode = keyof typeof LEAGUES

/**
 * Leagues available for selection in the Dashboard
 * Subset of LEAGUES for user-facing features
 */
export const SELECTABLE_LEAGUES: LeagueCode[] = [
    'SA', 'I2', 'PL', 'E1', 'BL', 'LL', 'N1', 'POL', 'CL'
]

/**
 * Sync URLs for football-data.co.uk
 * Season 2025-2026
 */
export const LEAGUE_SYNC_URLS: LeagueSyncConfig[] = [
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

export const CURRENT_SEASON = '2025-2026'

/**
 * Helper to get league info with fallback
 */
export function getLeagueInfo(code: string): LeagueInfo {
    return LEAGUES[code] || { name: code, country: '⚽', flag: 'XX' }
}
