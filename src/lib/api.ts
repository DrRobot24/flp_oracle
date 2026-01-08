import { supabase } from './supabase'

export interface TeamStats {
    teamName: string
    avgGoalsFor: number
    avgGoalsAgainst: number
    recentMatches: any[]
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
