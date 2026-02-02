/**
 * useDashboardState - Custom hook for Dashboard state management
 * Extracts complex state logic from Dashboard.tsx for better maintainability
 */

import { useState, useEffect, useCallback } from 'react'
import { PhasePoint } from '@/math/geometric'
import { analyzeFormWave, matchesToSignal, WaveAnalysis } from '@/math/fourier'
import { OracleIntegrator, OraclePrediction } from '@/math/oracle'
import { supabase } from '@/lib/supabase'
import { api, HeadToHead as H2HType } from '@/lib/api'
import type { LeagueCode } from '@/lib/constants'
import { NewsImpactItem } from '@/math/newsImpact'
import { calculateRollingAverage } from '@/lib/utils'

export interface MatchParams {
    homeTeam: string
    awayTeam: string
    homeXG: number
    awayXG: number
}

export interface DashboardState {
    // Teams & Leagues
    teams: string[]
    selectedLeagues: LeagueCode[]
    leaguesLoading: boolean

    // Match Parameters
    params: MatchParams

    // Prediction Results
    results: OraclePrediction | null
    homeTrajectory: PhasePoint[]
    awayTrajectory: PhasePoint[]
    simulationCloud: PhasePoint[]
    homeWaveAnalysis: WaveAnalysis | null
    awayWaveAnalysis: WaveAnalysis | null

    // Head to Head
    headToHead: H2HType | null
    h2hLoading: boolean

    // News
    homeNews: NewsImpactItem[]
    awayNews: NewsImpactItem[]

    // Loading States
    loading: boolean
    dataLoading: boolean
    lastCalculatedParams: string
}

export interface DashboardActions {
    setParams: (params: Partial<MatchParams>) => void
    toggleLeague: (league: LeagueCode) => void
    handleCalculate: () => Promise<void>
    handleReset: () => void
}

const initialParams: MatchParams = {
    homeTeam: '',
    awayTeam: '',
    homeXG: 0,
    awayXG: 0
}

export function useDashboardState(): DashboardState & DashboardActions {
    // Teams & Leagues
    const [teams, setTeams] = useState<string[]>([])
    const [selectedLeagues, setSelectedLeagues] = useState<LeagueCode[]>(['SA', 'PL', 'BL'])
    const [leaguesLoading, setLeaguesLoading] = useState(false)

    // Match Parameters
    const [params, setParamsState] = useState<MatchParams>(initialParams)

    // Prediction Results
    const [results, setResults] = useState<OraclePrediction | null>(null)
    const [homeTrajectory, setHomeTrajectory] = useState<PhasePoint[]>([])
    const [awayTrajectory, setAwayTrajectory] = useState<PhasePoint[]>([])
    const [simulationCloud, setSimulationCloud] = useState<PhasePoint[]>([])
    const [homeWaveAnalysis, setHomeWaveAnalysis] = useState<WaveAnalysis | null>(null)
    const [awayWaveAnalysis, setAwayWaveAnalysis] = useState<WaveAnalysis | null>(null)

    // Head to Head
    const [headToHead, setHeadToHead] = useState<H2HType | null>(null)
    const [h2hLoading, setH2hLoading] = useState(false)

    // News
    const [homeNews, setHomeNews] = useState<NewsImpactItem[]>([])
    const [awayNews, setAwayNews] = useState<NewsImpactItem[]>([])

    // Loading States
    const [loading, setLoading] = useState(false)
    const [dataLoading, setDataLoading] = useState(false)
    const [lastCalculatedParams, setLastCalculatedParams] = useState<string>('')

    // Load Teams when leagues change
    useEffect(() => {
        setLeaguesLoading(true)
        api.getTeamsByLeagues(selectedLeagues).then(t => {
            setTeams(t)
            setLeaguesLoading(false)
            // Reset team selection if current teams not in new league
            if (params.homeTeam && !t.includes(params.homeTeam)) {
                setParamsState(p => ({ ...p, homeTeam: '' }))
            }
            if (params.awayTeam && !t.includes(params.awayTeam)) {
                setParamsState(p => ({ ...p, awayTeam: '' }))
            }
        })
    }, [selectedLeagues])

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

            setParamsState(p => ({
                ...p,
                homeXG: Number(naiveHomeXG.toFixed(2)),
                awayXG: Number(naiveAwayXG.toFixed(2))
            }))

            // Prepare Trajectory Data using Rolling Average
            const homeGeoPoints = calculateRollingAverage(homeStats.recentMatches, params.homeTeam, 5)
            const awayGeoPoints = calculateRollingAverage(awayStats.recentMatches, params.awayTeam, 5)

            setHomeTrajectory(homeGeoPoints)
            setAwayTrajectory(awayGeoPoints)
            setSimulationCloud([])
            setDataLoading(false)
        }
        updateStats()
    }, [params.homeTeam, params.awayTeam])

    // Actions
    const setParams = useCallback((newParams: Partial<MatchParams>) => {
        setParamsState(p => ({ ...p, ...newParams }))
    }, [])

    const toggleLeague = useCallback((league: LeagueCode) => {
        setSelectedLeagues(prev => {
            if (prev.includes(league)) {
                if (prev.length > 1) {
                    return prev.filter(l => l !== league)
                }
                return prev
            } else {
                if (prev.length < 3) {
                    return [...prev, league]
                }
                return prev
            }
        })
    }, [])

    const handleCalculate = useCallback(async () => {
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

            // Add prediction point to home trajectory
            const listTime = (t: PhasePoint[]) => t.length > 0 ? t[t.length - 1].time : 0
            const predictionMean: PhasePoint = {
                time: listTime(homeTrajectory) + 1,
                x: prediction.adjustedHomeXG,
                y: prediction.adjustedAwayXG,
                className: "prediction"
            }
            const cleanHomeHistory = homeTrajectory.filter((p: PhasePoint) => p.className !== 'prediction')
            setHomeTrajectory([...cleanHomeHistory, predictionMean])

            // Save to Database ONLY if it's a new calculation
            const currentParamKey = `${params.homeTeam}-${params.awayTeam}-${params.homeXG}-${params.awayXG}`
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
    }, [params, homeNews, awayNews, homeTrajectory, lastCalculatedParams])

    const handleReset = useCallback(() => {
        if (results && !window.confirm('Sei sicuro di voler cancellare l\'analisi attuale?')) return

        setParamsState(initialParams)
        setResults(null)
        setHomeTrajectory([])
        setAwayTrajectory([])
        setSimulationCloud([])
        setHomeWaveAnalysis(null)
        setAwayWaveAnalysis(null)
        setHeadToHead(null)
        setLastCalculatedParams('')
    }, [results])

    return {
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
    }
}
