/**
 * GEOMETRIC ENGINE
 * Manages the "Phase Space" of a team or match.
 * Concept: Teams move in a multi-dimensional space (xG, Form, Defensive Solidity).
 * The trajectory in this space determines the likely future outcome.
 */

export interface PhasePoint {
    time: number; // Match index (0 = oldest, N = latest)
    x: number; // e.g., Offensive Strength (Rolling xG For)
    y: number; // e.g., Defensive Weakness (Rolling xG Against)
    z?: number; // Optional 3rd dimension (Stability/Form)
    className?: string; // For UI styling purposes
}

/**
 * Seeded random number generator (Mulberry32)
 * Provides deterministic random numbers for reproducible simulations
 */
function mulberry32(seed: number): () => number {
    return function () {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export class GeometricEngine {
    private rng: () => number;
    private seed: number | null = null;

    constructor(seed?: number) {
        if (seed !== undefined) {
            this.seed = seed;
            this.rng = mulberry32(seed);
        } else {
            this.rng = Math.random;
        }
    }

    /**
     * Reset the RNG with a new seed for reproducible results
     */
    setSeed(seed: number): void {
        this.seed = seed;
        this.rng = mulberry32(seed);
    }

    /**
     * Get current seed (null if using Math.random)
     */
    getSeed(): number | null {
        return this.seed;
    }

    // Calculate the 'velocity' vector between two points (trend)
    calculateVelocity(p1: PhasePoint, p2: PhasePoint): { vx: number, vy: number } {
        return {
            vx: p2.x - p1.x,
            vy: p2.y - p1.y
        };
    }

    // Calculate curvature (change in direction)
    // Helps identify "Inversion Points" (e.g. team stopping a bad streak)
    calculateCurvature(p1: PhasePoint, p2: PhasePoint, p3: PhasePoint): number {
        // Simplified 2D curvature estimation based on angle change
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
        const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);

        if (mag1 === 0 || mag2 === 0) return 0;

        // Clamp value for acos
        const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        return Math.acos(cosTheta); // Returns angle in radians
    }

    // Predict next position based on recent trajectory (Linear + Momentum)
    predictNextState(history: PhasePoint[]): PhasePoint {
        if (history.length < 2) return history[history.length - 1];

        const last = history[history.length - 1];
        const prev = history[history.length - 2];

        // Simple momentum projection
        const vx = last.x - prev.x;
        const vy = last.y - prev.y;

        // Apply a "Damping" factor (trends don't last forever)
        const damping = 0.9;

        return {
            time: last.time + 1,
            x: last.x + (vx * damping),
            y: last.y + (vy * damping)
        };
    }

    /**
     * Generates a synthetic "past" trajectory that leads to the current state.
     * Useful for visualizing the "Momentum" when we only have the current snapshot.
     */
    generateSyntheticHistory(currentOffensive: number, currentDefensive: number, steps: number = 5): PhasePoint[] {
        const history: PhasePoint[] = [];
        // We work backwards: current state is the last point

        let cx = currentOffensive;
        let cy = currentDefensive;

        // Add some random noise to simulate 'form' fluctuations
        const volatility = 0.2;

        for (let i = 0; i < steps; i++) {
            history.unshift({
                time: steps - i, // 5, 4, 3...
                x: cx,
                y: cy
            });

            // Perturb previous state slightly to create a path
            // Use seeded RNG for reproducibility
            cx = cx - (this.rng() - 0.4) * volatility;
            cy = cy - (this.rng() - 0.6) * volatility;
        }

        return history;
    }

    // Helper: Generate Gaussian Random (Box-Muller transform) using seeded RNG
    private gaussianRandom(mean = 0, stdev = 1): number {
        const u = 1 - this.rng(); // Converting [0,1) to (0,1]
        const v = this.rng();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdev + mean;
    }

    // Calculate historical volatility (standard deviation of step sizes)
    calculateVolatility(history: PhasePoint[]): { volX: number, volY: number } {
        if (history.length < 2) return { volX: 0.5, volY: 0.5 }; // Default fallback

        const changesX: number[] = [];
        const changesY: number[] = [];

        for (let i = 1; i < history.length; i++) {
            changesX.push(history[i].x - history[i - 1].x);
            changesY.push(history[i].y - history[i - 1].y);
        }

        // Std Dev calculation
        const meanX = changesX.reduce((a, b) => a + b, 0) / changesX.length;
        const meanY = changesY.reduce((a, b) => a + b, 0) / changesY.length;

        const varianceX = changesX.reduce((a, b) => a + Math.pow(b - meanX, 2), 0) / changesX.length;
        const varianceY = changesY.reduce((a, b) => a + Math.pow(b - meanY, 2), 0) / changesY.length;

        return {
            volX: Math.sqrt(varianceX),
            volY: Math.sqrt(varianceY)
        };
    }

    /**
     * Run Monte Carlo Simulation
     * Generates N potential future states based on historical trend + volatility.
     * Results are reproducible if a seed was provided to the constructor.
     */
    runMonteCarloSimulation(history: PhasePoint[], iterations: number = 500): PhasePoint[] {
        if (history.length < 2) return [];

        const last = history[history.length - 1];
        const prev = history[history.length - 2];

        // 1. Determine Base Trend (Velocity)
        // We use a weighted average or just the last step. Let's use last step for momentum.
        const vx = last.x - prev.x;
        const vy = last.y - prev.y;

        // 2. Determine Volatility (Risk/Uncertainty)
        const { volX, volY } = this.calculateVolatility(history);

        const simulations: PhasePoint[] = [];

        // 3. Simulate N futures (using seeded RNG for reproducibility)
        for (let i = 0; i < iterations; i++) {
            // Apply Damping to the mean trend (mean reversion)
            const damping = 0.9;
            const meanMoveX = vx * damping;
            const meanMoveY = vy * damping;

            // Add Random Gaussian Noise based on team's volatility
            const noiseX = this.gaussianRandom(0, volX);
            const noiseY = this.gaussianRandom(0, volY);

            simulations.push({
                time: last.time + 1,
                x: last.x + meanMoveX + noiseX,
                y: last.y + meanMoveY + noiseY,
                className: "simulation_cloud" // Special class for rendering opacity
            });
        }

        return simulations;
    }
}
