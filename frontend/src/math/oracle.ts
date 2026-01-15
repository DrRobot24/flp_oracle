import { PoissonModel, MatchProbabilities } from './poisson';
import { GeometricEngine, PhasePoint } from './geometric';
import { analyzeFormWave, matchesToSignal } from './fourier';

export interface OraclePrediction extends MatchProbabilities {
    confidence: number;
    adjustedHomeXG: number;
    adjustedAwayXG: number;
    homeMomentum: number;
    awayMomentum: number;
    explanation: string[];
    simulationCloud: PhasePoint[]; // Added to share with UI
}

export class OracleIntegrator {
    private poisson = new PoissonModel();
    private geo = new GeometricEngine();

    async calculate(
        homeTeam: string,
        awayTeam: string,
        baseHomeXG: number,
        baseAwayXG: number,
        homeHistory: any[],
        awayHistory: any[]
    ): Promise<OraclePrediction> {
        const explanation: string[] = [];

        // 1. Fourier Momentum Analysis
        const homeSignal = matchesToSignal(homeHistory, homeTeam);
        const awaySignal = matchesToSignal(awayHistory, awayTeam);

        const homeWave = analyzeFormWave(homeSignal, 3);
        const awayWave = analyzeFormWave(awaySignal, 3);

        // Momentum ranges from -1 to 1. We'll use it to shift xG by up to 20%
        const MOMENTUM_INFLUENCE = 0.2;
        const homeMomentumShift = homeWave.momentum * MOMENTUM_INFLUENCE;
        const awayMomentumShift = awayWave.momentum * MOMENTUM_INFLUENCE;

        let adjHomeXG = baseHomeXG * (1 + homeMomentumShift);
        let adjAwayXG = baseAwayXG * (1 + awayMomentumShift);

        explanation.push(`Fourier Analysis: ${homeTeam} momentum ${homeWave.momentum > 0 ? 'Positive' : 'Negative'} (${(homeWave.momentum * 100).toFixed(0)}%)`);
        explanation.push(`Fourier Analysis: ${awayTeam} momentum ${awayWave.momentum > 0 ? 'Positive' : 'Negative'} (${(awayWave.momentum * 100).toFixed(0)}%)`);

        // 2. Geometric Trend Analysis (Phase Space)
        // We look at the velocity in the last few steps
        const homePoints: PhasePoint[] = homeHistory.map((m, i) => ({
            time: i,
            x: m.home_team === homeTeam ? m.home_goals : m.away_goals,
            y: m.home_team === homeTeam ? m.away_goals : m.home_goals
        }));

        if (homePoints.length >= 2) {
            const last = homePoints[homePoints.length - 1];
            const prev = homePoints[homePoints.length - 2];
            const velocity = last.x - prev.x; // Positive = improving attack

            // Geometric shift (max 10%)
            const geoShift = velocity * 0.1;
            adjHomeXG += geoShift;
            explanation.push(`Geometric Trend: ${homeTeam} attack velocity is ${velocity > 0 ? 'increasing' : 'decreasing'}.`);
        }

        // 3. Monte Carlo Confidence
        // We run a mini-simulation to see the variance
        const iterations = 200;
        const simulations = this.geo.runMonteCarloSimulation(homePoints, iterations);

        // Calculate variance (standard deviation) of simulations
        const meanX = simulations.reduce((sum, p) => sum + p.x, 0) / iterations;
        const variance = simulations.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0) / iterations;
        const stdDev = Math.sqrt(variance);

        // Confidence is inversely proportional to stdDev
        // Low stdDev (consistent results) -> High confidence
        const confidence = Math.max(0, Math.min(1, 1 - (stdDev / 2)));
        explanation.push(`Volatility Score: ${stdDev.toFixed(2)} (Confidence: ${(confidence * 100).toFixed(0)}%)`);

        // 4. Final Poisson Calculation
        const finalProbs = this.poisson.calculate(Math.max(0, adjHomeXG), Math.max(0, adjAwayXG));

        return {
            ...finalProbs,
            confidence,
            adjustedHomeXG: adjHomeXG,
            adjustedAwayXG: adjAwayXG,
            homeMomentum: homeWave.momentum,
            awayMomentum: awayWave.momentum,
            explanation,
            simulationCloud: simulations // Return simulations for UI
        };
    }
}
