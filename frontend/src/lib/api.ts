import { supabase } from './supabase'

export interface TeamStats {
    teamName: string
    avgGoalsFor: number
    avgGoalsAgainst: number
    // Venue-specific stats
    avgHomeGoalsFor: number
    avgHomeGoalsAgainst: number
    avgAwayGoalsFor: number
    avgAwayGoalsAgainst: number
    recentMatches: any[]
}

// Re-using the interface from our math engine for consistency
import { NewsImpactItem } from '@/math/newsImpact'

export interface HeadToHead {
    totalMatches: number
    homeWins: number
    awayWins: number
    draws: number
    homeGoals: number
    awayGoals: number
    lastMatches: { date: string; homeGoals: number; awayGoals: number }[]
}

// Available leagues configuration - codes must match database
export const AVAILABLE_LEAGUES = {
    'SA': { name: 'Serie A', country: '🇮🇹', flag: 'IT' },
    'I2': { name: 'Serie B', country: '🇮🇹', flag: 'IT' },
    'PL': { name: 'Premier League', country: '🇬🇧', flag: 'GB' },
    'E1': { name: 'Championship', country: '🇬🇧', flag: 'GB' },
    'BL': { name: 'Bundesliga', country: '🇩🇪', flag: 'DE' },
    'LL': { name: 'La Liga', country: '🇪🇸', flag: 'ES' },
    'N1': { name: 'Eredivisie', country: '🇳🇱', flag: 'NL' },
    'POL': { name: 'Ekstraklasa', country: '🇵🇱', flag: 'PL' },
    'CL': { name: 'Champions League', country: '🇪🇺', flag: 'EU' },
} as const

export type LeagueCode = keyof typeof AVAILABLE_LEAGUES

export const api = {
    // Get teams filtered by selected leagues (much faster!)
    async getTeamsByLeagues(leagues: LeagueCode[]): Promise<string[]> {
        if (leagues.length === 0) return []
        
        const teams = new Set<string>()
        
        // Query only recent season for each league - much faster
        for (const league of leagues) {
            const { data, error } = await supabase
                .from('matches')
                .select('home_team, away_team')
                .eq('league', league)
                .order('date', { ascending: false })
                .limit(500) // Last 500 matches per league = enough for all teams
            
            if (error) {
                console.error(`Error fetching teams for ${league}:`, error)
                continue
            }
            
            data?.forEach(match => {
                if (match.home_team) teams.add(match.home_team.trim())
                if (match.away_team) teams.add(match.away_team.trim())
            })
        }
        
        return Array.from(teams).sort()
    },

    // Legacy method - kept for compatibility but not recommended
    async getTeams(): Promise<string[]> {
        // Default to major leagues only
        return this.getTeamsByLeagues(['SA', 'PL', 'BL'])
    },

    // Get head-to-head stats between two teams
    async getHeadToHead(homeTeam: string, awayTeam: string): Promise<HeadToHead | null> {
        // Get all matches between these two teams (in any home/away combination)
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .or(`and(home_team.eq.${homeTeam},away_team.eq.${awayTeam}),and(home_team.eq.${awayTeam},away_team.eq.${homeTeam})`)
            .order('date', { ascending: false })
            .limit(20)

        if (error || !data || data.length === 0) {
            return null // No head-to-head history
        }

        let homeWins = 0, awayWins = 0, draws = 0, homeGoals = 0, awayGoals = 0

        data.forEach(m => {
            // Normalize: count from perspective of the selected homeTeam
            if (m.home_team === homeTeam) {
                homeGoals += m.home_goals
                awayGoals += m.away_goals
                if (m.home_goals > m.away_goals) homeWins++
                else if (m.home_goals < m.away_goals) awayWins++
                else draws++
            } else {
                // Match was played with roles reversed
                homeGoals += m.away_goals
                awayGoals += m.home_goals
                if (m.away_goals > m.home_goals) homeWins++
                else if (m.away_goals < m.home_goals) awayWins++
                else draws++
            }
        })

        return {
            totalMatches: data.length,
            homeWins,
            awayWins,
            draws,
            homeGoals,
            awayGoals,
            lastMatches: data.slice(0, 5).map(m => ({
                date: m.date,
                homeGoals: m.home_team === homeTeam ? m.home_goals : m.away_goals,
                awayGoals: m.home_team === homeTeam ? m.away_goals : m.home_goals
            }))
        }
    },

    // Calculate stats based on last N matches
    async getTeamStats(team: string, limit: number = 20): Promise<TeamStats> {
        // We need matches where team was Home OR Away
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .or(`home_team.eq."${team}",away_team.eq."${team}"`)
            .order('date', { ascending: false })
            .limit(limit)

        if (error || !data) return {
            teamName: team,
            avgGoalsFor: 0,
            avgGoalsAgainst: 0,
            avgHomeGoalsFor: 0,
            avgHomeGoalsAgainst: 0,
            avgAwayGoalsFor: 0,
            avgAwayGoalsAgainst: 0,
            recentMatches: []
        }

        // Calculate Averages
        let goalsFor = 0, goalsAgainst = 0
        let hGoalsFor = 0, hGoalsAgainst = 0, hCount = 0
        let aGoalsFor = 0, aGoalsAgainst = 0, aCount = 0

        // Sort chronologically for trajectory usage later (oldest first)
        const matches = [...data].reverse()

        matches.forEach(m => {
            if (m.home_team === team) {
                goalsFor += m.home_goals
                goalsAgainst += m.away_goals
                hGoalsFor += m.home_goals
                hGoalsAgainst += m.away_goals
                hCount++
            } else {
                goalsFor += m.away_goals
                goalsAgainst += m.home_goals
                aGoalsFor += m.away_goals
                aGoalsAgainst += m.home_goals
                aCount++
            }
        })

        return {
            teamName: team,
            avgGoalsFor: matches.length ? goalsFor / matches.length : 0,
            avgGoalsAgainst: matches.length ? goalsAgainst / matches.length : 0,
            avgHomeGoalsFor: hCount ? hGoalsFor / hCount : (goalsFor / matches.length || 0),
            avgHomeGoalsAgainst: hCount ? hGoalsAgainst / hCount : (goalsAgainst / matches.length || 0),
            avgAwayGoalsFor: aCount ? aGoalsFor / aCount : (goalsFor / matches.length || 0),
            avgAwayGoalsAgainst: aCount ? aGoalsAgainst / aCount : (goalsAgainst / matches.length || 0),
            recentMatches: matches
        }
    },

    // Get active news for a team (last 7 days by default)
    async getNews(team: string): Promise<NewsImpactItem[]> {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await supabase
            .from('news')
            .select('*')
            .eq('team_name', team)
            .gte('published_at', sevenDaysAgo.toISOString())
            .order('published_at', { ascending: false })

        if (error || !data) {
            console.error('Error fetching news:', error)
            return []
        }

        // Transform DB rows to internal NewsImpactItem format
        return data.map(row => ({
            teamName: row.team_name,
            category: row.category,
            sentiment: row.sentiment,
            sourceReliability: row.reliability,
            publishedAt: new Date(row.published_at),
            rawText: row.title + (row.summary ? ` - ${row.summary}` : '')
        }))
    }
}

