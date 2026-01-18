/**
 * ORACLE INTEGRATOR v2.0
 * Unified prediction engine combining Fourier, Poisson, and Monte Carlo algorithms
 * with geometric ensemble and news impact integration.
 */

import { PoissonModel, MatchProbabilities } from './poisson';
import { GeometricEngine, PhasePoint } from './geometric';
import { analyzeFormWave, matchesToSignal, WaveAnalysis } from './fourier';
import { calculateTeamNewsImpact, NewsImpactItem } from './newsImpact';

// Full prediction output matching the desired JSON format
export interface OraclePrediction {
    match: string;
    date: string;
    predictions: {
        '1X2': {
            home_win: number;
            draw: number;
            away_win: number;
            confidence: number;
        };
        'GG': {
            yes: number;
            no: number;
            confidence: number;
        };
        'over_2.5': {
            yes: number;
            no: number;
            confidence: number;
        };
    };
    contributing_factors: {
        fourier_weight: number;
        poisson_weight: number;
        montecarlo_weight: number;
        news_impact: {
            home: number;
            away: number;
        };
    };
    // Extended data for UI
    adjustedHomeXG: number;
    adjustedAwayXG: number;
    homeMomentum: number;
    awayMomentum: number;
    explanation: string[];
    simulationCloud?: PhasePoint[];
    rawProbabilities?: MatchProbabilities;
}

// Legacy interface for backward compatibility
export interface LegacyOraclePrediction extends MatchProbabilities {
    confidence: number;
    adjustedHomeXG: number;
    adjustedAwayXG: number;
    homeMomentum: number;
    awayMomentum: number;
    explanation: string[];
    simulationCloud: PhasePoint[];
}

// Configuration interface (matches settings.yaml structure)
interface EnsembleConfig {
    method: 'linear' | 'geometric' | 'bayesian';
    confidenceWeighted: boolean;
    baseWeights: {
        fourier: number;
        poisson: number;
        montecarlo: number;
    };
    momentumInfluence: number;
    velocityInfluence: number;
    monteCarloIterations: number;
    homeAdvantageFactor: number; // Factor to multiply home xG (e.g. 1.10 = +10%)
}

// Default configuration (can be overridden)
const DEFAULT_CONFIG: EnsembleConfig = {
    method: 'geometric',
    confidenceWeighted: true,
    baseWeights: {
        fourier: 0.25,
        poisson: 0.45,
        montecarlo: 0.30
    },
    momentumInfluence: 0.20,
    velocityInfluence: 0.10,
    monteCarloIterations: 500,
    homeAdvantageFactor: 1.10 // 10% base advantage for home team
};

export class OracleIntegrator {
    private poisson = new PoissonModel();
    private config: EnsembleConfig;

