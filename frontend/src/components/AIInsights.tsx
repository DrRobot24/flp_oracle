import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { MatchProbabilities } from '@/math/poisson'
import { WaveAnalysis } from '@/math/fourier'

interface AIInsightsProps {
    homeTeam: string
    awayTeam: string
    results: MatchProbabilities | null
    homeWave: WaveAnalysis | null
    awayWave: WaveAnalysis | null
    homeXG: number
    awayXG: number
}

export function AIInsights({ homeTeam, awayTeam, results, homeWave, awayWave, homeXG, awayXG }: AIInsightsProps) {
    if (!results || !homeTeam || !awayTeam) {
        return (
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
                <CardContent className="py-8 text-center">
                    <div className="text-4xl mb-2">🤖</div>
                    <div className="text-gray-500">Seleziona due squadre per vedere i consigli AI</div>
                </CardContent>
            </Card>
        )
    }

    // Generate insights based on all available data
    const insights: { icon: string; text: string; confidence: 'high' | 'medium' | 'low' }[] = []

    // 1. Clear favorite based on probabilities
    const maxProb = Math.max(results.homeWin, results.draw, results.awayWin)
    if (results.homeWin > 0.55) {
        insights.push({
            icon: '🏠',
            text: `${homeTeam} è favorito (${(results.homeWin * 100).toFixed(0)}%)`,
            confidence: results.homeWin > 0.65 ? 'high' : 'medium'
        })
    } else if (results.awayWin > 0.55) {
        insights.push({
            icon: '✈️',
            text: `${awayTeam} è favorito (${(results.awayWin * 100).toFixed(0)}%)`,
            confidence: results.awayWin > 0.65 ? 'high' : 'medium'
        })
    } else if (results.draw > 0.30) {
        insights.push({
            icon: '🤝',
            text: `Partita equilibrata, pareggio probabile (${(results.draw * 100).toFixed(0)}%)`,
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

    // 3. Goals insights
    const totalXG = homeXG + awayXG
    if (totalXG > 3.0) {
        insights.push({
            icon: '⚽',
            text: `Partita ad alto punteggio prevista (${totalXG.toFixed(1)} xG totali)`,
            confidence: totalXG > 3.5 ? 'high' : 'medium'
        })
    } else if (totalXG < 2.0) {
        insights.push({
            icon: '🔒',
            text: `Pochi gol previsti (${totalXG.toFixed(1)} xG) - Under 2.5?`,
            confidence: totalXG < 1.5 ? 'high' : 'medium'
        })
    }

    // 4. Both teams to score
    if (homeXG > 1.0 && awayXG > 1.0) {
        insights.push({
            icon: '🎯',
            text: 'Entrambe potrebbero segnare (Goal/Goal)',
            confidence: homeXG > 1.3 && awayXG > 1.3 ? 'high' : 'medium'
        })
    } else if (homeXG < 0.8 || awayXG < 0.8) {
        const weakTeam = homeXG < awayXG ? homeTeam : awayTeam
        insights.push({
            icon: '🚫',
            text: `${weakTeam} potrebbe non segnare (No Goal)`,
            confidence: 'medium'
        })
    }

    // 5. Most likely score
    if (results.scoreMatrix) {
        let maxScore = { home: 0, away: 0, prob: 0 }
        for (let h = 0; h <= 5; h++) {
            for (let a = 0; a <= 5; a++) {
                if (results.scoreMatrix[h][a] > maxScore.prob) {
                    maxScore = { home: h, away: a, prob: results.scoreMatrix[h][a] }
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
        const winner = results.homeWin > results.awayWin ? homeTeam : awayTeam
        const sign = results.homeWin > results.awayWin ? '1' : '2'
        recommendation = { text: `${winner} vince (${sign})`, stake: 8 }
    } else if (maxProb > 0.50) {
        const winner = results.homeWin > results.awayWin ? homeTeam : awayTeam
        const sign = results.homeWin > results.awayWin ? '1' : '2'
        recommendation = { text: `${winner} vince (${sign})`, stake: 5 }
    } else if (results.draw > 0.28) {
        recommendation = { text: 'Pareggio (X)', stake: 4 }
    } else {
        recommendation = { text: 'Partita incerta - basso stake', stake: 2 }
    }

    const confidenceColors = {
        high: 'bg-green-100 border-green-300 text-green-800',
        medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
        low: 'bg-gray-100 border-gray-300 text-gray-600'
    }

    return (
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        <span className="font-bold text-indigo-900">AI INSIGHTS</span>
                    </div>
                    <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                        Poisson + Fourier + Monte Carlo
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
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                insight.confidence === 'high' ? 'bg-green-500 text-white' :
                                insight.confidence === 'medium' ? 'bg-yellow-500 text-white' :
                                'bg-gray-400 text-white'
                            }`}>
                                {insight.confidence === 'high' ? '🔥' : insight.confidence === 'medium' ? '👍' : '🤔'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* AI Recommendation */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg p-3 text-white">
                    <div className="text-xs uppercase tracking-wide opacity-80 mb-1">💡 Suggerimento AI</div>
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">{recommendation.text}</span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs opacity-80">Stake:</span>
                            <span className="font-black text-xl">{recommendation.stake}/10</span>
                        </div>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="text-[10px] text-center text-gray-400 pt-1">
                    ⚠️ Le previsioni AI sono indicative. Gioca responsabilmente.
                </div>
            </CardContent>
        </Card>
    )
}