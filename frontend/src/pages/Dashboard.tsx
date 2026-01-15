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
import { MyPredictionsScore } from '@/components/MyPredictionsScore'
import { AIInsights } from '@/components/AIInsights'
import { HeadToHead } from '@/components/HeadToHead'
import { api, HeadToHead as H2HType } from '@/lib/api'
import { MainLayout } from '@/components/layout/MainLayout'
import { AdSpace } from '@/components/ads/AdSpace'
import { Activity, Zap, BarChart3 } from 'lucide-react'

export function Dashboard() {
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

      const [homeStats, awayStats, h2h] = await Promise.all([
        api.getTeamStats(params.homeTeam),
        api.getTeamStats(params.awayTeam),
        api.getHeadToHead(params.homeTeam, params.awayTeam)
      ])

      setHeadToHead(h2h)
      setH2hLoading(false)

      const naiveHomeXG = (homeStats.avgGoalsFor + awayStats.avgGoalsAgainst) / 2
      const naiveAwayXG = (awayStats.avgGoalsFor + homeStats.avgGoalsAgainst) / 2

      setParams(p => ({
        ...p,
        homeXG: Number(naiveHomeXG.toFixed(2)),
        awayXG: Number(naiveAwayXG.toFixed(2))
      }))

      // Prepare Trajectory Data (Real History)
      const geoPoints: PhasePoint[] = homeStats.recentMatches.map((m, i) => ({
        time: i,
        x: m.home_team === params.homeTeam ? m.home_goals : m.away_goals,
        y: m.home_team === params.homeTeam ? m.away_goals : m.home_goals,
        className: "history"
      }))

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
      const prediction = await oracle.calculate(
        params.homeTeam,
        params.awayTeam,
        params.homeXG,
        params.awayXG,
        homeStats.recentMatches,
        awayStats.recentMatches
      )

      setResults(prediction)

      const homeSignal = matchesToSignal(homeStats.recentMatches, params.homeTeam)
      setHomeWaveAnalysis(analyzeFormWave(homeSignal, 3))

      const awaySignal = matchesToSignal(awayStats.recentMatches, params.awayTeam)
      setAwayWaveAnalysis(analyzeFormWave(awaySignal, 3))

      setSimulationCloud(prediction.simulationCloud)

      const predictionMean: PhasePoint = {
        time: listTime(trajectory) + 1,
        x: prediction.adjustedHomeXG,
        y: prediction.adjustedAwayXG,
        className: "prediction"
      }
      const cleanHistory = trajectory.filter(p => p.className !== 'prediction')
      setTrajectory([...cleanHistory, predictionMean])

      await supabase.from('predictions').insert({
        home_team: params.homeTeam,
        away_team: params.awayTeam,
        home_xg: params.homeXG,
        away_xg: params.awayXG,
        prob_home: prediction.homeWin,
        prob_draw: prediction.draw,
        prob_away: prediction.awayWin,
        predicted_outcome:
          prediction.homeWin >= Math.max(prediction.draw, prediction.awayWin) ? 'HOME_WIN' :
            (prediction.awayWin >= Math.max(prediction.draw, prediction.homeWin) ? 'AWAY_WIN' : 'DRAW')
      })

    } catch (err) {
      console.error('Calculation failed:', err)
    }

    setLoading(false)
  }

  const listTime = (t: PhasePoint[]) => t.length > 0 ? t[t.length - 1].time : 0

  return (
    <MainLayout>
      {/* Admin / Data Upload Only */}
      <div className="mb-6">
        <DataUploader />
      </div>

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

              <Button
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-neon border-0"
                onClick={handleCalculate}
                disabled={loading || !params.homeTeam || !params.awayTeam}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5 animate-pulse" /> Simulating...
                  </span>
                ) : dataLoading ? (
                  "Analysing Data..."
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5" /> Run Oracle Prediction
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* RESULTS PANEL */}
          {results && (
            <Card className="glass-panel border-0 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-black/40">
              <CardHeader className="border-b border-white/5 flex justify-between items-center pb-3">
                <span className="font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-secondary" />
                  Oracle Verdict
                </span>
                <span className="text-xs bg-secondary/20 text-secondary px-2 py-1 rounded border border-secondary/30 font-mono">
                  Confidence: {(results.confidence * 100).toFixed(0)}%
                </span>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">

                {/* GAUGE */}
                <div className="relative">
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-white text-sm">{params.homeTeam}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest">Draw Zone</span>
                    <span className="font-bold text-white text-sm text-right">{params.awayTeam}</span>
                  </div>

                  <div className="relative h-6 rounded-full overflow-hidden bg-slate-800/50 ring-1 ring-white/10">
                    <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500/80 to-emerald-400/80" style={{ width: `${results.homeWin * 100}%` }} />
                    <div className="absolute top-0 h-full bg-white/10" style={{ left: `${results.homeWin * 100}%`, width: `${results.draw * 100}%` }} />
                    <div className="absolute right-0 top-0 h-full bg-gradient-to-l from-rose-500/80 to-rose-400/80" style={{ width: `${results.awayWin * 100}%` }} />

                    {/* Needle */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)] z-10"
                      style={{
                        left: `calc(${(results.homeWin + results.draw / 2) * 100}%)`, // Simply center in draw for demo logic, relying on simple visual
                        transform: 'translateX(-50%)'
                      }}
                    />
                  </div>

                  {/* Accurate Needle Position fix based on probability weight */}
                  <div
                    className="absolute top-1/2 -mt-2 w-4 h-4 bg-white rounded-full shadow-lg z-20 transition-all duration-1000 ease-out flex items-center justify-center"
                    style={{
                      left: `${(results.homeWin * 100) + (results.draw * 50)}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  </div>
                </div>

                {/* PREDICTION BADGE */}
                <div className="flex justify-center">
                  {(() => {
                    const maxProb = Math.max(results.homeWin, results.draw, results.awayWin)
                    let prediction = '', color = ''
                    if (results.homeWin === maxProb) { prediction = `${params.homeTeam}`; color = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' }
                    else if (results.awayWin === maxProb) { prediction = `${params.awayTeam}`; color = 'text-rose-400 border-rose-500/30 bg-rose-500/10' }
                    else { prediction = 'DRAW'; color = 'text-slate-200 border-slate-500/30 bg-slate-500/10' }

                    return (
                      <div className={`px-8 py-4 rounded-xl border ${color} backdrop-blur-md`}>
                        <div className="text-center text-xs uppercase tracking-widest opacity-70 mb-1">Predicted Winner</div>
                        <div className="text-2xl md:text-3xl font-black tracking-tight">{prediction}</div>
                      </div>
                    )
                  })()}
                </div>

                <div className="grid grid-cols-3 text-center divide-x divide-white/10">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Home</div>
                    <div className="text-xl font-black text-emerald-400">{(results.homeWin * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Draw</div>
                    <div className="text-xl font-black text-slate-400">{(results.draw * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase">Away</div>
                    <div className="text-xl font-black text-rose-400">{(results.awayWin * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* IN-FEED AD */}
          <div className="flex justify-center py-2">
            <AdSpace type="rectangle" className="w-full" />
          </div>

          {/* HEAD TO HEAD & USER PREDICTION */}
          {params.homeTeam && params.awayTeam && (
            <div className="space-y-6">
              <HeadToHead homeTeam={params.homeTeam} awayTeam={params.awayTeam} data={headToHead} loading={h2hLoading} />
              <UserPrediction homeTeam={params.homeTeam} awayTeam={params.awayTeam} aiPrediction={results ? { homeWin: results.homeWin, draw: results.draw, awayWin: results.awayWin } : undefined} />
            </div>
          )}
        </div>

        {/* VISUALIZATION COLUMN */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="h-[500px] glass-panel border-0 flex flex-col">
            <CardHeader className="border-b border-white/5 pb-2">
              <h3 className="text-sm font-bold text-white">Monte Carlo Phase Space</h3>
            </CardHeader>
            <CardContent className="flex-1 w-full min-h-[400px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis type="number" dataKey="x" name="Attack" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="number" dataKey="y" name="Defense" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {homeWaveAnalysis && <WaveChart team={params.homeTeam} wave={homeWaveAnalysis} color="#10b981" />}
              {awayWaveAnalysis && <WaveChart team={params.awayTeam} wave={awayWaveAnalysis} color="#f43f5e" />}
            </div>
          )}

          {/* AI INSIGHTS */}
          <AIInsights
            homeTeam={params.homeTeam}
            awayTeam={params.awayTeam}
            results={results}
            homeWave={homeWaveAnalysis}
            awayWave={awayWaveAnalysis}
            homeXG={params.homeXG}
            awayXG={params.awayXG}
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <MyPredictionsScore />
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
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={wave.signal.map((v, i) => ({ i, v, t: wave.reconstructed[i] }))}>
            <Line type="monotone" dataKey="t" stroke={color} strokeWidth={2} dot={false} />
            <Line type="stepAfter" dataKey="v" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={false} opacity={0.5} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
