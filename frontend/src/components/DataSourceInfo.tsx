import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database, TrendingUp, Calendar, Globe } from 'lucide-react'

interface DataSourceStats {
    total: number
    leagues: {
        code: string
        name: string
        flag: string
        count: number
        seasons: number
        firstYear: number
        lastYear: number
    }[]
    yearSpan: { first: number; last: number }
}

const LEAGUE_INFO: Record<string, { name: string; flag: string }> = {
    'SA': { name: 'Serie A', flag: '🇮🇹' },
    'I2': { name: 'Serie B', flag: '🇮🇹' },
    'PL': { name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    'E1': { name: 'Championship', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    'BL': { name: 'Bundesliga', flag: '🇩🇪' },
    'LL': { name: 'La Liga', flag: '🇪🇸' },
    'L1': { name: 'Ligue 1', flag: '🇫🇷' },
    'N1': { name: 'Eredivisie', flag: '🇳🇱' },
    'P1': { name: 'Primeira Liga', flag: '🇵🇹' },
    'B1': { name: 'Jupiler Pro', flag: '🇧🇪' },
    'T1': { name: 'Süper Lig', flag: '🇹🇷' },
    'G1': { name: 'Super League', flag: '🇬🇷' },
    'SC0': { name: 'Premiership', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    'CL': { name: 'Champions League', flag: '🇪🇺' },
    'ARG': { name: 'Primera División', flag: '🇦🇷' },
    'BRA': { name: 'Brasileirão', flag: '🇧🇷' },
    'USA': { name: 'MLS', flag: '🇺🇸' },
    'MEX': { name: 'Liga MX', flag: '🇲🇽' },
    'JPN': { name: 'J-League', flag: '🇯🇵' },
    'CHN': { name: 'Super League', flag: '🇨🇳' },
    'NOR': { name: 'Eliteserien', flag: '🇳🇴' },
    'SWE': { name: 'Allsvenskan', flag: '🇸🇪' },
    'DNK': { name: 'Superliga', flag: '🇩🇰' },
    'POL': { name: 'Ekstraklasa', flag: '🇵🇱' },
    'RUS': { name: 'Premier Liga', flag: '🇷🇺' },
    'SWZ': { name: 'Super League', flag: '🇨🇭' },
    'AUT': { name: 'Bundesliga', flag: '🇦🇹' },
}

export function DataSourceInfo({ compact = false }: { compact?: boolean }) {
    const [stats, setStats] = useState<DataSourceStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
    }, [])

    async function loadStats() {
        try {
            // Get all matches grouped by league
            const { data, error } = await supabase
                .from('matches')
                .select('league, season, date')
            
            if (error || !data) {
                setLoading(false)
                return
            }

            // Process data
            const leagueMap: Record<string, { count: number; seasons: Set<string>; dates: string[] }> = {}
            let globalFirst = ''
            let globalLast = ''

            data.forEach(m => {
                const league = m.league || 'Unknown'
                if (!leagueMap[league]) {
                    leagueMap[league] = { count: 0, seasons: new Set(), dates: [] }
                }
                leagueMap[league].count++
                if (m.season) leagueMap[league].seasons.add(m.season)
                if (m.date) leagueMap[league].dates.push(m.date)

                if (!globalFirst || m.date < globalFirst) globalFirst = m.date
                if (!globalLast || m.date > globalLast) globalLast = m.date
            })

            const leagues = Object.entries(leagueMap)
                .map(([code, info]) => {
                    const leagueInfo = LEAGUE_INFO[code] || { name: code, flag: '⚽' }
                    const sortedDates = info.dates.sort()
                    return {
                        code,
                        name: leagueInfo.name,
                        flag: leagueInfo.flag,
                        count: info.count,
                        seasons: info.seasons.size,
                        firstYear: sortedDates.length ? new Date(sortedDates[0]).getFullYear() : 0,
                        lastYear: sortedDates.length ? new Date(sortedDates[sortedDates.length - 1]).getFullYear() : 0
                    }
                })
                .filter(l => l.count > 50) // Filter out very small leagues
                .sort((a, b) => b.count - a.count)

            setStats({
                total: data.length,
                leagues,
                yearSpan: {
                    first: globalFirst ? new Date(globalFirst).getFullYear() : 0,
                    last: globalLast ? new Date(globalLast).getFullYear() : 0
                }
            })
        } catch (err) {
            console.error('Error loading stats:', err)
        }
        setLoading(false)
    }

    if (loading) {
        return (
            <div className="bg-slate-900/50 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-slate-700 rounded w-48 mb-4"></div>
                <div className="h-4 bg-slate-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            </div>
        )
    }

    if (!stats) return null

    if (compact) {
        return (
            <div className="bg-gradient-to-r from-primary/10 to-yellow-500/10 border border-primary/30 rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Database className="text-primary" size={24} />
                        <div>
                            <div className="text-2xl font-black text-white">{stats.total.toLocaleString()}</div>
                            <div className="text-xs text-slate-400">partite analizzate</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Globe className="text-blue-400" size={24} />
                        <div>
                            <div className="text-2xl font-black text-white">{stats.leagues.length}</div>
                            <div className="text-xs text-slate-400">campionati</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Calendar className="text-green-400" size={24} />
                        <div>
                            <div className="text-2xl font-black text-white">{stats.yearSpan.last - stats.yearSpan.first + 1}</div>
                            <div className="text-xs text-slate-400">anni di dati</div>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500">
                        Fonte: <a href="https://www.football-data.co.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">football-data.co.uk</a>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                    <Database className="text-primary" size={28} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Database Statistico</h3>
                    <p className="text-slate-400 text-sm">I dati che alimentano le nostre analisi</p>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-primary">{stats.total.toLocaleString()}</div>
                    <div className="text-xs text-slate-400 mt-1">Partite Totali</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-blue-400">{stats.leagues.length}</div>
                    <div className="text-xs text-slate-400 mt-1">Campionati</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <div className="text-3xl font-black text-green-400">{stats.yearSpan.first} - {stats.yearSpan.last}</div>
                    <div className="text-xs text-slate-400 mt-1">Periodo</div>
                </div>
            </div>

            {/* Leagues Breakdown */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <TrendingUp size={16} />
                    Distribuzione per Campionato
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-2">
                    {stats.leagues.map(league => (
                        <div 
                            key={league.code} 
                            className="flex items-center gap-2 bg-slate-800/30 rounded-lg p-2 hover:bg-slate-800/50 transition-colors"
                        >
                            <span className="text-lg">{league.flag}</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-white truncate">{league.name}</div>
                                <div className="text-[10px] text-slate-500">{league.count.toLocaleString()} partite</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Data Source */}
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-start gap-3">
                    <div className="text-2xl">📊</div>
                    <div>
                        <h4 className="text-sm font-semibold text-white">Fonte Dati</h4>
                        <p className="text-xs text-slate-400 mt-1">
                            I dati storici provengono da{' '}
                            <a 
                                href="https://www.football-data.co.uk" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                            >
                                Football-Data.co.uk
                            </a>
                            , uno dei database più completi e affidabili per le statistiche calcistiche europee.
                            Include risultati, statistiche di gioco e quote storiche dal 1993.
                        </p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-700/50">
                🎲 Più dati = Previsioni più accurate • Aggiornato automaticamente
            </div>
        </div>
    )
}
