import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhasePoint } from '@/math/geometric'
import { analyzeFormWave, matchesToSignal, WaveAnalysis } from '@/math/fourier'
import { OracleIntegrator, OraclePrediction } from '@/math/oracle'
import { supabase } from '@/lib/supabase'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts'
import { DataUploader } from '@/components/DataUploader'
import { UserPrediction } from '@/components/UserPrediction'
import { DatabaseStats } from '@/components/DatabaseStats'
import { AIInsights } from '@/components/AIInsights'
import { HeadToHead } from '@/components/HeadToHead'
import { api, HeadToHead as H2HType } from '@/lib/api'
import { MainLayout } from '@/components/layout/MainLayout'
import { AdSpace } from '@/components/ads/AdSpace'
import { NewsImpactItem } from '@/math/newsImpact'
import { Activity, Zap, BarChart3 } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'

export function Dashboard() {
  const { isAdmin } = useAuth()
  const [teams, setTeams] = useState<string[]>([])
  const [params, setParams] = useState({
    homeTeam: '',
    awayTeam: '',
    homeXG: 0,
    awayXG: 0
  })

  // State
  const [results, setResults] = useState<OraclePrediction | null>(null)
  const [trajectory, setTrajectory] = useState<PhasePoint[]>([])
  const [simulationCloud, setSimulationCloud] = useState<PhasePoint[]>([])
  const [homeWaveAnalysis, setHomeWaveAnalysis] = useState<WaveAnalysis | null>(null)
  const [awayWaveAnalysis, setAwayWaveAnalysis] = useState<WaveAnalysis | null>(null)
  const [headToHead, setHeadToHead] = useState<H2HType | null>(null)
  const [h2hLoading, setH2hLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [lastCalculatedParams, setLastCalculatedParams] = useState<string>('')

  // News State
  const [homeNews, setHomeNews] = useState<NewsImpactItem[]>([])
  const [awayNews, setAwayNews] = useState<NewsImpactItem[]>([])

  // Load Teams on Mount
  useEffect(() => {
    api.getTeams().then(setTeams)
  }, [])

  // Auto-calculate expected stats when teams change
  useEffect(() => {
    async function updateStats() {
      if (!params.homeTeam || !params.awayTeam) return
      setDataLoading(true)
      setH2hLoading(true)

      const [homeStats, awayStats, h2h, hNews, aNews] = await Promise.all([
        api.getTeamStats(params.homeTeam),
        api.getTeamStats(params.awayTeam),
        api.getHeadToHead(params.homeTeam, params.awayTeam),
        api.getNews(params.homeTeam),
        api.getNews(params.awayTeam)
      ])

      setHeadToHead(h2h)
      setHomeNews(hNews)
      setAwayNews(aNews)
      setH2hLoading(false)

      const naiveHomeXG = (homeStats.avgHomeGoalsFor + awayStats.avgAwayGoalsAgainst) / 2
      const naiveAwayXG = (awayStats.avgAwayGoalsFor + homeStats.avgHomeGoalsAgainst) / 2

      setParams(p => ({
        ...p,
        homeXG: Number(naiveHomeXG.toFixed(2)),
        awayXG: Number(naiveAwayXG.toFixed(2))
      }))

      // Prepare Trajectory Data (Real History) using Rolling Average
      const geoPoints = calculateRollingAverage(homeStats.recentMatches, params.homeTeam, 5)

      setTrajectory(geoPoints)
      setSimulationCloud([])
      setDataLoading(false)
    }
    updateStats()
  }, [params.homeTeam, params.awayTeam])


  const handleCalculate = async () => {
    if (!params.homeTeam || !params.awayTeam) return
    setLoading(true)

    try {
      const [homeStats, awayStats] = await Promise.all([
        api.getTeamStats(params.homeTeam, 20),
        api.getTeamStats(params.awayTeam, 20)
      ])

      const oracle = new OracleIntegrator()
      const prediction = await oracle.predict(
        params.homeTeam,
        params.awayTeam,
        params.homeXG,
        params.awayXG,
        homeStats.recentMatches,
        awayStats.recentMatches,
        homeNews,
        awayNews
      )

      setResults(prediction)

      const homeSignal = matchesToSignal(homeStats.recentMatches, params.homeTeam)
      setHomeWaveAnalysis(analyzeFormWave(homeSignal, 3))

      const awaySignal = matchesToSignal(awayStats.recentMatches, params.awayTeam)
      setAwayWaveAnalysis(analyzeFormWave(awaySignal, 3))

      setSimulationCloud(prediction.simulationCloud || [])

      const predictionMean: PhasePoint = {
        time: listTime(trajectory) + 1,
        x: prediction.adjustedHomeXG,
        y: prediction.adjustedAwayXG,
        className: "prediction"
      }
      const cleanHistory = trajectory.filter(p => p.className !== 'prediction')
      setTrajectory([...cleanHistory, predictionMean])

      // 4. Save to Database ONLY if it's a new calculation
      // This prevents duplicates if user clicks multiple times without changing params
      const currentParamKey = `${params.homeTeam}-${params.awayTeam}-${params.homeXG}-${params.awayXG}`;
      if (lastCalculatedParams !== currentParamKey) {
        await supabase.from('predictions').insert({
          home_team: params.homeTeam,
          away_team: params.awayTeam,
          home_xg: params.homeXG,
          away_xg: params.awayXG,
          prob_home: prediction.predictions['1X2'].home_win,
          prob_draw: prediction.predictions['1X2'].draw,
          prob_away: prediction.predictions['1X2'].away_win,
          predicted_outcome:
            prediction.predictions['1X2'].home_win >= Math.max(prediction.predictions['1X2'].draw, prediction.predictions['1X2'].away_win) ? 'HOME_WIN' :
              (prediction.predictions['1X2'].away_win >= Math.max(prediction.predictions['1X2'].draw, prediction.predictions['1X2'].home_win) ? 'AWAY_WIN' : 'DRAW')
        })
        setLastCalculatedParams(currentParamKey)
      }

    } catch (err) {
      console.error('Calculation failed:', err)
    }

    setLoading(false)
  }

  const handleReset = () => {
    if (results && !window.confirm('Sei sicuro di voler cancellare l\'analisi attuale?')) return

    setParams({
      homeTeam: '',
      awayTeam: '',
      homeXG: 0,
      awayXG: 0
    })
    setResults(null)
    setTrajectory([])
    setSimulationCloud([])
    setHomeWaveAnalysis(null)
    setAwayWaveAnalysis(null)
    setHeadToHead(null)
    setLastCalculatedParams('')
  }

  const listTime = (t: PhasePoint[]) => t.length > 0 ? t[t.length - 1].time : 0

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
          <Card className="glass-panel border-0">
            <CardHeader className="border-b border-white/5 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Match Parameters
              </h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-bold uppercase text-[10px] tracking-widest text-slate-400">Home Team</label>
                  <select
                    className="w-full glass-input rounded-md px-3 py-2 text-sm"
                    value={params.homeTeam}
                    onChange={e => setParams({ ...params, homeTeam: e.target.value })}
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
                    onChange={e => setParams({ ...params, awayTeam: e.target.value })}
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
                  onChange={e => setParams({ ...params, homeXG: Number(e.target.value) })}
                />
                <Input
                  label="Calc. Away xG"
                  type="number"
                  step="0.1"
                  className="glass-input"
                  value={params.awayXG}
                  onChange={e => setParams({ ...params, awayXG: Number(e.target.value) })}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 h-12 text-sm font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-neon border-0"
                  onClick={handleCalculate}
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
                  onClick={handleReset}
                  title="Nuova Analisi"
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* HEAD TO HEAD & USER PREDICTION */}
          {params.homeTeam && params.awayTeam && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
              <HeadToHead homeTeam={params.homeTeam} awayTeam={params.awayTeam} data={headToHead} loading={h2hLoading} />
              <UserPrediction homeTeam={params.homeTeam} awayTeam={params.awayTeam} aiPrediction={results ? { homeWin: results.predictions['1X2'].home_win, draw: results.predictions['1X2'].draw, awayWin: results.predictions['1X2'].away_win } : undefined} />
            </div>
          )}
        </div>

        {/* VISUALIZATION COLUMN */}
        <div className="xl:col-span-8 space-y-6">
          {/* RESULTS PANEL (Moved here for better layout) */}
          {results && (
            <Card className="glass-panel border-0 animate-in fade-in slide-in-from-top-4 duration-500 bg-black/40">
              {(() => {
                const prediction1X2 = results.predictions['1X2'];
                return (
                  <>
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
                      {lastCalculatedParams === `${params.homeTeam}-${params.awayTeam}-${params.homeXG}-${params.awayXG}` && (
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
                            {(() => {
                              const prediction1X2 = results.predictions['1X2'];
                              const maxProb = Math.max(prediction1X2.home_win, prediction1X2.draw, prediction1X2.away_win)
                              let predictionOutcome = '', color = ''
                              if (prediction1X2.home_win === maxProb) { predictionOutcome = `${params.homeTeam}`; color = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
                              else if (prediction1X2.away_win === maxProb) { predictionOutcome = `${params.awayTeam}`; color = 'text-rose-400 border-rose-500/30 bg-rose-500/10' }
                              else { predictionOutcome = 'DRAW'; color = 'text-slate-200 border-slate-500/30 bg-slate-500/10' }

                              return (
                                <div className={`px-6 py-3 rounded-xl border ${color} backdrop-blur-md w-full text-center`}>
                                  <div className="text-[10px] uppercase tracking-widest opacity-70 mb-1">Predicted Verdict</div>
                                  <div className="text-xl font-black tracking-tight">{predictionOutcome}</div>
                                </div>
                              )
                            })()}
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
                  </>
                );
              })()}
            </Card>
          )}

          {/* AI INSIGHTS (Priority positioning) */}
          <AIInsights
            homeTeam={params.homeTeam}
            awayTeam={params.awayTeam}
            results={results}
            homeWave={homeWaveAnalysis}
            awayWave={awayWaveAnalysis}
            homeNews={homeNews} // Passing news to AIInsights
            awayNews={awayNews}
          />

          <div className="flex justify-center">
            <AdSpace type="rectangle" className="w-full" />
          </div>
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

                  {/* Simulation Cloud */}
                  {simulationCloud.length > 0 && <Scatter name="Sim" data={simulationCloud} fill="#6366f1" opacity={0.2} shape="circle" />}

                  {/* History */}
                  {trajectory.length > 0 && (
                    <Scatter name="History" data={trajectory.filter(p => p.className !== 'prediction')} fill="#10b981" line={{ stroke: '#10b981', strokeWidth: 2 }} shape="circle" />
                  )}

                  {/* Prediction Star */}
                  {trajectory.some(p => p.className === 'prediction') && (
                    <Scatter
                      name="Prediction"
                      data={trajectory.filter(p => p.className === 'prediction')}
                      fill="#fbbf24"
                      shape={(props: any) => (
                        <g>
                          <circle cx={props.cx} cy={props.cy} r={10} fill="#fbbf24" opacity={0.5} className="animate-pulse" />
                          <polygon points={`${props.cx},${props.cy - 10} ${props.cx + 2},${props.cy - 3} ${props.cx + 10},${props.cy - 3} ${props.cx + 4},${props.cy + 2} ${props.cx + 6},${props.cy + 10} ${props.cx},${props.cy + 5} ${props.cx - 6},${props.cy + 10} ${props.cx - 4},${props.cy + 2} ${props.cx - 10},${props.cy - 3} ${props.cx - 2},${props.cy - 3}`} fill="#fbbf24" />
                        </g>
                      )}
                    />
                  )}
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* WAVE ANALYSIS */}
          {(homeWaveAnalysis || awayWaveAnalysis) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in-95 duration-700">
              {homeWaveAnalysis && <WaveChart team={params.homeTeam} wave={homeWaveAnalysis} color="#10b981" />}
              {awayWaveAnalysis && <WaveChart team={params.awayTeam} wave={awayWaveAnalysis} color="#f43f5e" />}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <DatabaseStats />
      </div>
    </MainLayout>
  )
}

// Helper Component for Wave Charts
function WaveChart({ team, wave, color }: { team: string, wave: WaveAnalysis, color: string }) {
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
          <LineChart data={wave.signal.map((v, i) => ({ i, v, t: wave.reconstructed[i] }))}>
            <Line type="monotone" dataKey="t" stroke={color} strokeWidth={2} dot={false} />
            <Line type="stepAfter" dataKey="v" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={false} opacity={0.5} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

/**
 * Calculates a rolling average for match stats to smooth out the trajectory.
 * Window size of 5 matches is standard for "Form".
 */
function calculateRollingAverage(matches: any[], team: string, windowSize: number = 5): PhasePoint[] {
  const points: PhasePoint[] = []

  // Create cumulative stats to avoid re-looping
  for (let i = 0; i < matches.length; i++) {
    // We need at least 'windowSize' matches to form a point
    if (i < windowSize - 1) continue

    const window = matches.slice(i - windowSize + 1, i + 1)
    let goalsFor = 0
    let goalsAgainst = 0

    window.forEach(m => {
      if (m.home_team === team) {
        goalsFor += m.home_goals
        goalsAgainst += m.away_goals
      } else {
        goalsFor += m.away_goals
        goalsAgainst += m.home_goals
      }
    })

    points.push({
      time: i,
      x: Number((goalsFor / windowSize).toFixed(2)),
      y: Number((goalsAgainst / windowSize).toFixed(2)),
      className: "history"
    })
  }

  // If we have very few matches, fallback to raw data but distinct
  if (points.length === 0 && matches.length > 0) {
    return matches.map((m, i) => ({
      time: i,
      x: m.home_team === team ? m.home_goals : m.away_goals,
      y: m.home_team === team ? m.away_goals : m.home_goals,
      className: "history"
    }))
  }

  return points
}

