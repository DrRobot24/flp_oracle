/**
 * FOURIER ENGINE
 * Applies Fast Fourier Transform (FFT) to discover hidden cycles in team form.
 * Inspired by techniques used in financial/crypto trading analysis.
 */

export interface FrequencyComponent {
    frequency: number;      // Cycles per N matches
    amplitude: number;      // Strength of this cycle
    phase: number;          // Where in the cycle we are (radians)
    period: number;         // How many matches per cycle
}

export interface WaveAnalysis {
    signal: number[];                   // Original form signal
    reconstructed: number[];            // Wave reconstructed from top frequencies
    dominantFrequencies: FrequencyComponent[];
    waveDirection: 'RISING' | 'FALLING' | 'NEUTRAL';
    momentum: number;                   // -1 to +1
}

/**
 * Simple DFT (Discrete Fourier Transform) implementation.
 * For larger datasets, use FFT library for O(n log n) performance.
 */
export function dft(signal: number[]): { real: number[], imag: number[] } {
    const N = signal.length;
    const real: number[] = new Array(N).fill(0);
    const imag: number[] = new Array(N).fill(0);

    for (let k = 0; k < N; k++) {
        for (let n = 0; n < N; n++) {
            const angle = (2 * Math.PI * k * n) / N;
            real[k] += signal[n] * Math.cos(angle);
            imag[k] -= signal[n] * Math.sin(angle);
        }
    }

    return { real, imag };
}

/**
 * Inverse DFT - Reconstruct signal from frequency components
 */
export function idft(real: number[], imag: number[]): number[] {
    const N = real.length;
    const signal: number[] = new Array(N).fill(0);

    for (let n = 0; n < N; n++) {
        for (let k = 0; k < N; k++) {
            const angle = (2 * Math.PI * k * n) / N;
            signal[n] += real[k] * Math.cos(angle) - imag[k] * Math.sin(angle);
        }
        signal[n] /= N;
    }

    return signal;
}

/**
 * Convert match results to a numerical signal.
 * Win = +1, Draw = 0, Loss = -1
 */
export function matchesToSignal(
    matches: Array<{ home_team: string; away_team: string; home_goals: number; away_goals: number }>,
    teamName: string
): number[] {
    return matches.map(m => {
        const isHome = m.home_team === teamName;
        const teamGoals = isHome ? m.home_goals : m.away_goals;
        const oppGoals = isHome ? m.away_goals : m.home_goals;

        if (teamGoals > oppGoals) return 1;       // Win
        if (teamGoals < oppGoals) return -1;      // Loss
        return 0;                                  // Draw
    });
}

/**
 * Analyze form wave using Fourier Transform
 */
export function analyzeFormWave(signal: number[], topN: number = 3): WaveAnalysis {
    if (signal.length < 4) {
        return {
            signal,
            reconstructed: signal,
            dominantFrequencies: [],
            waveDirection: 'NEUTRAL',
            momentum: 0
        };
    }

    // 1. Compute DFT
    const { real, imag } = dft(signal);
    const N = signal.length;

    // 2. Calculate amplitudes and phases
    const frequencies: FrequencyComponent[] = [];
    for (let k = 1; k < Math.floor(N / 2); k++) { // Skip DC component (k=0)
        const amplitude = Math.sqrt(real[k] ** 2 + imag[k] ** 2) / N;
        const phase = Math.atan2(imag[k], real[k]);
        const period = N / k;

        frequencies.push({
            frequency: k,
            amplitude,
            phase,
            period
        });
    }

    // 3. Sort by amplitude and take top N
    frequencies.sort((a, b) => b.amplitude - a.amplitude);
    const dominant = frequencies.slice(0, topN);

    // 4. Reconstruct signal from dominant frequencies only
    const reconstructedReal = new Array(N).fill(0);
    const reconstructedImag = new Array(N).fill(0);

    // Add DC component (average)
    reconstructedReal[0] = real[0];

    // Add dominant frequencies
    dominant.forEach(f => {
        reconstructedReal[f.frequency] = real[f.frequency];
        reconstructedImag[f.frequency] = imag[f.frequency];
    });

    const reconstructed = idft(reconstructedReal, reconstructedImag);

    // 5. Determine wave direction (is it rising or falling?)
    const lastValue = reconstructed[reconstructed.length - 1];
    const prevValue = reconstructed[reconstructed.length - 2];
    const delta = lastValue - prevValue;

    let waveDirection: 'RISING' | 'FALLING' | 'NEUTRAL' = 'NEUTRAL';
    if (delta > 0.1) waveDirection = 'RISING';
    else if (delta < -0.1) waveDirection = 'FALLING';

    // 6. Momentum: -1 to +1 based on recent trend
    const momentum = Math.max(-1, Math.min(1, delta * 2));

    return {
        signal,
        reconstructed,
        dominantFrequencies: dominant,
        waveDirection,
        momentum
    };
}

/**
 * Predict next point in the wave based on dominant frequencies
 */
export function predictNextWavePoint(analysis: WaveAnalysis): number {
    const N = analysis.signal.length;
    let prediction = 0;

    // Reconstruct next point using dominant frequencies
    analysis.dominantFrequencies.forEach(f => {
        const angle = (2 * Math.PI * f.frequency * N) / analysis.signal.length;
        prediction += f.amplitude * Math.cos(angle + f.phase);
    });

    // Add DC component (average of signal)
    const average = analysis.signal.reduce((a, b) => a + b, 0) / N;
    prediction += average;

    return prediction;
}
