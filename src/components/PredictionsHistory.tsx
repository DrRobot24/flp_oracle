import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

interface Prediction {
    id: number
    created_at: string
    home_team: string
    away_team: string
    home_xg: number
    away_xg: number
    prob_home: number
    prob_draw: number
    prob_away: number
    predicted_outcome: string
    user_prediction?: string | null
    stake?: number | null
}

interface MatchResult {
    home_goals: number
    away_goals: number
    actual_outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN'
}

interface PredictionWithResult extends Prediction {
    actualResult?: MatchResult
    isCorrect?: boolean
    userIsCorrect?: boolean
}

export interface PredictionsHistoryHandle {
    refresh: () => void
}

export const PredictionsHistory = forwardRef<PredictionsHistoryHandle>((_, ref) => {
    const [predictions, setPredictions] = useState<PredictionWithResult[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, verified: 0, correct: 0, accuracy: 0, userCorrect: 0, userTotal: 0, userAccuracy: 0 })
    const [showAll, setShowAll] = useState(false)

    useImperativeHandle(ref, () => ({
        refresh: fetchPredictionsWithResults
    }))

    useEffect(() => {
        fetchPredictionsWithResults()
    }, [])

    async function fetchPredictionsWithResults() {
        setLoading(true)

        // Fetch all predictions
        const { data: predictionsData, error: predError } = await supabase
            .from('predictions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (predError || !predictionsData) {
            console.error('Error fetching predictions:', predError)
            setLoading(false)
            return
        }

        // For each prediction, try to find the actual match result
        const predictionsWithResults: PredictionWithResult[] = await Promise.all(
            predictionsData.map(async (pred) => {
                // Look for a match with these teams AFTER the prediction was made
                // (the prediction is for a future match)
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
                    const actual_outcome: 'HOME_WIN' | 'DRAW' | 'AWAY_WIN' =
                        match.home_goals > match.away_goals ? 'HOME_WIN' :
                            match.home_goals < match.away_goals ? 'AWAY_WIN' : 'DRAW'

                    return {
                        ...pred,
                        actualResult: {
                            home_goals: match.home_goals,
                            away_goals: match.away_goals,
                            actual_outcome
                        },
                        isCorrect: pred.predicted_outcome === actual_outcome,
                        userIsCorrect: pred.user_prediction ? pred.user_prediction === actual_outcome : undefined
                    }
                }

                return pred
            })
        )

        setPredictions(predictionsWithResults)

        // Calculate stats
        const verified = predictionsWithResults.filter(p => p.actualResult).length
        const correct = predictionsWithResults.filter(p => p.isCorrect).length
        
        // User prediction stats
        const userPredictions = predictionsWithResults.filter(p => p.user_prediction)
        const userVerified = userPredictions.filter(p => p.actualResult).length
        const userCorrect = userPredictions.filter(p => p.userIsCorrect).length
        
        setStats({
            total: predictionsWithResults.length,
            verified,
            correct,
            accuracy: verified > 0 ? (correct / verified) * 100 : 0,
            userCorrect,
            userTotal: userPredictions.length,
            userAccuracy: userVerified > 0 ? (userCorrect / userVerified) * 100 : 0
        })

        setLoading(false)
    }

    const displayedPredictions = showAll ? predictions : predictions.slice(0, 10)

    if (loading) {
        return (
            <Card>
                <CardHeader>📜 Predictions History</CardHeader>
                <CardContent>
                    <div className="text-center py-8 animate-pulse">Loading predictions...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <span>📜 Predictions History</span>
                <Button 
                    variant="outline" 
                    onClick={fetchPredictionsWithResults}
                    className="text-xs h-8"
                >
                    🔄 Refresh
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* ACCURACY STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-100 rounded-lg">
                    <div className="text-center">
                        <div className="text-2xl font-black">{stats.total}</div>
                        <div className="text-xs text-gray-500 uppercase">Total</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-blue-600">{stats.verified}</div>
                        <div className="text-xs text-gray-500 uppercase">Verified</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-black text-green-600">{stats.correct}</div>
                        <div className="text-xs text-gray-500 uppercase">AI Correct</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-black ${stats.accuracy >= 50 ? 'text-green-600' : stats.accuracy >= 33 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {stats.accuracy.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500 uppercase">AI Accuracy</div>
                    </div>
                </div>

                {/* USER STATS */}
                {stats.userTotal > 0 && (
                    <div className="grid grid-cols-3 gap-3 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                        <div className="text-center">
                            <div className="text-xl font-black text-purple-600">{stats.userTotal}</div>
                            <div className="text-xs text-gray-500 uppercase">Your Bets</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-black text-green-600">{stats.userCorrect}</div>
                            <div className="text-xs text-gray-500 uppercase">Correct</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-xl font-black ${stats.userAccuracy >= 50 ? 'text-green-600' : stats.userAccuracy >= 33 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {stats.userAccuracy.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500 uppercase">Your Accuracy</div>
                        </div>
                    </div>
                )}

                {/* Accuracy Bar */}
                {stats.verified > 0 && (
                    <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className={`absolute left-0 top-0 h-full transition-all duration-500 ${
                                stats.accuracy >= 50 ? 'bg-green-500' : 
                                stats.accuracy >= 33 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${stats.accuracy}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                            {stats.accuracy.toFixed(1)}% Accuracy
                        </div>
                    </div>
                )}

                {/* PREDICTIONS LIST */}
                {predictions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No predictions yet. Make some predictions first!
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {displayedPredictions.map((pred) => (
                            <div 
                                key={pred.id} 
                                className={`p-3 rounded-lg border-2 ${
                                    pred.isCorrect === true ? 'bg-green-50 border-green-300' :
                                    pred.isCorrect === false ? 'bg-red-50 border-red-300' :
                                    'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        {/* Match */}
                                        <div className="font-bold text-sm">
                                            {pred.home_team} vs {pred.away_team}
                                        </div>
                                        
                                        {/* AI Prediction */}
                                        <div className="text-xs text-gray-600 mt-1">
                                            <span className="font-semibold">🤖 AI:</span>{' '}
                                            <span className={`px-2 py-0.5 rounded ${
                                                pred.predicted_outcome === 'HOME_WIN' ? 'bg-green-200' :
                                                pred.predicted_outcome === 'AWAY_WIN' ? 'bg-red-200' : 'bg-gray-200'
                                            }`}>
                                                {pred.predicted_outcome === 'HOME_WIN' ? '1' :
                                                 pred.predicted_outcome === 'AWAY_WIN' ? '2' : 'X'}
                                            </span>
                                            <span className="ml-2 opacity-60">
                                                ({(pred.prob_home * 100).toFixed(0)}% / {(pred.prob_draw * 100).toFixed(0)}% / {(pred.prob_away * 100).toFixed(0)}%)
                                            </span>
                                        </div>

                                        {/* User Prediction */}
                                        {pred.user_prediction && (
                                            <div className="text-xs text-purple-700 mt-1">
                                                <span className="font-semibold">👤 You:</span>{' '}
                                                <span className={`px-2 py-0.5 rounded font-bold ${
                                                    pred.user_prediction === 'HOME_WIN' ? 'bg-green-300' :
                                                    pred.user_prediction === 'AWAY_WIN' ? 'bg-red-300' : 'bg-gray-300'
                                                }`}>
                                                    {pred.user_prediction === 'HOME_WIN' ? '1' :
                                                     pred.user_prediction === 'AWAY_WIN' ? '2' : 'X'}
                                                </span>
                                                {pred.stake && (
                                                    <span className="ml-2 text-purple-500">
                                                        Stake: {'⭐'.repeat(Math.min(pred.stake, 5))}{pred.stake > 5 ? `+${pred.stake - 5}` : ''}
                                                    </span>
                                                )}
                                                {pred.userIsCorrect !== undefined && (
                                                    <span className="ml-2">
                                                        {pred.userIsCorrect ? '✅' : '❌'}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actual Result */}
                                        {pred.actualResult && (
                                            <div className="text-xs mt-1">
                                                <span className="font-semibold">📊 Result:</span>{' '}
                                                <span className="font-bold">
                                                    {pred.actualResult.home_goals} - {pred.actualResult.away_goals}
                                                </span>
                                                <span className={`ml-2 px-2 py-0.5 rounded ${
                                                    pred.actualResult.actual_outcome === 'HOME_WIN' ? 'bg-green-200' :
                                                    pred.actualResult.actual_outcome === 'AWAY_WIN' ? 'bg-red-200' : 'bg-gray-200'
                                                }`}>
                                                    {pred.actualResult.actual_outcome === 'HOME_WIN' ? '1' :
                                                     pred.actualResult.actual_outcome === 'AWAY_WIN' ? '2' : 'X'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Result Badge */}
                                    <div className="ml-3 text-2xl">
                                        {pred.isCorrect === true && '✅'}
                                        {pred.isCorrect === false && '❌'}
                                        {pred.actualResult === undefined && '⏳'}
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="text-xs text-gray-400 mt-2">
                                    {new Date(pred.created_at).toLocaleDateString('it-IT', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Show More Button */}
                {predictions.length > 10 && (
                    <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? 'Show Less' : `Show All (${predictions.length})`}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
})
