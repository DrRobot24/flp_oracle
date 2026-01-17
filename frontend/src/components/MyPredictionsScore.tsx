import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface UserPredictionResult {
    id: number
    home_team: string
    away_team: string
    user_prediction: string // 'HOME_WIN' | 'DRAW' | 'AWAY_WIN'
    stake: number
    created_at: string
    match_date?: string
    // Stored result (from predictions table)
    actual_home_goals?: number | null
    actual_away_goals?: number | null
    // Computed
    actualResult?: {
        home_goals: number
        away_goals: number
        outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN'
    }
    isCorrect?: boolean
    points?: number // +stake if correct, -stake if wrong
}

export function MyPredictionsScore() {
    const { user, isAdmin } = useAuth()
    const [predictions, setPredictions] = useState<UserPredictionResult[]>([])
    const [loading, setLoading] = useState(true)
    const [totalScore, setTotalScore] = useState(0)
    const [stats, setStats] = useState({ wins: 0, losses: 0, pending: 0 })
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editScore, setEditScore] = useState({ home: 0, away: 0 })

    useEffect(() => {
        loadMyPredictions()
    }, [user])

    async function loadMyPredictions() {
        setLoading(true)

        // Get ALL user predictions (not just current user's if admin)
        let query = supabase
            .from('predictions')
            .select('*')
            .not('user_prediction', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20)

        // If not admin, only show own predictions
        if (!isAdmin && user) {
            query = query.eq('user_id', user.id)
        }

        const { data, error } = await query

        if (error || !data) {
            console.error('Error loading predictions:', error)
            setLoading(false)
            return
        }

        // Process predictions - check if we have stored results OR find in matches
        const withResults: UserPredictionResult[] = await Promise.all(
            data.map(async (pred) => {
                const result: UserPredictionResult = {
                    id: pred.id,
                    home_team: pred.home_team,
                    away_team: pred.away_team,
                    user_prediction: pred.user_prediction,
                    stake: pred.stake || 5,
                    created_at: pred.created_at,
                    match_date: pred.match_date,
                    actual_home_goals: pred.actual_home_goals,
                    actual_away_goals: pred.actual_away_goals
                }

                // Check if result is stored in the prediction itself
                if (pred.actual_home_goals !== null && pred.actual_away_goals !== null) {
                    const outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' =
                        pred.actual_home_goals > pred.actual_away_goals ? 'HOME_WIN' :
                            pred.actual_home_goals < pred.actual_away_goals ? 'AWAY_WIN' : 'DRAW'

                    result.actualResult = {
                        home_goals: pred.actual_home_goals,
                        away_goals: pred.actual_away_goals,
                        outcome
                    }

                    // Convert user_prediction ('1', 'X', '2') to outcome format
                    // Convert user_prediction to outcome format (normalized)
                    const userOutcome =
                        pred.user_prediction === '1' || pred.user_prediction === 'HOME_WIN' ? 'HOME_WIN' :
                            pred.user_prediction === '2' || pred.user_prediction === 'AWAY_WIN' ? 'AWAY_WIN' :
                                'DRAW'

                    result.isCorrect = userOutcome === outcome
                    result.points = result.isCorrect ? result.stake : -result.stake
                } else {
                    // Fallback: look in matches table
                    const predDate = new Date(pred.created_at).toISOString().split('T')[0]
                    const { data: matchData } = await supabase
                        .from('matches')
                        .select('home_goals, away_goals, date')
                        .eq('home_team', pred.home_team)
                        .eq('away_team', pred.away_team)
                        .gte('date', predDate)
                        .order('date', { ascending: true })
                        .limit(1)

                    if (matchData && matchData.length > 0) {
                        const match = matchData[0]
                        const outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' =
                            match.home_goals > match.away_goals ? 'HOME_WIN' :
                                match.home_goals < match.away_goals ? 'AWAY_WIN' : 'DRAW'

                        result.actualResult = {
                            home_goals: match.home_goals,
                            away_goals: match.away_goals,
                            outcome
                        }

                        // Convert user_prediction to outcome format (normalized)
                        const userOutcome =
                            pred.user_prediction === '1' || pred.user_prediction === 'HOME_WIN' ? 'HOME_WIN' :
                                pred.user_prediction === '2' || pred.user_prediction === 'AWAY_WIN' ? 'AWAY_WIN' :
                                    'DRAW'

                        result.isCorrect = userOutcome === outcome
                        result.points = result.isCorrect ? result.stake : -result.stake
                    }
                }

                return result
            })
        )

        setPredictions(withResults)

        // Calculate totals
        const verified = withResults.filter(p => p.actualResult)
        const wins = verified.filter(p => p.isCorrect).length
        const losses = verified.filter(p => !p.isCorrect).length
        const pending = withResults.filter(p => !p.actualResult).length
        const score = verified.reduce((sum, p) => sum + (p.points || 0), 0)

        setStats({ wins, losses, pending })
        setTotalScore(score)
        setLoading(false)
    }

    // Admin: save actual result
    async function saveActualResult(predId: number) {
        const { error } = await supabase
            .from('predictions')
            .update({
                actual_home_goals: editScore.home,
                actual_away_goals: editScore.away
            })
            .eq('id', predId)

        if (error) {
            console.error('Error saving result:', error)
            alert('Errore: ' + error.message)
            return
        }

        setEditingId(null)
        loadMyPredictions() // Reload
    }

    if (loading) {
        return (
            <div className="bg-slate-900 rounded-lg p-4 text-center">
                <div className="animate-pulse text-yellow-400">🎯 Loading...</div>
            </div>
        )
    }

    if (predictions.length === 0) {
        return (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg border border-blue-500/50 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🎯</span>
                    <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">Le Mie Previsioni</span>
                </div>
                <div className="text-center text-white/50 py-4">
                    Nessuna previsione salvata.<br />
                    <span className="text-xs">Usa il pannello "La Tua Previsione" per iniziare!</span>
                </div>
            </div>
        )
    }

    const predictionToLabel = (pred: string) => {
        if (pred === '1' || pred === 'HOME_WIN') return '1'
        if (pred === '2' || pred === 'AWAY_WIN') return '2'
        return 'X'
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-lg border border-blue-500/50 p-4">
            {/* Header with Score */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">
                        {isAdmin ? 'Tutte le Previsioni' : 'Le Mie Previsioni'}
                    </span>
                    {isAdmin && <span className="text-[10px] bg-red-500 px-1 rounded">ADMIN</span>}
                </div>
                <div className="flex items-center gap-3">
                    {/* Score Badge */}
                    <div className={`px-3 py-1 rounded-full font-black text-lg ${totalScore > 0 ? 'bg-green-500/30 text-green-400' :
                        totalScore < 0 ? 'bg-red-500/30 text-red-400' :
                            'bg-gray-500/30 text-gray-400'
                        }`}>
                        {totalScore > 0 ? '+' : ''}{totalScore} pts
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex justify-around text-center bg-white/5 rounded py-2 mb-3">
                <div>
                    <div className="text-lg font-bold text-green-400">{stats.wins}</div>
                    <div className="text-[10px] uppercase opacity-60">✅ Corrette</div>
                </div>
                <div>
                    <div className="text-lg font-bold text-red-400">{stats.losses}</div>
                    <div className="text-[10px] uppercase opacity-60">❌ Sbagliate</div>
                </div>
                <div>
                    <div className="text-lg font-bold text-yellow-400">{stats.pending}</div>
                    <div className="text-[10px] uppercase opacity-60">⏳ In Attesa</div>
                </div>
            </div>

            {/* Recent Predictions List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {predictions.slice(0, 10).map(pred => (
                    <div key={pred.id}>
                        <div
                            className={`flex items-center gap-2 text-xs p-1.5 rounded ${pred.actualResult
                                ? pred.isCorrect
                                    ? 'bg-green-500/20 border-l-2 border-green-500'
                                    : 'bg-red-500/20 border-l-2 border-red-500'
                                : 'bg-yellow-500/10 border-l-2 border-yellow-500'
                                }`}
                        >
                            {/* Prediction Badge */}
                            <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-black ${(pred.user_prediction === '1' || pred.user_prediction === 'HOME_WIN') ? 'bg-emerald-500 text-white' :
                                (pred.user_prediction === '2' || pred.user_prediction === 'AWAY_WIN') ? 'bg-rose-500 text-white' :
                                    'bg-slate-500 text-white'
                                }`}>
                                {predictionToLabel(pred.user_prediction)}
                            </span>

                            {/* Match Info */}
                            <div className="flex-1 truncate">
                                <span className="font-medium">{pred.home_team}</span>
                                <span className="text-white/40 mx-1">vs</span>
                                <span className="font-medium">{pred.away_team}</span>
                            </div>

                            {/* Stake */}
                            <span className="text-yellow-400 font-mono text-[10px]">
                                {pred.stake}/10
                            </span>

                            {/* Result or Pending */}
                            {pred.actualResult ? (
                                <span className={`font-bold min-w-[40px] text-right ${pred.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    {pred.actualResult.home_goals}-{pred.actualResult.away_goals} {pred.isCorrect ? `+${pred.stake}` : `-${pred.stake}`}
                                </span>
                            ) : (
                                <>
                                    {isAdmin ? (
                                        <button
                                            onClick={() => {
                                                setEditingId(pred.id)
                                                setEditScore({ home: 0, away: 0 })
                                            }}
                                            className="text-[10px] bg-blue-500 hover:bg-blue-600 px-2 py-0.5 rounded"
                                        >
                                            ✏️ Risultato
                                        </button>
                                    ) : (
                                        <span className="text-yellow-400 text-[10px]">⏳</span>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Admin Edit Form */}
                        {isAdmin && editingId === pred.id && (
                            <div className="bg-blue-900/50 p-2 rounded mt-1 flex items-center gap-2">
                                <span className="text-[10px] text-white/70">Risultato:</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="15"
                                    value={editScore.home}
                                    onChange={e => setEditScore(s => ({ ...s, home: parseInt(e.target.value) || 0 }))}
                                    className="w-10 bg-white/10 text-center rounded text-sm"
                                />
                                <span className="text-white/50">-</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="15"
                                    value={editScore.away}
                                    onChange={e => setEditScore(s => ({ ...s, away: parseInt(e.target.value) || 0 }))}
                                    className="w-10 bg-white/10 text-center rounded text-sm"
                                />
                                <button
                                    onClick={() => saveActualResult(pred.id)}
                                    className="bg-green-500 hover:bg-green-600 px-2 py-0.5 rounded text-[10px] font-bold"
                                >
                                    ✓ Salva
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="bg-red-500/50 hover:bg-red-500 px-2 py-0.5 rounded text-[10px]"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {predictions.length > 10 && (
                <div className="text-center text-[10px] opacity-50 mt-2">
                    +{predictions.length - 10} altre previsioni...
                </div>
            )}

            {/* Footer */}
            <div className="text-center text-[10px] opacity-40 mt-3 pt-2 border-t border-white/10">
                🎲 Stake corretto = +punti | Stake sbagliato = -punti
            </div>
        </div>
    )
}