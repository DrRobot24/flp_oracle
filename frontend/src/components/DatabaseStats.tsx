import { useState, useEffect } from 'react'
import { getDetailedStats, LeagueStats, LEAGUE_FLAGS } from '@/lib/dataSync'

export function DatabaseStats() {
    const [stats, setStats] = useState<{
        leagues: (LeagueStats & { flag?: string })[]
        total: number
        yearSpan: string
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        setLoading(true)
        const data = await getDetailedStats()
        // Add flags
        data.leagues = data.leagues.map(l => ({
            ...l,
            flag: LEAGUE_FLAGS[l.league] || '⚽'
        }))
        setStats(data)
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="bg-slate-900 rounded-lg p-4 text-center">
                <div className="animate-pulse text-yellow-400">📊 Loading...</div>
            </div>
        )
    }

    if (!stats || stats.total === 0) {
        return null
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg border border-yellow-500/50 p-4">
            {/* Header + Big Numbers in one row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">📊</span>
                    <span className="text-xs uppercase tracking-widest text-yellow-400 font-bold">Monte Carlo DB</span>
                </div>
                <div className="flex gap-4 text-center">
                    <div>
                        <div className="text-2xl font-black text-yellow-400">{stats.total.toLocaleString()}</div>
                        <div className="text-[10px] uppercase opacity-60">Matches</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-green-400">{stats.leagues.reduce((acc, l) => acc + l.seasons, 0) / stats.leagues.length | 0}</div>
                        <div className="text-[10px] uppercase opacity-60">Seasons</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-blue-400">{stats.leagues.length}</div>
                        <div className="text-[10px] uppercase opacity-60">Leagues</div>
                    </div>
                </div>
            </div>

            {/* Year Span - compact */}
            <div className="text-center bg-yellow-400/20 py-1 rounded mb-3 text-sm">
                <span className="text-yellow-300 font-bold">📅 {stats.yearSpan}</span>
                <span className="text-white/50 ml-2 text-xs">Coverage</span>
            </div>

            {/* League Breakdown - compact */}
            <div className="space-y-1.5">
                {stats.leagues.map(league => {
                    const percentage = (league.count / stats.total) * 100
                    return (
                        <div key={league.league} className="flex items-center gap-2">
                            <span className="text-sm w-6">{league.flag}</span>
                            <div className="flex-1">
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                            <span className="text-yellow-300 font-mono text-xs w-12 text-right">{league.count.toLocaleString()}</span>
                            <span className="text-[10px] opacity-40 w-24 text-right">
                                {new Date(league.firstDate).toLocaleDateString('it-IT', {day:'2-digit', month:'short', year:'2-digit'})} → {new Date(league.lastDate).toLocaleDateString('it-IT', {day:'2-digit', month:'short', year:'2-digit'})}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] opacity-40 mt-3 pt-2 border-t border-white/10">
                🎲 More data = More accurate simulations
            </div>
        </div>
    )
}
