import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Activity } from 'lucide-react'

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
            <Card className="mt-4 glass-panel border-0">
                <CardContent className="py-8 text-center text-slate-400">
                    <div className="animate-pulse flex items-center justify-center gap-2">
                        <Activity className="h-4 w-4" /> Loading Predictions...
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="mt-4 glass-panel border-0 overflow-hidden">
            <CardHeader className="py-4 border-b border-white/5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                    <span className="font-bold text-white uppercase text-xs tracking-widest">La Tua Previsione</span>
                </div>
                {existingPrediction && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                        SALVATA
                    </span>
                )}
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {/* Match Header */}
                <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-tight">
                    {homeTeam} vs {awayTeam}
                </div>

                {/* 1 X 2 Buttons */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setChoice('1')}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center group relative overflow-hidden ${choice === '1'
                                ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }`}
                    >
                        <div className={`text-2xl font-black ${choice === '1' ? 'text-emerald-400' : 'text-slate-200 opacity-60'}`}>1</div>
                        <div className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${choice === '1' ? 'text-emerald-400' : 'text-slate-400'}`}>Home</div>
                        {aiPrediction && (
                            <div className="text-[10px] font-mono mt-2 text-slate-500">
                                AI: <span className={choice === '1' ? 'text-emerald-300' : 'text-slate-400'}>{(aiPrediction.homeWin * 100).toFixed(0)}%</span>
                            </div>
                        )}
                        {choice === '1' && <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500/20 rounded-bl-full animate-pulse" />}
                    </button>

                    <button
                        onClick={() => setChoice('X')}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center group relative overflow-hidden ${choice === 'X'
                                ? 'bg-slate-500/20 border-slate-400/50 shadow-[0_0_20px_rgba(148,163,184,0.2)]'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }`}
                    >
                        <div className={`text-2xl font-black ${choice === 'X' ? 'text-slate-200' : 'text-slate-200 opacity-60'}`}>X</div>
                        <div className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${choice === 'X' ? 'text-slate-200' : 'text-slate-400'}`}>Draw</div>
                        {aiPrediction && (
                            <div className="text-[10px] font-mono mt-2 text-slate-500">
                                AI: <span className={choice === 'X' ? 'text-slate-300' : 'text-slate-400'}>{(aiPrediction.draw * 100).toFixed(0)}%</span>
                            </div>
                        )}
                        {choice === 'X' && <div className="absolute top-0 right-0 w-8 h-8 bg-slate-500/20 rounded-bl-full animate-pulse" />}
                    </button>

                    <button
                        onClick={() => setChoice('2')}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center group relative overflow-hidden ${choice === '2'
                                ? 'bg-rose-500/20 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }`}
                    >
                        <div className={`text-2xl font-black ${choice === '2' ? 'text-rose-400' : 'text-slate-200 opacity-60'}`}>2</div>
                        <div className={`text-[10px] uppercase font-bold tracking-widest mt-1 ${choice === '2' ? 'text-rose-400' : 'text-slate-400'}`}>Away</div>
                        {aiPrediction && (
                            <div className="text-[10px] font-mono mt-2 text-slate-500">
                                AI: <span className={choice === '2' ? 'text-rose-300' : 'text-slate-400'}>{(aiPrediction.awayWin * 100).toFixed(0)}%</span>
                            </div>
                        )}
                        {choice === '2' && <div className="absolute top-0 right-0 w-8 h-8 bg-rose-500/20 rounded-bl-full animate-pulse" />}
                    </button>
                </div>

                {/* Stake Slider */}
                <div className="space-y-3 bg-black/20 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">💰 Stake / Fiducia</label>
                        <span className={`text-lg font-black font-mono ${stake <= 3 ? 'text-primary' :
                                stake <= 6 ? 'text-yellow-400' :
                                    'text-rose-500'
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
                    <div className="flex justify-between text-[10px] uppercase tracking-tighter text-slate-500 font-bold">
                        <span>🤔 Cauto</span>
                        <span>🔥 All-In</span>
                    </div>
                </div>

                {/* Stake Indicator */}
                <div className="flex justify-center gap-1 opacity-80">
                    {[...Array(10)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-2.5 h-6 rounded-sm transition-all duration-500 ${i < stake
                                    ? i < 3 ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.3)]' : i < 6 ? 'bg-yellow-400' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                    : 'bg-white/5'
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
                    <div className="text-center p-4 bg-black/40 rounded-xl border border-white/5 animate-in slide-in-from-bottom-2">
                        <span className="text-xs text-slate-400 uppercase tracking-tight">
                            Prevedi <strong className={`font-black ${choice === '1' ? 'text-emerald-400' :
                                    choice === '2' ? 'text-rose-400' : 'text-slate-200'
                                }`}>
                                {choice === '1' ? `${homeTeam} vince` :
                                    choice === '2' ? `${awayTeam} vince` : 'Pareggio'}
                            </strong>
                            {' '}con stake <strong className="text-white font-mono">{stake}/10</strong>
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
