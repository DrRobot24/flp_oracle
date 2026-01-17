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
    gg: number;           // Both teams score
    over25: number;       // Total goals > 2.5
    over15: number;       // Total goals > 1.5
    under25: number;      // Total goals < 2.5
    scoreMatrix?: number[][]; // [homeGoals][awayGoals] (Optional now)
    homeTeam?: string; // Optional context
    awayTeam?: string; // Optional context
}

export class PoissonModel {
    private maxGoals = 10; // Cap calculation at 10 goals for performance

    /**
     * Calculate all match probabilities from expected goals
     * @param homeXG Expected goals for home team
     * @param awayXG Expected goals for away team
     * @returns Complete probability breakdown including 1X2, GG, Over/Under
     */
    calculate(homeXG: number, awayXG: number): MatchProbabilities {
        const matrix: number[][] = [];
        let homeWin = 0;
        let draw = 0;
        let awayWin = 0;
        let gg = 0;         // Both teams score (home >= 1 AND away >= 1)
        let over25 = 0;     // Total > 2.5 (home + away >= 3)
        let over15 = 0;     // Total > 1.5 (home + away >= 2)

        for (let h = 0; h <= this.maxGoals; h++) {
            matrix[h] = [];
            const probHome = poissonProbability(h, homeXG);

            for (let a = 0; a <= this.maxGoals; a++) {
                const probAway = poissonProbability(a, awayXG);
                const probScore = probHome * probAway;

                matrix[h][a] = probScore;

                // 1X2 calculation
                if (h > a) homeWin += probScore;
                else if (h === a) draw += probScore;
                else awayWin += probScore;

                // GG (Goal-Goal): Both teams must score at least 1
                if (h >= 1 && a >= 1) {
                    gg += probScore;
                }

                // Over 2.5: Total goals >= 3
                if (h + a >= 3) {
                    over25 += probScore;
                }

                // Over 1.5: Total goals >= 2
                if (h + a >= 2) {
                    over15 += probScore;
                }
            }
        }

        // Normalize (since we capped at maxGoals, sum might be < 1)
        const totalProb = homeWin + draw + awayWin;

        return {
            homeWin: homeWin / totalProb,
            draw: draw / totalProb,
            awayWin: awayWin / totalProb,
            gg: gg / totalProb,
            over25: over25 / totalProb,
            over15: over15 / totalProb,
            under25: 1 - (over25 / totalProb),
            scoreMatrix: matrix
        };
    }

    /**
     * Calculate probability for any Over/Under threshold
     * @param matrix Pre-calculated score matrix
     * @param threshold Goal threshold (e.g., 2.5, 3.5)
     * @returns { over: probability, under: probability }
     */
    calculateOverUnder(matrix: number[][], threshold: number): { over: number; under: number } {
        let over = 0;
        let total = 0;

        for (let h = 0; h < matrix.length; h++) {
            for (let a = 0; a < matrix[h].length; a++) {
                const prob = matrix[h][a];
                total += prob;
                if (h + a > threshold) {
                    over += prob;
                }
            }
        }

        return {
            over: over / total,
            under: 1 - (over / total)
        };
    }
}
