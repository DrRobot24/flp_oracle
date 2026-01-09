import { supabase } from './supabase'

export interface TeamStats {
    teamName: string
    avgGoalsFor: number
    avgGoalsAgainst: number
    recentMatches: any[]
}

export interface HeadToHead {
    totalMatches: number
    homeWins: number
    awayWins: number
    draws: number
    homeGoals: number
    awayGoals: number
    lastMatches: { date: string; homeGoals: number; awayGoals: number }[]
}

export const api = {
    // Get list of all teams in the database (for dropdown)
    async getTeams(): Promise<string[]> {
        const { data, error } = await supabase
            .from('matches')
            .select('home_team, away_team')

        if (error) {
            console.error(error)
            return []
        }

        // Extract unique team names
        const teams = new Set<string>()
        data.forEach(match => {
            teams.add(match.home_team)
            teams.add(match.away_team)
        })

        return Array.from(teams).sort()
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
    async getTeamStats(team: string, limit: number = 10): Promise<TeamStats> {
        // We need matches where team was Home OR Away
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .or(`home_team.eq.${team},away_team.eq.${team}`)
            .order('date', { ascending: false })
            .limit(limit)

        if (error || !data) return { teamName: team, avgGoalsFor: 0, avgGoalsAgainst: 0, recentMatches: [] }

        // Calculate Averages
        let goalsFor = 0
        let goalsAgainst = 0

        // Sort chronologically for trajectory usage later (oldest first)
        const matches = data.reverse()

        matches.forEach(m => {
            if (m.home_team === team) {
                goalsFor += m.home_goals
                goalsAgainst += m.away_goals
            } else {
                goalsFor += m.away_goals
                goalsAgainst += m.home_goals
            }
        })

        return {
            teamName: team,
            avgGoalsFor: matches.length ? goalsFor / matches.length : 0,
            avgGoalsAgainst: matches.length ? goalsAgainst / matches.length : 0,
            recentMatches: matches
        }
    }
}
