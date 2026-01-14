import { factorial } from 'mathjs';

// Basic Poisson Probability Function
// P(k; λ) = (λ^k * e^-λ) / k!
export function poissonProbability(k: number, lambda: number): number {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / Number(factorial(k));
}

export interface MatchProbabilities {
    homeWin: number;
    draw: number;
    awayWin: number;
    scoreMatrix?: number[][]; // [homeGoals][awayGoals] (Optional now)
    homeTeam?: string; // Optional context
    awayTeam?: string; // Optional context
}

export class PoissonModel {
    private maxGoals = 10; // Cap calculation at 10 goals for performance

    calculate(homeXG: number, awayXG: number): MatchProbabilities {
        const matrix: number[][] = [];
        let homeWin = 0;
        let draw = 0;
        let awayWin = 0;

        for (let h = 0; h <= this.maxGoals; h++) {
            matrix[h] = [];
            const probHome = poissonProbability(h, homeXG);

            for (let a = 0; a <= this.maxGoals; a++) {
                const probAway = poissonProbability(a, awayXG);
                const probScore = probHome * probAway;

                matrix[h][a] = probScore;

                if (h > a) homeWin += probScore;
                else if (h === a) draw += probScore;
                else awayWin += probScore;
            }
        }

        // Normalize (since we capped at maxGoals, sum might be < 1)
        const totalProb = homeWin + draw + awayWin;

        return {
            homeWin: homeWin / totalProb,
            draw: draw / totalProb,
            awayWin: awayWin / totalProb,
            scoreMatrix: matrix
        };
    }
}
