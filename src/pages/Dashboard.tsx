import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PoissonModel, MatchProbabilities } from '@/math/poisson'
import { GeometricEngine, PhasePoint } from '@/math/geometric'
import { analyzeFormWave, matchesToSignal, WaveAnalysis } from '@/math/fourier'
import { supabase } from '@/lib/supabase'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line } from 'recharts'
import { DataUploader } from '@/components/DataUploader'
import { UserPrediction } from '@/components/UserPrediction'
import { DatabaseStats } from '@/components/DatabaseStats'
import { MyPredictionsScore } from '@/components/MyPredictionsScore'
import { AIInsights } from '@/components/AIInsights'
import { HeadToHead } from '@/components/HeadToHead'
import { useAuth } from '@/contexts/AuthContext'
import { api, HeadToHead as H2HType } from '@/lib/api'

export function Dashboard() {
  const { signOut, user } = useAuth()
  const [teams, setTeams] = useState<string[]>([])

  const [params, setParams] = useState({
    homeTeam: '',
    awayTeam: '',
    homeXG: 0,
    awayXG: 0
  })

  const [results, setResults] = useState<MatchProbabilities | null>(null)
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

      // Fetch team stats and head-to-head in parallel
      const [homeStats, awayStats, h2h] = await Promise.all([
        api.getTeamStats(params.homeTeam),
        api.getTeamStats(params.awayTeam),
        api.getHeadToHead(params.homeTeam, params.awayTeam)
      ])

      setHeadToHead(h2h)
      setH2hLoading(false)

      // Simple predictive model: 
      // Home Goals = (Home Attack + Away Defense) / 2
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
        x: m.home_team === params.homeTeam ? m.home_goals : m.away_goals, // Goals Scored (Attack)
        y: m.home_team === params.homeTeam ? m.away_goals : m.home_goals, // Goals Conceded (Defense)
        className: "history"
      }))

      setTrajectory(geoPoints)
      setSimulationCloud([]) // Reset cloud on new team selection
      setDataLoading(false)
    }
    updateStats()
  }, [params.homeTeam, params.awayTeam])


  const handleCalculate = async () => {
    setLoading(true)

    // 2. Geometric Prediction (Monte Carlo)
    const geo = new GeometricEngine()

    if (trajectory.length > 0) {
      // Run 500 simulations
      const cloud = geo.runMonteCarloSimulation(trajectory, 500)
      setSimulationCloud(cloud)

      // Calculate the "Mean" path (Average of all simulations)
      const avgX = cloud.reduce((sum, p) => sum + p.x, 0) / cloud.length
      const avgY = cloud.reduce((sum, p) => sum + p.y, 0) / cloud.length

      const predictionMean: PhasePoint = {
        time: listTime(trajectory) + 1,
        x: avgX,
        y: avgY,
        className: "prediction"
      }

      // Update trajectory to show the mean prediction
      const cleanHistory = trajectory.filter(p => p.className !== 'prediction')
      setTrajectory([...cleanHistory, predictionMean])

      // ---------------------------------------------------------
      // "QUANTUM" UPDATE: Calculate probs from the Cloud ☁️
      // ---------------------------------------------------------
      let wins = 0
      let draws = 0
      let losses = 0

      cloud.forEach(p => {
        // Flatten the wave function: Round to nearest integer goal
        const homeGoals = Math.round(p.x)
        const awayGoals = Math.round(p.y)

        if (homeGoals > awayGoals) wins++
        else if (awayGoals > homeGoals) losses++
        else draws++
      })

      const totalSims = cloud.length
      const mcResults: MatchProbabilities = {
        homeWin: wins / totalSims,
        draw: draws / totalSims,
        awayWin: losses / totalSims,
        homeTeam: params.homeTeam,
        awayTeam: params.awayTeam
      }

      // Override the static Poisson results with our dynamic MC results
      setResults(mcResults)

      // Save to Supabase using these new "Quantum" probabilities
      try {
        const { error, data } = await supabase
          .from('predictions')
          .insert({
            home_team: params.homeTeam,
            away_team: params.awayTeam,
            home_xg: params.homeXG,
            away_xg: params.awayXG,
            prob_home: mcResults.homeWin,
            prob_draw: mcResults.draw,
            prob_away: mcResults.awayWin,
            predicted_outcome: mcResults.homeWin > mcResults.awayWin ? 'HOME_WIN' : (mcResults.awayWin > mcResults.homeWin ? 'AWAY_WIN' : 'DRAW')
          })
          .select()

        if (error) {
          console.error('Supabase error:', error)
          alert(`Errore salvataggio: ${error.message}\n\nPotrebbe servire aggiungere le policy RLS per utenti autenticati.`)
        } else {
          console.log('Prediction saved:', data)
        }
      } catch (err) {
        console.error('Save failed:', err)
      }

      // ---------------------------------------------------------
      // FFT WAVE ANALYSIS 🌊 - Find Hidden Patterns for BOTH teams
      // ---------------------------------------------------------
      // Home Team Analysis
      const homeStats = await api.getTeamStats(params.homeTeam, 20)
      const homeSignal = matchesToSignal(homeStats.recentMatches, params.homeTeam)
      const homeWave = analyzeFormWave(homeSignal, 3)
      setHomeWaveAnalysis(homeWave)

      // Away Team Analysis
      const awayStats = await api.getTeamStats(params.awayTeam, 20)
      const awaySignal = matchesToSignal(awayStats.recentMatches, params.awayTeam)
      const awayWave = analyzeFormWave(awaySignal, 3)
      setAwayWaveAnalysis(awayWave)
    } else {
      // Fallback if no history (shouldn't happen with real data selected)
      const poisson = new PoissonModel()
      const poissonRes = poisson.calculate(Number(params.homeXG), Number(params.awayXG))
      setResults(poissonRes)

      // Save to Supabase using Poisson probabilities
      try {
        const { error } = await supabase
          .from('predictions')
          .insert({
            home_team: params.homeTeam,
            away_team: params.awayTeam,
            home_xg: params.homeXG,
            away_xg: params.awayXG,
            prob_home: poissonRes.homeWin,
            prob_draw: poissonRes.draw,
            prob_away: poissonRes.awayWin,
            predicted_outcome: poissonRes.homeWin > poissonRes.awayWin ? 'HOME_WIN' : (poissonRes.awayWin > poissonRes.homeWin ? 'AWAY_WIN' : 'DRAW')
          })

        if (error) console.error('Supabase error:', error)
      } catch (err) {
        console.error('Save failed:', err)
      }
    }

    setLoading(false)
  }

  // Helper to get last time
  const listTime = (t: PhasePoint[]) => t.length > 0 ? t[t.length - 1].time : 0

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 font-sans text-foreground">
      {/* HEADER */}
      <header className="mb-6 md:mb-12 border-b-4 border-brutal-border pb-4 md:pb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tighter">FLP<span className="text-secondary">.Beta</span></h1>
          <p className="mt-1 md:mt-2 text-sm md:text-xl font-bold uppercase tracking-widest opacity-60">Monte Carlo Predictive Engine</p>
        </div>
        <div className="flex flex-row md:flex-col items-center md:items-end gap-2">
          <span className="text-xs md:text-sm font-bold truncate max-w-[150px] md:max-w-none">{user?.email}</span>
          <Button variant="outline" onClick={() => signOut()} className="text-xs py-1 h-8">Logout</Button>
        </div>
      </header>

      {/* Admin Zone */}
      <div className="mb-8">
        <DataUploader />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8">

        {/* INPUT COLUMN */}
        <div className="lg:col-span-4 space-y-4 md:space-y-6">
          <Card>
            <CardHeader>Match Parameters (Data Derived)</CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Team Selectors */}
                <div>
                  <label className="block mb-2 font-bold uppercase text-xs tracking-widest">Home Team</label>
                  <select
                    className="w-full border-2 border-brutal-border bg-white px-3 py-2 text-sm"
                    value={params.homeTeam}
                    onChange={e => setParams({ ...params, homeTeam: e.target.value })}
                  >
                    <option value="">Select Team...</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 font-bold uppercase text-xs tracking-widest">Away Team</label>
                  <select
                    className="w-full border-2 border-brutal-border bg-white px-3 py-2 text-sm"
                    value={params.awayTeam}
                    onChange={e => setParams({ ...params, awayTeam: e.target.value })}
                  >
                    <option value="">Select Team...</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Stats Inputs (Auto-filled but editable) */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Calc. Home xG"
                  type="number"
                  step="0.1"
                  value={params.homeXG}
                  onChange={e => setParams({ ...params, homeXG: Number(e.target.value) })}
                />
                <Input
                  label="Calc. Away xG"
                  type="number"
                  step="0.1"
                  value={params.awayXG}
                  onChange={e => setParams({ ...params, awayXG: Number(e.target.value) })}
                />
              </div>

              <div className="pt-4">
                <Button
                  variant="primary"
                  className="w-full h-16 text-xl"
                  onClick={handleCalculate}
                  disabled={loading || !params.homeTeam || !params.awayTeam}
                >
                  {loading ? "Simulating..." : dataLoading ? "Analysing Data..." : "Run Monte Carlo"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* RESULTS PANEL */}
          {results && (
            <Card variant="dark" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <CardHeader className="border-white/20">Quantum Probabilities (Monte Carlo)</CardHeader>
              <CardContent className="space-y-6">
                
                {/* PREDICTION GAUGE / PENDULUM */}
                <div className="relative">
                  {/* Team Names */}
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-secondary text-sm md:text-base truncate max-w-[120px]">{params.homeTeam}</span>
                    <span className="font-bold text-gray-400 text-xs uppercase">Draw</span>
                    <span className="font-bold text-danger text-sm md:text-base truncate max-w-[120px] text-right">{params.awayTeam}</span>
                  </div>
                  
                  {/* Gauge Bar */}
                  <div className="relative h-8 md:h-10 rounded-full overflow-hidden bg-gray-700 border-2 border-white/20">
                    {/* Home Win Zone (Green) */}
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-600 to-green-500 transition-all duration-700"
                      style={{ width: `${results.homeWin * 100}%` }}
                    />
                    {/* Draw Zone (Gray) - positioned after home */}
                    <div 
                      className="absolute top-0 h-full bg-gradient-to-r from-gray-500 to-gray-400 transition-all duration-700"
                      style={{ 
                        left: `${results.homeWin * 100}%`,
                        width: `${results.draw * 100}%` 
                      }}
                    />
                    {/* Away Win Zone (Red) */}
                    <div 
                      className="absolute right-0 top-0 h-full bg-gradient-to-l from-red-600 to-red-500 transition-all duration-700"
                      style={{ width: `${results.awayWin * 100}%` }}
                    />
                    
                    {/* Center Marker (50%) */}
                    <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/50 transform -translate-x-1/2" />
                    
                    {/* Pendulum Needle */}
                    <div 
                      className="absolute top-1/2 h-6 w-1.5 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 transform -translate-y-1/2 transition-all duration-700 z-10"
                      style={{ 
                        left: `calc(${results.homeWin * 100}% + ${results.draw * 50}%)`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  </div>
                  
                  {/* Percentage Labels under gauge */}
                  <div className="flex justify-between mt-1 text-xs opacity-60">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* PREDICTED OUTCOME BADGE */}
                <div className="flex justify-center">
                  {(() => {
                    const maxProb = Math.max(results.homeWin, results.draw, results.awayWin)
                    const confidence = maxProb * 100
                    let prediction = ''
                    let bgColor = ''
                    let emoji = ''
                    
                    if (results.homeWin === maxProb) {
                      prediction = `${params.homeTeam} WINS`
                      bgColor = 'bg-green-600'
                      emoji = '🏠'
                    } else if (results.awayWin === maxProb) {
                      prediction = `${params.awayTeam} WINS`
                      bgColor = 'bg-red-600'
                      emoji = '✈️'
                    } else {
                      prediction = 'DRAW'
                      bgColor = 'bg-gray-600'
                      emoji = '🤝'
                    }
                    
                    return (
                      <div className={`${bgColor} px-6 py-3 rounded-lg text-center`}>
                        <div className="text-2xl md:text-3xl font-black">
                          {emoji} {prediction}
                        </div>
                        <div className="text-sm opacity-80 mt-1">
                          Confidence: {confidence.toFixed(1)}%
                          {confidence > 60 ? ' 🔥' : confidence > 45 ? ' ⚠️' : ' 🎲'}
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Detailed Probabilities */}
                <div className="grid grid-cols-3 text-center pt-4 border-t border-white/10">
                  <div>
                    <div className="text-sm opacity-60 uppercase tracking-widest">Home</div>
                    <div className="text-4xl font-black text-secondary">{(results.homeWin * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60 uppercase tracking-widest">Draw</div>
                    <div className="text-4xl font-black text-gray-400">{(results.draw * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-60 uppercase tracking-widest">Away</div>
                    <div className="text-4xl font-black text-danger">{(results.awayWin * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QUICK STATS - Replaces useless News Panel */}
          {params.homeTeam && params.awayTeam && (
            <Card className="mt-4">
              <CardHeader className="py-3">📊 Quick Stats</CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-green-50 p-3 rounded-lg border-2 border-green-200">
                  <div className="text-xs text-gray-500 uppercase">Home xG</div>
                  <div className="text-2xl font-black text-green-600">{params.homeXG.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">{params.homeTeam}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border-2 border-red-200">
                  <div className="text-xs text-gray-500 uppercase">Away xG</div>
                  <div className="text-2xl font-black text-red-600">{params.awayXG.toFixed(2)}</div>
                  <div className="text-xs text-gray-600">{params.awayTeam}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* HEAD TO HEAD */}
          {params.homeTeam && params.awayTeam && (
            <div className="mt-4">
              <HeadToHead 
                homeTeam={params.homeTeam}
                awayTeam={params.awayTeam}
                data={headToHead}
                loading={h2hLoading}
              />
            </div>
          )}

          {/* USER PREDICTION - 1 X 2 con Stake */}
          <UserPrediction 
            homeTeam={params.homeTeam}
            awayTeam={params.awayTeam}
            aiPrediction={results ? {
              homeWin: results.homeWin,
              draw: results.draw,
              awayWin: results.awayWin
            } : undefined}
          />
        </div>

        {/* MAIN VISUALIZATION COLUMN */}
        <div className="lg:col-span-8 space-y-4 md:space-y-6">
          <Card className="h-[350px] md:h-[600px] flex flex-col">
            <CardHeader className="text-sm md:text-base">Phase Space (Monte Carlo Simulation)</CardHeader>
            <CardContent className="flex-1 w-full min-h-[250px] relative p-0">
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <span className="text-5xl md:text-9xl font-black uppercase rotate-[-45deg]">MC Sim</span>
              </div>

              <div className="absolute inset-0 p-4" style={{ minHeight: '250px', minWidth: '300px' }}>
                {/* Geometric Graph - Recharts */}
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="⚔️ Attack (Goals For)"
                      allowDecimals={true}
                      domain={['auto', 'auto']}
                      label={{ value: '⚔️ Attack Power (Goals For)', position: 'bottom', offset: 0 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="🛡️ Defense (Goals Against)"
                      allowDecimals={true}
                      domain={['auto', 'auto']}
                      label={{ value: '🛡️ Defense Vulnerability (Goals Against)', angle: -90, position: 'left' }}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <ReferenceLine y={1.5} stroke="red" strokeDasharray="3 3" label="High Def Risk" />
                    <ReferenceLine x={1.5} stroke="green" strokeDasharray="3 3" label="High Offense" />

                    {/* 1. Monte Carlo Cloud (Low Opacity) */}
                    {simulationCloud.length > 0 && (
                      <Scatter
                        name="Uncertainty Cloud"
                        data={simulationCloud}
                        fill="#8884d8"
                        opacity={0.3}
                        shape="circle"
                      />
                    )}

                    {/* 2. History Series (Green) */}
                    {trajectory.length > 0 && (
                      <Scatter
                        name="History"
                        data={trajectory.filter(p => p.className !== 'prediction')}
                        fill="#004d40"
                        line={{ stroke: '#004d40', strokeWidth: 2 }}
                        shape="circle"
                      />
                    )}

                    {/* 3. Prediction Point (Mean) - ENHANCED STAR ⭐ */}
                    {trajectory.some(p => p.className === 'prediction') && (
                      <Scatter
                        name="⭐ PREDICTION"
                        data={trajectory.filter(p => p.className === 'prediction')}
                        fill="#fbbf24"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        shape={(props: any) => {
                          const { cx, cy } = props;
                          // Custom 5-pointed star SVG
                          const size = 20;
                          return (
                            <g>
                              {/* Glow effect */}
                              <circle cx={cx} cy={cy} r={size * 1.5} fill="#fbbf24" opacity={0.3} />
                              <circle cx={cx} cy={cy} r={size * 1.2} fill="#fbbf24" opacity={0.4} />
                              {/* Star polygon */}
                              <polygon
                                points={`${cx},${cy - size} ${cx + size * 0.22},${cy - size * 0.31} ${cx + size * 0.95},${cy - size * 0.31} ${cx + size * 0.36},${cy + size * 0.12} ${cx + size * 0.59},${cy + size * 0.81} ${cx},${cy + size * 0.38} ${cx - size * 0.59},${cy + size * 0.81} ${cx - size * 0.36},${cy + size * 0.12} ${cx - size * 0.95},${cy - size * 0.31} ${cx - size * 0.22},${cy - size * 0.31}`}
                                fill="#fbbf24"
                                stroke="#d97706"
                                strokeWidth={2}
                              />
                              {/* Center highlight */}
                              <circle cx={cx} cy={cy} r={size * 0.2} fill="white" opacity={0.7} />
                            </g>
                          );
                        }}
                      />
                    )}
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* FFT WAVE ANALYSIS - BOTH TEAMS 🌊 */}
          {(homeWaveAnalysis || awayWaveAnalysis) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 md:mt-6">
              {/* HOME TEAM FORM */}
              {homeWaveAnalysis && (
                <Card className="h-[320px] flex flex-col border-l-4 border-l-green-500">
                  <CardHeader className="flex flex-row justify-between items-center py-3">
                    <div>
                      <span className="text-base font-bold">🏠 {params.homeTeam}</span>
                      <p className="text-xs text-gray-500">Last 20 matches</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${homeWaveAnalysis.waveDirection === 'RISING' ? 'bg-green-500 text-white' :
                      homeWaveAnalysis.waveDirection === 'FALLING' ? 'bg-red-500 text-white' :
                        'bg-gray-400 text-white'
                      }`}>
                      {homeWaveAnalysis.waveDirection === 'RISING' ? '📈 RISING' :
                        homeWaveAnalysis.waveDirection === 'FALLING' ? '📉 FALLING' : '➡️ STABLE'}
                    </span>
                  </CardHeader>
                  <CardContent className="flex-1 w-full min-h-[150px] relative p-0">
                    <div className="absolute inset-0 p-2" style={{ minHeight: '150px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={homeWaveAnalysis.signal.map((v, i) => ({ match: i + 1, result: v, trend: homeWaveAnalysis.reconstructed[i] }))}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="match" tick={{ fontSize: 10 }} />
                          <YAxis domain={[-1.5, 1.5]} ticks={[-1, 0, 1]} tickFormatter={(v) => v === 1 ? 'W' : v === -1 ? 'L' : 'D'} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value, name) => [name === 'result' ? (value === 1 ? 'WIN' : value === -1 ? 'LOSS' : 'DRAW') : Number(value).toFixed(2), name === 'result' ? 'Result' : 'Trend']} />
                          <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                          <Line type="stepAfter" dataKey="result" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Results" />
                          <Line type="monotone" dataKey="trend" stroke="#f59e0b" strokeWidth={2} dot={false} name="Trend" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <div className="px-3 pb-3 text-xs text-gray-600">
                    <strong>Momentum:</strong> {(homeWaveAnalysis.momentum * 100).toFixed(0)}% | 
                    <strong> Cycles:</strong> {homeWaveAnalysis.dominantFrequencies.slice(0, 2).map(f => `~${f.period.toFixed(0)}m`).join(', ')}
                  </div>
                </Card>
              )}

              {/* AWAY TEAM FORM */}
              {awayWaveAnalysis && (
                <Card className="h-[320px] flex flex-col border-l-4 border-l-red-500">
                  <CardHeader className="flex flex-row justify-between items-center py-3">
                    <div>
                      <span className="text-base font-bold">✈️ {params.awayTeam}</span>
                      <p className="text-xs text-gray-500">Last 20 matches</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${awayWaveAnalysis.waveDirection === 'RISING' ? 'bg-green-500 text-white' :
                      awayWaveAnalysis.waveDirection === 'FALLING' ? 'bg-red-500 text-white' :
                        'bg-gray-400 text-white'
                      }`}>
                      {awayWaveAnalysis.waveDirection === 'RISING' ? '📈 RISING' :
                        awayWaveAnalysis.waveDirection === 'FALLING' ? '📉 FALLING' : '➡️ STABLE'}
                    </span>
                  </CardHeader>
                  <CardContent className="flex-1 w-full min-h-[150px] relative p-0">
                    <div className="absolute inset-0 p-2" style={{ minHeight: '150px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={awayWaveAnalysis.signal.map((v, i) => ({ match: i + 1, result: v, trend: awayWaveAnalysis.reconstructed[i] }))}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="match" tick={{ fontSize: 10 }} />
                          <YAxis domain={[-1.5, 1.5]} ticks={[-1, 0, 1]} tickFormatter={(v) => v === 1 ? 'W' : v === -1 ? 'L' : 'D'} tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(value, name) => [name === 'result' ? (value === 1 ? 'WIN' : value === -1 ? 'LOSS' : 'DRAW') : Number(value).toFixed(2), name === 'result' ? 'Result' : 'Trend']} />
                          <ReferenceLine y={0} stroke="#888" strokeDasharray="3 3" />
                          <Line type="stepAfter" dataKey="result" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Results" />
                          <Line type="monotone" dataKey="trend" stroke="#f59e0b" strokeWidth={2} dot={false} name="Trend" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                  <div className="px-3 pb-3 text-xs text-gray-600">
                    <strong>Momentum:</strong> {(awayWaveAnalysis.momentum * 100).toFixed(0)}% | 
                    <strong> Cycles:</strong> {awayWaveAnalysis.dominantFrequencies.slice(0, 2).map(f => `~${f.period.toFixed(0)}m`).join(', ')}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* FORM COMPARISON SUMMARY */}
          {homeWaveAnalysis && awayWaveAnalysis && (
            <Card className="mt-4 bg-gradient-to-r from-green-50 to-red-50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className={`text-3xl font-black ${homeWaveAnalysis.momentum > 0 ? 'text-green-600' : homeWaveAnalysis.momentum < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {homeWaveAnalysis.momentum > 0 ? '↑' : homeWaveAnalysis.momentum < 0 ? '↓' : '→'} {Math.abs(homeWaveAnalysis.momentum * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm font-bold">{params.homeTeam}</div>
                    <div className="text-xs text-gray-500">{homeWaveAnalysis.waveDirection}</div>
                  </div>
                  
                  <div className="text-center px-4">
                    <div className="text-2xl font-black text-gray-400">VS</div>
                    <div className="text-xs mt-1">
                      {homeWaveAnalysis.momentum > awayWaveAnalysis.momentum ? (
                        <span className="text-green-600 font-bold">🏠 Better Form</span>
                      ) : homeWaveAnalysis.momentum < awayWaveAnalysis.momentum ? (
                        <span className="text-red-600 font-bold">✈️ Better Form</span>
                      ) : (
                        <span className="text-gray-500 font-bold">Equal Form</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-center flex-1">
                    <div className={`text-3xl font-black ${awayWaveAnalysis.momentum > 0 ? 'text-green-600' : awayWaveAnalysis.momentum < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {awayWaveAnalysis.momentum > 0 ? '↑' : awayWaveAnalysis.momentum < 0 ? '↓' : '→'} {Math.abs(awayWaveAnalysis.momentum * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm font-bold">{params.awayTeam}</div>
                    <div className="text-xs text-gray-500">{awayWaveAnalysis.waveDirection}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI INSIGHTS */}
          <div className="mt-4">
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

      </div>

      {/* FOOTER: Database Stats + My Predictions Side by Side */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <MyPredictionsScore />
        <DatabaseStats />
      </div>
    </div>
  )
}


