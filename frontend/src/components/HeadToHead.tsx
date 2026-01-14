import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { HeadToHead as H2HType } from '@/lib/api'

interface HeadToHeadProps {
    homeTeam: string
    awayTeam: string
    data: H2HType | null
    loading: boolean
}

export function HeadToHead({ homeTeam, awayTeam, data, loading }: HeadToHeadProps) {
    if (!homeTeam || !awayTeam) {
        return null
    }

    if (loading) {
        return (
            <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
                <CardContent className="py-4 text-center">
                    <div className="animate-pulse">🔄 Caricamento storico...</div>
                </CardContent>
            </Card>
        )
    }

    // No head-to-head history
    if (!data) {
        return (
            <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300">
                <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <div className="font-bold text-orange-800">Nessuno storico diretto</div>
                            <div className="text-sm text-orange-600">
                                {homeTeam} e {awayTeam} non si sono mai incontrate nel database.
                            </div>
                            <div className="text-xs text-orange-500 mt-1">
                                Le previsioni si basano sulle statistiche individuali di ogni squadra.
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const totalWins = data.homeWins + data.awayWins + data.draws
    const homePercent = totalWins > 0 ? (data.homeWins / totalWins) * 100 : 0
    const drawPercent = totalWins > 0 ? (data.draws / totalWins) * 100 : 0
    const awayPercent = totalWins > 0 ? (data.awayWins / totalWins) * 100 : 0

    return (
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">⚔️</span>
                        <span className="font-bold text-blue-900">STORICO SCONTRI DIRETTI</span>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {data.totalMatches} partite
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Win/Draw/Lose Bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="text-green-600">{homeTeam}</span>
                        <span className="text-gray-500">Pareggi</span>
                        <span className="text-red-600">{awayTeam}</span>
                    </div>
                    <div className="flex h-6 rounded-full overflow-hidden">
                        <div 
                            className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                            style={{ width: `${homePercent}%` }}
                        >
                            {data.homeWins > 0 && data.homeWins}
                        </div>
                        <div 
                            className="bg-gray-400 flex items-center justify-center text-white text-xs font-bold"
                            style={{ width: `${drawPercent}%` }}
                        >
                            {data.draws > 0 && data.draws}
                        </div>
                        <div 
                            className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                            style={{ width: `${awayPercent}%` }}
                        >
                            {data.awayWins > 0 && data.awayWins}
                        </div>
                    </div>
                </div>

                {/* Goals Stats */}
                <div className="flex justify-around text-center bg-white/50 rounded-lg py-2">
                    <div>
                        <div className="text-2xl font-black text-green-600">{data.homeGoals}</div>
                        <div className="text-[10px] uppercase text-gray-500">Gol {homeTeam}</div>
                    </div>
                    <div className="border-l border-r border-gray-200 px-4">
                        <div className="text-2xl font-black text-gray-600">
                            {(data.homeGoals / data.totalMatches).toFixed(1)} - {(data.awayGoals / data.totalMatches).toFixed(1)}
                        </div>
                        <div className="text-[10px] uppercase text-gray-500">Media per partita</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-red-600">{data.awayGoals}</div>
                        <div className="text-[10px] uppercase text-gray-500">Gol {awayTeam}</div>
                    </div>
                </div>

                {/* Last Matches */}
                {data.lastMatches.length > 0 && (
                    <div>
                        <div className="text-xs font-bold text-gray-600 mb-1">Ultimi scontri:</div>
                        <div className="flex gap-1 flex-wrap">
                            {data.lastMatches.map((m, i) => (
                                <div 
                                    key={i}
                                    className={`px-2 py-1 rounded text-xs font-bold ${
                                        m.homeGoals > m.awayGoals ? 'bg-green-100 text-green-700' :
                                        m.homeGoals < m.awayGoals ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}
                                    title={new Date(m.date).toLocaleDateString('it-IT')}
                                >
                                    {m.homeGoals}-{m.awayGoals}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}