/**
 * Dashboard - Main prediction interface
 * Refactored to use custom hook for state management
 */

import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhasePoint } from '@/math/geometric'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { DataUploader } from '@/components/DataUploader'
import { UserPrediction } from '@/components/UserPrediction'
import { AIInsights } from '@/components/AIInsights'
import { HeadToHead } from '@/components/HeadToHead'
import { DataSourceInfo } from '@/components/DataSourceInfo'
import { WaveChart } from '@/components/charts/WaveChart'
import { LEAGUES } from '@/lib/constants'
import type { LeagueCode } from '@/lib/constants'
import { MainLayout } from '@/components/layout/MainLayout'
import { AdSpace } from '@/components/ads/AdSpace'
import { Activity, Zap, BarChart3 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useDashboardState } from '@/hooks/useDashboardState'

export function Dashboard() {
    const { isAdmin } = useAuth()
    const {
        // State
        teams,
        selectedLeagues,
        leaguesLoading,
        params,
        results,
        homeTrajectory,
        awayTrajectory,
        simulationCloud,
        homeWaveAnalysis,
        awayWaveAnalysis,
        headToHead,
        h2hLoading,
        homeNews,
        awayNews,
        loading,
        dataLoading,
        lastCalculatedParams,
        // Actions
        setParams,
        toggleLeague,
        handleCalculate,
        handleReset
    } = useDashboardState()

    return (
        <MainLayout>
            {/* Admin / Data Upload Only */}
            {isAdmin && (
                <div className="mb-6">
                    <DataUploader />
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* INPUT COLUMN */}
                <div className="xl:col-span-4 space-y-6">
                    <MatchInputPanel
                        teams={teams}
                        selectedLeagues={selectedLeagues}
                        leaguesLoading={leaguesLoading}
                        params={params}
                        loading={loading}
                        dataLoading={dataLoading}
                        onParamsChange={setParams}
                        onLeagueToggle={toggleLeague}
                        onCalculate={handleCalculate}
                        onReset={handleReset}
                    />

                    {/* HEAD TO HEAD & USER PREDICTION */}
                    {params.homeTeam && params.awayTeam && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                            <HeadToHead homeTeam={params.homeTeam} awayTeam={params.awayTeam} data={headToHead} loading={h2hLoading} />
                            <UserPrediction 
                                homeTeam={params.homeTeam} 
                                awayTeam={params.awayTeam} 
                                aiPrediction={results ? { 
                                    homeWin: results.predictions['1X2'].home_win, 
                                    draw: results.predictions['1X2'].draw, 
                                    awayWin: results.predictions['1X2'].away_win 
                                } : undefined} 
                            />
                        </div>
                    )}
                </div>

                {/* VISUALIZATION COLUMN */}
                <div className="xl:col-span-8 space-y-6">
                    {/* RESULTS PANEL */}
                    {results && (
                        <OracleResultsPanel
                            results={results}
                            params={params}
                            lastCalculatedParams={lastCalculatedParams}
                        />
                    )}

                    {/* AI INSIGHTS */}
                    <AIInsights
                        homeTeam={params.homeTeam}
                        awayTeam={params.awayTeam}
                        results={results}
                        homeWave={homeWaveAnalysis}
                        awayWave={awayWaveAnalysis}
                        homeNews={homeNews}
                        awayNews={awayNews}
                    />

                    <div className="flex justify-center">
                        <AdSpace type="rectangle" className="w-full" />
                    </div>

                    {/* PHASE SPACE CHART */}
                    <PhaseSpaceChart
                        homeTeam={params.homeTeam}
                        awayTeam={params.awayTeam}
                        homeTrajectory={homeTrajectory}
                        awayTrajectory={awayTrajectory}
                        simulationCloud={simulationCloud}
                    />

                    {/* WAVE ANALYSIS */}
                    {(homeWaveAnalysis || awayWaveAnalysis) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-700">
                            {homeWaveAnalysis && <WaveChart team={params.homeTeam} wave={homeWaveAnalysis} color="#10b981" />}
                            {awayWaveAnalysis && <WaveChart team={params.awayTeam} wave={awayWaveAnalysis} color="#f43f5e" />}
                        </div>
                    )}
                </div>
            </div>

            {/* Data Source Info */}
            <div className="mt-8">
                <DataSourceInfo />
            </div>
        </MainLayout>
    )
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface MatchInputPanelProps {
    teams: string[]
    selectedLeagues: LeagueCode[]
    leaguesLoading: boolean
    params: { homeTeam: string; awayTeam: string; homeXG: number; awayXG: number }
    loading: boolean
    dataLoading: boolean
    onParamsChange: (params: Partial<{ homeTeam: string; awayTeam: string; homeXG: number; awayXG: number }>) => void
    onLeagueToggle: (league: LeagueCode) => void
    onCalculate: () => void
    onReset: () => void
}

