import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface UserPredictionProps {
    homeTeam: string
    awayTeam: string
    aiPrediction?: {
        homeWin: number
        draw: number
        awayWin: number
    }
    onPredictionSaved?: () => void
}

type PredictionChoice = '1' | 'X' | '2' | null

export function UserPrediction({ homeTeam, awayTeam, aiPrediction, onPredictionSaved }: UserPredictionProps) {
    const { user } = useAuth()
    const [choice, setChoice] = useState<PredictionChoice>(null)
    const [stake, setStake] = useState(5)
    const [saving, setSaving] = useState(false)
    const [existingPrediction, setExistingPrediction] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    // Check if user already made a prediction for this match
    useEffect(() => {
        async function checkExisting() {
            if (!user || !homeTeam || !awayTeam) {
                setLoading(false)
                return
            }

            setLoading(true)
            const { data, error } = await supabase
                .from('predictions')
                .select('*')
                .eq('user_id', user.id)
                .eq('home_team', homeTeam)
                .eq('away_team', awayTeam)
                .not('user_prediction', 'is', null)
                .maybeSingle()

            if (data && !error) {
                setExistingPrediction(data)
                setChoice(data.user_prediction as PredictionChoice)
                setStake(data.stake || 5)
            } else {
                setExistingPrediction(null)
                setChoice(null)
                setStake(5)
            }
            setLoading(false)
        }

        checkExisting()
    }, [user, homeTeam, awayTeam])

    const handleSavePrediction = async () => {
        if (!choice || !user || !homeTeam || !awayTeam) return

        setSaving(true)

        const predictionData = {
            home_team: homeTeam,
            away_team: awayTeam,
            user_prediction: choice,
            stake: stake,
            user_id: user.id,
            match_date: new Date().toISOString().split('T')[0],
            // AI probabilities (if available)
            home_xg: 0,
            away_xg: 0,
            prob_home: aiPrediction?.homeWin || 0,
            prob_draw: aiPrediction?.draw || 0,
            prob_away: aiPrediction?.awayWin || 0,
            predicted_outcome: choice === '1' ? 'HOME_WIN' : choice === '2' ? 'AWAY_WIN' : 'DRAW'
        }

        let result
        if (existingPrediction) {
            // Update existing
            result = await supabase
                .from('predictions')
                .update(predictionData)
                .eq('id', existingPrediction.id)
                .select()
        } else {
            // Insert new
            result = await supabase
                .from('predictions')
                .insert(predictionData)
                .select()
        }

        if (result.error) {
            console.error('Save error:', result.error)
            alert(`Errore: ${result.error.message}`)
        } else {
            setExistingPrediction(result.data?.[0])
            onPredictionSaved?.()
        }

        setSaving(false)
    }

    if (!homeTeam || !awayTeam) {
        return null
    }

    if (loading) {
        return (
            <Card className="mt-4 border-2 border-yellow-400 bg-yellow-50">
                <CardContent className="py-4 text-center">
                    Loading...
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="mt-4 border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader className="py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    <span className="font-bold">La Tua Previsione</span>
                </div>
                {existingPrediction && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                        ✓ Salvata
                    </span>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Match Header */}
                <div className="text-center text-sm font-bold text-gray-600">
                    {homeTeam} vs {awayTeam}
                </div>

                {/* 1 X 2 Buttons */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        onClick={() => setChoice('1')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                            choice === '1' 
                                ? 'bg-green-500 text-white border-green-600 scale-105 shadow-lg' 
                                : 'bg-white border-gray-300 hover:border-green-400 hover:bg-green-50'
                        }`}
                    >
                        <div className="text-2xl font-black">1</div>
                        <div className="text-xs mt-1">Home</div>
                        {aiPrediction && (
                            <div className="text-xs opacity-70 mt-1">
                                AI: {(aiPrediction.homeWin * 100).toFixed(0)}%
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => setChoice('X')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                            choice === 'X' 
                                ? 'bg-gray-500 text-white border-gray-600 scale-105 shadow-lg' 
                                : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                    >
                        <div className="text-2xl font-black">X</div>
                        <div className="text-xs mt-1">Draw</div>
                        {aiPrediction && (
                            <div className="text-xs opacity-70 mt-1">
                                AI: {(aiPrediction.draw * 100).toFixed(0)}%
                            </div>
                        )}
                    </button>

                    <button
                        onClick={() => setChoice('2')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                            choice === '2' 
                                ? 'bg-red-500 text-white border-red-600 scale-105 shadow-lg' 
                                : 'bg-white border-gray-300 hover:border-red-400 hover:bg-red-50'
                        }`}
                    >
                        <div className="text-2xl font-black">2</div>
                        <div className="text-xs mt-1">Away</div>
                        {aiPrediction && (
                            <div className="text-xs opacity-70 mt-1">
                                AI: {(aiPrediction.awayWin * 100).toFixed(0)}%
                            </div>
                        )}
                    </button>
                </div>

                {/* Stake Slider */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-bold">💰 Stake (Fiducia)</label>
                        <span className={`text-lg font-black ${
                            stake <= 3 ? 'text-blue-500' : 
                            stake <= 6 ? 'text-yellow-500' : 
                            'text-red-500'
                        }`}>
                            {stake}/10
                        </span>
                    </div>
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={stake}
                        onChange={(e) => setStake(Number(e.target.value))}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer"
                        style={{
                            background: `linear-gradient(to right, 
                                #3b82f6 0%, 
                                #3b82f6 ${(stake - 1) * 11.1}%, 
                                #eab308 ${(stake - 1) * 11.1}%, 
                                #eab308 ${stake * 11.1}%, 
                                #e5e7eb ${stake * 11.1}%, 
                                #e5e7eb 100%)`
                        }}
                    />
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>🤔 Poco sicuro</span>
                        <span>🔥 Sicurissimo</span>
                    </div>
                </div>

                {/* Stake Indicator */}
                <div className="flex justify-center gap-1">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-6 rounded-sm transition-all ${
                                i < stake 
                                    ? i < 3 ? 'bg-blue-500' : i < 6 ? 'bg-yellow-500' : 'bg-red-500'
                                    : 'bg-gray-200'
                            }`}
                        />
                    ))}
                </div>

                {/* Save Button */}
                <Button
                    onClick={handleSavePrediction}
                    disabled={!choice || saving}
                    variant="primary"
                    className="w-full h-12 text-lg"
                >
                    {saving ? '⏳ Salvando...' : existingPrediction ? '🔄 Aggiorna Previsione' : '💾 Salva Previsione'}
                </Button>

                {/* Summary */}
                {choice && (
                    <div className="text-center p-3 bg-white rounded-lg border">
                        <span className="text-sm">
                            Prevedi <strong className={
                                choice === '1' ? 'text-green-600' : 
                                choice === '2' ? 'text-red-600' : 'text-gray-600'
                            }>
                                {choice === '1' ? `${homeTeam} vince` : 
                                 choice === '2' ? `${awayTeam} vince` : 'Pareggio'}
                            </strong>
                            {' '}con stake <strong>{stake}/10</strong>
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
