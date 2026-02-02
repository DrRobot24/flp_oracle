/**
 * WaveChart - Fourier Wave Analysis Visualization
 * Displays team momentum and form patterns
 */

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ResponsiveContainer, LineChart, Line } from 'recharts'
import { WaveAnalysis } from '@/math/fourier'

interface WaveChartProps {
    team: string
    wave: WaveAnalysis
    color: string
}

export function WaveChart({ team, wave, color }: WaveChartProps) {
    const chartData = wave.signal.map((v, i) => ({
        i,
        v,
        t: wave.reconstructed[i]
    }))

    return (
        <Card className="h-[250px] glass-panel border-0 flex flex-col">
            <CardHeader className="py-3 px-4 border-b border-white/5 flex justify-between items-center">
                <span className="font-bold text-white text-sm">{team}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${wave.momentum > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {wave.momentum > 0 ? 'RISING' : 'FALLING'}
                </span>
            </CardHeader>
            <CardContent className="flex-1 min-h-[150px] p-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <LineChart data={chartData}>
                        <Line 
                            type="monotone" 
                            dataKey="t" 
                            stroke={color} 
                            strokeWidth={2} 
                            dot={false} 
                        />
                        <Line 
                            type="stepAfter" 
                            dataKey="v" 
                            stroke="#94a3b8" 
                            strokeWidth={1} 
                            strokeDasharray="3 3" 
                            dot={false} 
                            opacity={0.5} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