function MatchInputPanel({
    teams, selectedLeagues, leaguesLoading, params, loading, dataLoading,
    onParamsChange, onLeagueToggle, onCalculate, onReset
}: MatchInputPanelProps) {
    return (
        <Card className="glass-panel border-0">
            <CardHeader className="border-b border-white/5 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Match Parameters
                </h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {/* LEAGUE SELECTOR */}
                <div>
                    <label className="block mb-2 font-bold uppercase text-[10px] tracking-widest text-slate-400">
                        Campionati (max 3)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(Object.entries(LEAGUES) as [LeagueCode, typeof LEAGUES[LeagueCode]][])
                            .filter(([code]) => ['SA', 'I2', 'PL', 'E1', 'BL', 'LL', 'N1', 'POL', 'CL'].includes(code))
                            .map(([code, league]) => (
                                <button
                                    key={code}
                                    onClick={() => onLeagueToggle(code)}
                                    disabled={!selectedLeagues.includes(code) && selectedLeagues.length >= 3}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                        selectedLeagues.includes(code)
                                            ? 'bg-primary/80 text-white shadow-neon'
                                            : selectedLeagues.length >= 3
                                                ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                                                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                                    }`}
                                >
                                    {league.country} {league.name}
                                </button>
                            ))}
                    </div>
                    {leaguesLoading && (
                        <p className="text-[10px] text-primary/60 mt-2 animate-pulse">Caricamento squadre...</p>
                    )}
                    {!leaguesLoading && teams.length > 0 && (
                        <p className="text-[10px] text-slate-500 mt-2">{teams.length} squadre disponibili</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block mb-2 font-bold uppercase text-[10px] tracking-widest text-slate-400">Home Team</label>
                        <select
                            className="w-full glass-input rounded-md px-3 py-2 text-sm"
                            value={params.homeTeam}
                            onChange={e => onParamsChange({ homeTeam: e.target.value })}
                            disabled={leaguesLoading}
                        >
                            <option value="" className="text-black">Select Team...</option>
                            {teams.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block mb-2 font-bold uppercase text-[10px] tracking-widest text-slate-400">Away Team</label>
                        <select
                            className="w-full glass-input rounded-md px-3 py-2 text-sm"
                            value={params.awayTeam}
                            onChange={e => onParamsChange({ awayTeam: e.target.value })}
                            disabled={leaguesLoading}
                        >
                            <option value="" className="text-black">Select Team...</option>
                            {teams.map(t => <option key={t} value={t} className="text-black">{t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Calc. Home xG"
                        type="number"
                        step="0.1"
                        className="glass-input"
                        value={params.homeXG}
                        onChange={e => onParamsChange({ homeXG: Number(e.target.value) })}
                    />
                    <Input
                        label="Calc. Away xG"
                        type="number"
                        step="0.1"
                        className="glass-input"
                        value={params.awayXG}
                        onChange={e => onParamsChange({ awayXG: Number(e.target.value) })}
                    />
                </div>

                <div className="flex gap-3">
                    <Button
                        className="flex-1 h-12 text-sm font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-neon border-0"
                        onClick={onCalculate}
                        disabled={loading || !params.homeTeam || !params.awayTeam}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Zap className="h-4 w-4 animate-pulse" /> Simulating...
                            </span>
                        ) : dataLoading ? (
                            "Analysing Data..."
                        ) : (
                            <span className="flex items-center gap-2">
                                <Zap className="h-4 w-4" /> Run Oracle
                            </span>
                        )}
                    </Button>

                    <Button
                        variant="outline"
                        className="h-12 px-4 text-[10px] border-white/10 hover:bg-white/5"
                        onClick={onReset}
                        title="Nuova Analisi"
                    >
                        Reset
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

interface OracleResultsPanelProps {
    results: any
    params: { homeTeam: string; awayTeam: string; homeXG: number; awayXG: number }
    lastCalculatedParams: string
}

function OracleResultsPanel({ results, params, lastCalculatedParams }: OracleResultsPanelProps) {
    const prediction1X2 = results.predictions['1X2']
    const currentParamKey = `${params.homeTeam}-${params.awayTeam}-${params.homeXG}-${params.awayXG}`

    const maxProb = Math.max(prediction1X2.home_win, prediction1X2.draw, prediction1X2.away_win)
    let predictionOutcome = '', color = ''
    if (prediction1X2.home_win === maxProb) { 
        predictionOutcome = params.homeTeam
        color = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
    } else if (prediction1X2.away_win === maxProb) { 
        predictionOutcome = params.awayTeam
        color = 'text-rose-400 border-rose-500/30 bg-rose-500/10' 
    } else { 
        predictionOutcome = 'DRAW'
        color = 'text-slate-200 border-slate-500/30 bg-slate-500/10' 
    }

    return (
        <Card className="glass-panel border-0 animate-in fade-in slide-in-from-top-4 duration-500 bg-black/40">
            <CardHeader className="border-b border-white/5 flex justify-between items-center pb-3">
                <span className="font-bold text-white flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-secondary" />
                    Oracle Verdict
                </span>
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded border border-secondary/30 font-mono">
                    Confidence: {(prediction1X2.confidence * 100).toFixed(0)}%
                </span>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                {/* Cache Indicator */}
                {lastCalculatedParams === currentParamKey && (
                    <div className="text-[10px] text-primary/60 text-center -mt-4 font-mono uppercase tracking-tighter">
                        Serving Optimized Result from Cache
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* GAUGE */}
                    <div className="relative">
                        <div className="flex justify-between mb-2">
                            <span className="font-bold text-white text-sm">{params.homeTeam}</span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Draw Zone</span>
                            <span className="font-bold text-white text-sm text-right">{params.awayTeam}</span>
                        </div>

                        <div className="relative h-6 rounded-full overflow-hidden bg-slate-800/50 ring-1 ring-white/10">
                            <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/80" style={{ width: `${prediction1X2.home_win * 100}%` }} />
                            <div className="absolute top-0 h-full bg-white/10" style={{ left: `${prediction1X2.home_win * 100}%`, width: `${prediction1X2.draw * 100}%` }} />
                            <div className="absolute right-0 top-0 h-full bg-gradient-l from-rose-500/80 to-rose-400/80" style={{ width: `${prediction1X2.away_win * 100}%` }} />

                            {/* Needle */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] z-10"
                                style={{
                                    left: `calc(${(prediction1X2.home_win + prediction1X2.draw / 2) * 100}%)`,
                                    transform: 'translateX(-50%)'
                                }}
                            />
                        </div>

                        <div
                            className="absolute top-1/2 -mt-2 w-4 h-4 bg-white rounded-full shadow-lg z-20 transition-all duration-1000 ease-out flex items-center justify-center"
                            style={{
                                left: `${(prediction1X2.home_win * 100) + (prediction1X2.draw * 50)}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        </div>
                    </div>

                    {/* PREDICTION BADGE & STATS */}
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <div className={`px-6 py-3 rounded-xl border ${color} backdrop-blur-md w-full text-center`}>
                                <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Predicted Verdict</div>
                                <div className="text-xl font-black tracking-tight">{predictionOutcome}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 text-center divide-x divide-white/10 bg-white/5 py-3 rounded-xl">
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase">Home</div>
                                <div className="text-lg font-black text-emerald-400">{(prediction1X2.home_win * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase">Draw</div>
                                <div className="text-lg font-black text-slate-400">{(prediction1X2.draw * 100).toFixed(1)}%</div>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-400 uppercase">Away</div>
                                <div className="text-lg font-black text-rose-400">{(prediction1X2.away_win * 100).toFixed(1)}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

interface PhaseSpaceChartProps {
    homeTeam: string
    awayTeam: string
    homeTrajectory: PhasePoint[]
    awayTrajectory: PhasePoint[]
    simulationCloud: PhasePoint[]
}

function PhaseSpaceChart({ homeTeam, awayTeam, homeTrajectory, awayTrajectory, simulationCloud }: PhaseSpaceChartProps) {
    return (
        <Card className="h-[500px] glass-panel border-0 flex flex-col">
            <CardHeader className="border-b border-white/5 pb-2">
                <h3 className="text-sm font-bold text-white">Monte Carlo Phase Space</h3>
            </CardHeader>
            <CardContent className="flex-1 w-full min-h-[400px] p-4">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis type="number" dataKey="x" name="Attack Form" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Attack Form (Avg Goals)', position: 'bottom', offset: 0, fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis type="number" dataKey="y" name="Defense Form" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Defense Form (Avg Conceded)', angle: -90, position: 'left', offset: 10, fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                            cursor={{ strokeDasharray: '3 3' }}
                        />
                        <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} />
                        <ReferenceLine x={1.5} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} />
                        <Legend
                            verticalAlign="top"
                            height={36}
                            wrapperStyle={{ color: '#94a3b8', fontSize: '11px', paddingBottom: '8px' }}
                        />

                        {/* Simulation Cloud */}
                        {simulationCloud.length > 0 && (
                            <Scatter
                                name="Monte Carlo Simulations"
                                data={simulationCloud}
                                fill="#8b5cf6"
                                opacity={0.35}
                                shape="circle"
                            />
                        )}

                        {/* Home Team Trajectory */}
                        {homeTrajectory.length > 0 && (
                            <Scatter
                                name={homeTeam || 'Home'}
                                data={homeTrajectory.filter((p: PhasePoint) => p.className !== 'prediction')}
                                fill="#10b981"
                                line={{ stroke: '#10b981', strokeWidth: 2 }}
                                shape="circle"
                            />
                        )}

                        {/* Away Team Trajectory */}
                        {awayTrajectory.length > 0 && (
                            <Scatter
                                name={awayTeam || 'Away'}
                                data={awayTrajectory.filter((p: PhasePoint) => p.className !== 'prediction')}
                                fill="#ef4444"
                                line={{ stroke: '#ef4444', strokeWidth: 2 }}
                                shape="diamond"
                            />
                        )}

                        {/* Prediction Star */}
                        {homeTrajectory.some((p: PhasePoint) => p.className === 'prediction') && (
                            <Scatter
                                name="Oracle Prediction"
                                data={homeTrajectory.filter((p: PhasePoint) => p.className === 'prediction')}
                                fill="#fbbf24"
                                shape={(props: any) => (
                                    <g>
                                        <circle cx={props.cx} cy={props.cy} r={12} fill="#fbbf24" opacity={0.4} className="animate-pulse" />
                                        <circle cx={props.cx} cy={props.cy} r={6} fill="#fbbf24" />
                                    </g>
                                )}
                            />
                        )}
                    </ScatterChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