    constructor(config?: Partial<EnsembleConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Generate a deterministic seed from match parameters
     * Same inputs always produce the same seed = reproducible results
     */
    private generateSeed(homeTeam: string, awayTeam: string, homeXG: number, awayXG: number): number {
        const str = `${homeTeam}|${awayTeam}|${homeXG.toFixed(2)}|${awayXG.toFixed(2)}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Main prediction method - returns full structured output
     */
    async predict(
        homeTeam: string,
        awayTeam: string,
        baseHomeXG: number,
        baseAwayXG: number,
        homeHistory: any[],
        awayHistory: any[],
        homeNews: NewsImpactItem[] = [],
        awayNews: NewsImpactItem[] = [],
        matchDate?: string
    ): Promise<OraclePrediction> {
        const explanation: string[] = [];

        // ============================================
        // STEP 1: Fourier Momentum Analysis
        // ============================================
        const homeSignal = matchesToSignal(homeHistory, homeTeam);
        const awaySignal = matchesToSignal(awayHistory, awayTeam);

        const homeWave = analyzeFormWave(homeSignal, 3);
        const awayWave = analyzeFormWave(awaySignal, 3);

        const homeFourierConf = this.calculateFourierConfidence(homeWave);
        const awayFourierConf = this.calculateFourierConfidence(awayWave);
        const avgFourierConf = (homeFourierConf + awayFourierConf) / 2;

        explanation.push(`📊 Fourier: ${homeTeam} momentum ${homeWave.momentum > 0 ? '📈' : '📉'} ${(homeWave.momentum * 100).toFixed(0)}% (conf: ${(homeFourierConf * 100).toFixed(0)}%)`);
        explanation.push(`📊 Fourier: ${awayTeam} momentum ${awayWave.momentum > 0 ? '📈' : '📉'} ${(awayWave.momentum * 100).toFixed(0)}% (conf: ${(awayFourierConf * 100).toFixed(0)}%)`);

        // ============================================
        // STEP 2: News Impact
        // ============================================
        const homeNewsImpact = calculateTeamNewsImpact(homeNews);
        const awayNewsImpact = calculateTeamNewsImpact(awayNews);

        if (homeNewsImpact.factors.length > 0) {
            explanation.push(`📰 ${homeTeam} news factors: ${homeNewsImpact.factors.join(', ')}`);
        }
        if (awayNewsImpact.factors.length > 0) {
            explanation.push(`📰 ${awayTeam} news factors: ${awayNewsImpact.factors.join(', ')}`);
        }

        // ============================================
        // STEP 3: XG Adjustments (Geometric Combination)
        // ============================================
        // Fourier adjustment: momentum * influence
        const homeMomentumFactor = 1 + (homeWave.momentum * this.config.momentumInfluence);
        const awayMomentumFactor = 1 + (awayWave.momentum * this.config.momentumInfluence);

        // News adjustment
        const homeNewsFactor = homeNewsImpact.attackModifier;
        const awayNewsFactor = awayNewsImpact.attackModifier;

        // Multiplicative combinations (Geometric)
        let adjHomeXG = baseHomeXG * homeMomentumFactor * homeNewsFactor;
        let adjAwayXG = baseAwayXG * awayMomentumFactor * awayNewsFactor;

        // Apply Home Advantage Factor (Explicit Venue Logic)
        adjHomeXG *= this.config.homeAdvantageFactor;
        explanation.push(`🏠 Home Venue Advantage applied: +${((this.config.homeAdvantageFactor - 1) * 100).toFixed(0)}% to ${homeTeam}`);

        // ============================================
        // STEP 4: Geometric Velocity Analysis
        // ============================================
        const homePoints: PhasePoint[] = homeHistory.map((m, i) => ({
            time: i,
            x: m.home_team === homeTeam ? m.home_goals : m.away_goals,
            y: m.home_team === homeTeam ? m.away_goals : m.home_goals
        }));

        // Initialize seeded geometric engine
        const seed = this.generateSeed(homeTeam, awayTeam, baseHomeXG, baseAwayXG);
        const geo = new GeometricEngine(seed);

        let geometricConf = 0.5; // Default confidence

        if (homePoints.length >= 2) {
            const last = homePoints[homePoints.length - 1];
            const prev = homePoints[homePoints.length - 2];
            const velocity = last.x - prev.x;

            const velocityFactor = 1 + (velocity * this.config.velocityInfluence);
            adjHomeXG *= velocityFactor;

            // Calculate geometric confidence from trajectory stability
            if (homePoints.length >= 3) {
                const curvature = geo.calculateCurvature(
                    homePoints[homePoints.length - 3],
                    homePoints[homePoints.length - 2],
                    homePoints[homePoints.length - 1]
                );
                // Lower curvature = more stable trajectory = higher confidence
                geometricConf = Math.max(0.3, 1 - (curvature / Math.PI));
            }

            explanation.push(`🔷 Geometric: ${homeTeam} velocity ${velocity > 0 ? 'increasing' : 'decreasing'} (conf: ${(geometricConf * 100).toFixed(0)}%)`);
        }

        // ============================================
        // STEP 5: Monte Carlo Simulation
        // ============================================
        const simulations = geo.runMonteCarloSimulation(homePoints, this.config.monteCarloIterations);

        // Calculate Monte Carlo statistics
        const meanX = simulations.length > 0
            ? simulations.reduce((sum: number, p: PhasePoint) => sum + p.x, 0) / simulations.length
            : adjHomeXG;
        const variance = simulations.length > 0
            ? simulations.reduce((sum: number, p: PhasePoint) => sum + Math.pow(p.x - meanX, 2), 0) / simulations.length
            : 1;
        const stdDev = Math.sqrt(variance);

        // Monte Carlo confidence: inversely proportional to volatility
        const mcConfidence = Math.max(0.2, Math.min(0.95, 1 - (stdDev / 3)));

        explanation.push(`🎲 Monte Carlo: Volatility ${stdDev.toFixed(2)}, Confidence ${(mcConfidence * 100).toFixed(0)}%`);

        // ============================================
        // STEP 6: Poisson Probability Calculation
        // ============================================
        // Ensure xG values are positive
        adjHomeXG = Math.max(0.1, adjHomeXG);
        adjAwayXG = Math.max(0.1, adjAwayXG);

        const rawProbs = this.poisson.calculate(adjHomeXG, adjAwayXG);

        // ============================================
        // STEP 7: Ensemble Confidence Calculation
        // ============================================
        const { finalWeights, overallConfidence } = this.calculateEnsembleWeights(
            avgFourierConf,
            1.0, // Poisson is deterministic, always "confident"
            mcConfidence,
            geometricConf
        );

        explanation.push(`⚙️ Ensemble weights: Fourier ${(finalWeights.fourier * 100).toFixed(0)}%, Poisson ${(finalWeights.poisson * 100).toFixed(0)}%, MC ${(finalWeights.montecarlo * 100).toFixed(0)}%`);

        // ============================================
        // STEP 8: Confidence Adjustments for Each Market
        // ============================================
        // 1X2 confidence: weighted by overall ensemble
        const conf1X2 = overallConfidence;

        // GG confidence: higher when both teams have attacking momentum
        const ggBaseConf = overallConfidence * 0.9;
        const ggConf = Math.min(0.95, ggBaseConf * (1 + Math.abs(homeWave.momentum + awayWave.momentum) * 0.1));

        // Over 2.5 confidence: based on xG totals
        const totalXG = adjHomeXG + adjAwayXG;
        const overConf = Math.min(0.95, overallConfidence * (0.8 + Math.min(0.2, totalXG * 0.05)));

        // ============================================
        // BUILD OUTPUT
        // ============================================
        return {
            match: `${homeTeam} vs ${awayTeam}`,
            date: matchDate || new Date().toISOString().split('T')[0],
            predictions: {
                '1X2': {
                    home_win: this.round(rawProbs.homeWin),
                    draw: this.round(rawProbs.draw),
                    away_win: this.round(rawProbs.awayWin),
                    confidence: this.round(conf1X2)
                },
                'GG': {
                    yes: this.round(rawProbs.gg),
                    no: this.round(1 - rawProbs.gg),
                    confidence: this.round(ggConf)
                },
                'over_2.5': {
                    yes: this.round(rawProbs.over25),
                    no: this.round(rawProbs.under25),
                    confidence: this.round(overConf)
                }
            },
            contributing_factors: {
                fourier_weight: this.round(finalWeights.fourier),
                poisson_weight: this.round(finalWeights.poisson),
                montecarlo_weight: this.round(finalWeights.montecarlo),
                news_impact: {
                    home: this.round(homeNewsImpact.overallModifier - 1),
                    away: this.round(awayNewsImpact.overallModifier - 1)
                }
            },
            adjustedHomeXG: this.round(adjHomeXG),
            adjustedAwayXG: this.round(adjAwayXG),
            homeMomentum: homeWave.momentum,
            awayMomentum: awayWave.momentum,
            explanation,
            simulationCloud: simulations,
            rawProbabilities: rawProbs
        };
    }

    /**
     * Legacy calculate method for backward compatibility
     */
    async calculate(
        homeTeam: string,
        awayTeam: string,
        baseHomeXG: number,
        baseAwayXG: number,
        homeHistory: any[],
        awayHistory: any[]
    ): Promise<LegacyOraclePrediction> {
        const result = await this.predict(
            homeTeam,
            awayTeam,
            baseHomeXG,
            baseAwayXG,
            homeHistory,
            awayHistory
        );

        // Convert to legacy format
        return {
            homeWin: result.predictions['1X2'].home_win,
            draw: result.predictions['1X2'].draw,
            awayWin: result.predictions['1X2'].away_win,
            gg: result.predictions['GG'].yes,
            over25: result.predictions['over_2.5'].yes,
            over15: result.rawProbabilities?.over15 || 0,
            under25: result.predictions['over_2.5'].no,
            confidence: result.predictions['1X2'].confidence,
            adjustedHomeXG: result.adjustedHomeXG,
            adjustedAwayXG: result.adjustedAwayXG,
            homeMomentum: result.homeMomentum,
            awayMomentum: result.awayMomentum,
            explanation: result.explanation,
            simulationCloud: result.simulationCloud || []
        };
    }

    /**
     * Calculate Fourier confidence based on wave analysis
     */
    private calculateFourierConfidence(wave: WaveAnalysis): number {
        if (wave.dominantFrequencies.length === 0) return 0.3;

        // Higher amplitude = more pronounced pattern = higher confidence
        const maxAmp = Math.max(...wave.dominantFrequencies.map(f => f.amplitude));
        const ampConfidence = Math.min(1, maxAmp * 2);

        // Consistent direction = higher confidence
        const directionConfidence = wave.waveDirection !== 'NEUTRAL' ? 0.8 : 0.5;

        return (ampConfidence + directionConfidence) / 2;
    }

    /**
     * Calculate ensemble weights based on individual algorithm confidences
     */
    private calculateEnsembleWeights(
        fourierConf: number,
        poissonConf: number,
        mcConf: number,
        geoConf: number
    ): { finalWeights: { fourier: number; poisson: number; montecarlo: number }; overallConfidence: number } {
        const base = this.config.baseWeights;

        if (!this.config.confidenceWeighted) {
            // Use base weights directly
            return {
                finalWeights: base,
                overallConfidence: (fourierConf + poissonConf + mcConf) / 3
            };
        }

        // Geometric method: multiply base weights by confidence
        const rawFourier = base.fourier * fourierConf;
        const rawPoisson = base.poisson * poissonConf;
        const rawMC = base.montecarlo * mcConf * geoConf; // Combine MC and Geo

        const total = rawFourier + rawPoisson + rawMC;

        const finalWeights = {
            fourier: rawFourier / total,
            poisson: rawPoisson / total,
            montecarlo: rawMC / total
        };

        // Overall confidence: weighted average of individual confidences
        const overallConfidence =
            finalWeights.fourier * fourierConf +
            finalWeights.poisson * poissonConf +
            finalWeights.montecarlo * (mcConf + geoConf) / 2;

        return { finalWeights, overallConfidence };
    }

    /**
     * Round to 3 decimal places
     */
    private round(value: number): number {
        return Math.round(value * 1000) / 1000;
    }
}
