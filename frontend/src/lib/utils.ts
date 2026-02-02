import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { PhasePoint } from '@/math/geometric'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Convert date string from DD/MM/YYYY to YYYY-MM-DD format
 * Handles both formats for compatibility with football-data.co.uk CSVs
 */
export function convertDate(dateStr: string): string | null {
    if (!dateStr) return null
    // If already YYYY-MM-DD
    if (dateStr.includes('-')) return dateStr

    // If DD/MM/YYYY
    const parts = dateStr.split('/')
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
}

/**
 * Calculates a rolling average for match stats to smooth out the trajectory.
 * Window size of 5 matches is standard for "Form".
 * 
 * @param matches - Array of match objects with home_team, away_team, home_goals, away_goals
 * @param team - Team name to calculate rolling average for
 * @param windowSize - Number of matches for rolling window (default: 5)
 * @returns Array of PhasePoints representing the team's form trajectory
 */
export function calculateRollingAverage(
    matches: Array<{ home_team: string; away_team: string; home_goals: number; away_goals: number }>,
    team: string,
    windowSize: number = 5
): PhasePoint[] {
    const points: PhasePoint[] = []

    // Create cumulative stats to avoid re-looping
    for (let i = 0; i < matches.length; i++) {
        // We need at least 'windowSize' matches to form a point
        if (i < windowSize - 1) continue

        const window = matches.slice(i - windowSize + 1, i + 1)
        let goalsFor = 0
        let goalsAgainst = 0

        window.forEach(m => {
            if (m.home_team === team) {
                goalsFor += m.home_goals
                goalsAgainst += m.away_goals
            } else {
                goalsFor += m.away_goals
                goalsAgainst += m.home_goals
            }
        })

        points.push({
            time: i,
            x: Number((goalsFor / windowSize).toFixed(2)),
            y: Number((goalsAgainst / windowSize).toFixed(2)),
            className: "history"
        })
    }

    // If we have very few matches, fallback to raw data
    if (points.length === 0 && matches.length > 0) {
        return matches.map((m, i) => ({
            time: i,
            x: m.home_team === team ? m.home_goals : m.away_goals,
            y: m.home_team === team ? m.away_goals : m.home_goals,
            className: "history"
        }))
    }

    return points
}
