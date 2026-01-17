import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { OraclePrediction } from '@/math/oracle'
import { WaveAnalysis } from '@/math/fourier'

interface AIInsightsProps {
    homeTeam: string
    awayTeam: string
    results: OraclePrediction | null
    homeWave: WaveAnalysis | null
    awayWave: WaveAnalysis | null
}

export function AIInsights({ homeTeam, awayTeam, results, homeWave, awayWave }: AIInsightsProps) {
    if (!results || !homeTeam || !awayTeam) {
        return (
            <Card className="glass-panel border-0">
                <CardContent className="py-8 text-center">
                    <div className="text-4xl mb-4 animate-bounce">🤖</div>
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Seleziona due squadre per analizzare i match
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Safely extract nested predictions
    const p1x2 = results.predictions['1X2']
    const pGG = results.predictions['GG']
    const pOver = results.predictions['over_2.5']

    // Generate insights based on all available data
    const insights: { icon: string; text: string; confidence: 'high' | 'medium' | 'low' }[] = []

    // 1. Clear favorite based on probabilities
    const maxProb = Math.max(p1x2.home_win, p1x2.draw, p1x2.away_win)
    if (p1x2.home_win > 0.55) {
        insights.push({
            icon: '🏠',
            text: `${homeTeam} è favorito (${(p1x2.home_win * 100).toFixed(0)}%)`,
            confidence: p1x2.home_win > 0.65 ? 'high' : 'medium'
        })
    } else if (p1x2.away_win > 0.55) {
        insights.push({
            icon: '✈️',
            text: `${awayTeam} è favorito (${(p1x2.away_win * 100).toFixed(0)}%)`,
            confidence: p1x2.away_win > 0.65 ? 'high' : 'medium'
        })
    } else if (p1x2.draw > 0.30) {
        insights.push({
            icon: '🤝',
            text: `Partita equilibrata, pareggio probabile (${(p1x2.draw * 100).toFixed(0)}%)`,
            confidence: 'medium'
        })
    }

    // 2. Form momentum insights
    if (homeWave && awayWave) {
        const homeMomentum = homeWave.momentum
        const awayMomentum = awayWave.momentum

        if (homeMomentum > 0.3 && awayMomentum < -0.1) {
            insights.push({
                icon: '📈',
                text: `${homeTeam} in crescita vs ${awayTeam} in calo - Vantaggio forma!`,
                confidence: 'high'
            })
        } else if (awayMomentum > 0.3 && homeMomentum < -0.1) {
            insights.push({
                icon: '📈',
                text: `${awayTeam} in crescita vs ${homeTeam} in calo - Attenzione!`,
                confidence: 'high'
            })
        } else if (homeMomentum < -0.2 && awayMomentum < -0.2) {
            insights.push({
                icon: '📉',
                text: 'Entrambe le squadre in difficoltà - Partita imprevedibile',
                confidence: 'low'
            })
        }
    }

    // 3. Goals insights (using new Over 2.5 prediction)
    if (pOver.yes > 0.60) {
        insights.push({
            icon: '⚽',
            text: `Gara aperta prevista (${(pOver.yes * 100).toFixed(0)}% Over 2.5)`,
            confidence: pOver.yes > 0.70 ? 'high' : 'medium'
        })
    } else if (pOver.no > 0.60) {
        insights.push({
            icon: '🔒',
            text: `Pochi gol previsti (${(pOver.no * 100).toFixed(0)}% Under 2.5)`,
            confidence: pOver.no > 0.70 ? 'high' : 'medium'
        })
    }

    // 4. Both teams to score (using new GG prediction)
    if (pGG.yes > 0.60) {
        insights.push({
            icon: '🎯',
            text: 'Entrambe potrebbero segnare (Goal/Goal)',
            confidence: pGG.yes > 0.70 ? 'high' : 'medium'
        })
    } else if (pGG.no > 0.60) {
        insights.push({
            icon: '🚫',
            text: 'Possibile rete inviolata (No Goal)',
            confidence: pGG.no > 0.70 ? 'high' : 'medium'
        })
    }

    // 5. Most likely score (Using rawProbabilities if available)
    if (results.rawProbabilities?.scoreMatrix) {
        const matrix = results.rawProbabilities.scoreMatrix
        let maxScore = { home: 0, away: 0, prob: 0 }
        for (let h = 0; h <= 5; h++) {
            for (let a = 0; a <= 5; a++) {
                if (matrix[h][a] > maxScore.prob) {
                    maxScore = { home: h, away: a, prob: matrix[h][a] }
                }
            }
        }
        insights.push({
            icon: '📊',
            text: `Risultato più probabile: ${maxScore.home}-${maxScore.away} (${(maxScore.prob * 100).toFixed(0)}%)`,
            confidence: maxScore.prob > 0.12 ? 'medium' : 'low'
        })
    }

    // 6. Recommendation
    let recommendation = { text: '', stake: 0 }
    if (maxProb > 0.65) {
        const winner = p1x2.home_win > p1x2.away_win ? homeTeam : awayTeam
        const sign = p1x2.home_win > p1x2.away_win ? '1' : '2'
        recommendation = { text: `${winner} vince (${sign})`, stake: 8 }
    } else if (maxProb > 0.50) {
        const winner = p1x2.home_win > p1x2.away_win ? homeTeam : awayTeam
        const sign = p1x2.home_win > p1x2.away_win ? '1' : '2'
        recommendation = { text: `${winner} vince (${sign})`, stake: 5 }
    } else if (p1x2.draw > 0.28) {
        recommendation = { text: 'Pareggio (X)', stake: 4 }
    } else {
        recommendation = { text: 'Partita incerta - basso stake', stake: 2 }
    }

    const confidenceColors = {
        high: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        medium: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
        low: 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    }

    return (
        <Card className="glass-panel border-0 overflow-hidden bg-black/40">
            <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                        <span className="font-bold text-white uppercase text-xs tracking-widest">AI INSIGHTS</span>
                    </div>
                    <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-mono">
                        Neural Engine v1.0
                    </span>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Insights List */}
                <div className="space-y-2">
                    {insights.map((insight, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 p-2 rounded-lg border ${confidenceColors[insight.confidence]}`}
                        >
                            <span className="text-lg">{insight.icon}</span>
                            <span className="flex-1 text-sm">{insight.text}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${insight.confidence === 'high' ? 'bg-green-500 text-white' :
                                insight.confidence === 'medium' ? 'bg-yellow-500 text-white' :
                                    'bg-gray-400 text-white'
                                }`}>
                                {insight.confidence === 'high' ? '🔥' : insight.confidence === 'medium' ? '👍' : '🤔'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* AI Recommendation */}
                <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-4 text-white shadow-lg shadow-primary/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700" />
                    <div className="text-[10px] uppercase tracking-widest opacity-80 mb-2 font-black">💡 Suggerimento AI</div>
                    <div className="flex items-center justify-between relative z-10">
                        <span className="font-black text-xl tracking-tight">{recommendation.text}</span>
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10">
                            <span className="text-[10px] font-bold opacity-70 uppercase">Stake</span>
                            <span className="font-black text-2xl font-mono leading-none">{recommendation.stake}/10</span>
                        </div>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="text-[10px] text-center text-slate-500 pt-2 border-t border-white/5 mt-4 flex items-center justify-center gap-1 lowercase">
                    <span className="text-amber-500/70">⚠️</span> le previsioni ai sono indicative. gioca responsabilmente.
                </div>
            </CardContent>
        </Card>
    )
}