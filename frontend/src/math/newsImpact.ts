/**
 * NEWS IMPACT ENGINE
 * Converts scraped news into correction factors for the prediction model.
 * Applies exponential decay based on news age and weighs by source reliability.
 */

export interface NewsImpactItem {
    teamName: string;
    category: 'injury' | 'suspension' | 'coach_change' | 'form' | 'motivation' | 'transfer' | 'other';
    playerName?: string;
    playerRole?: 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'coach';
    sentiment: number;          // -1 to +1
    sourceReliability: number;  // 0 to 1
    publishedAt: Date;
    rawText?: string;
}

export interface TeamNewsImpact {
    teamName: string;
    attackModifier: number;     // Multiplier for λ attack (e.g., 0.85 = -15%)
    defenseModifier: number;    // Multiplier for λ defense
    overallModifier: number;    // Combined effect on xG
    confidence: number;         // How confident we are in this adjustment
    factors: string[];          // Human-readable explanations
}

// Impact lookup table based on player role and injury
const ROLE_IMPACT: Record<string, { attack: number; defense: number }> = {
    'forward_out': { attack: -0.15, defense: 0 },
    'midfielder_out': { attack: -0.08, defense: -0.05 },
    'defender_out': { attack: 0, defense: -0.12 },
    'goalkeeper_out': { attack: 0, defense: -0.20 },
    'coach_change': { attack: -0.10, defense: -0.10 },
    'winning_streak': { attack: 0.05, defense: 0.03 },
    'losing_streak': { attack: -0.05, defense: -0.08 },
    'derby_motivation': { attack: 0.08, defense: 0.05 },
    'nothing_to_play_for': { attack: -0.05, defense: -0.05 },
};

/**
 * Calculate exponential decay factor based on news age
 * @param publishedAt When the news was published
 * @param halfLifeHours Time (in hours) for effect to halve (default: 48h)
 * @returns Decay factor between 0 and 1
 */
export function calculateDecay(publishedAt: Date, halfLifeHours: number = 48): number {
    const now = new Date();
    const ageHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

    // Exponential decay: factor = 0.5^(age/halfLife)
    return Math.pow(0.5, ageHours / halfLifeHours);
}

/**
 * Calculate impact of a single news item
 * @param news The news item to process
 * @returns Attack and defense modifiers
 */
export function calculateSingleNewsImpact(news: NewsImpactItem): { attack: number; defense: number; factor: string } {
    const decay = calculateDecay(news.publishedAt);
    const reliability = news.sourceReliability;

    let baseImpact = { attack: 0, defense: 0 };
    let factorDescription = '';

    // Determine base impact from category and role
    if (news.category === 'injury' || news.category === 'suspension') {
        const key = `${news.playerRole}_out`;
        if (ROLE_IMPACT[key]) {
            baseImpact = ROLE_IMPACT[key];
            factorDescription = `${news.playerName || 'Key player'} (${news.playerRole}) unavailable`;
        }
    } else if (news.category === 'coach_change') {
        baseImpact = ROLE_IMPACT['coach_change'];
        factorDescription = 'Recent coach change';
    } else if (news.category === 'form') {
        if (news.sentiment > 0.3) {
            baseImpact = ROLE_IMPACT['winning_streak'];
            factorDescription = 'Positive form/momentum';
        } else if (news.sentiment < -0.3) {
            baseImpact = ROLE_IMPACT['losing_streak'];
            factorDescription = 'Negative form/crisis';
        }
    } else if (news.category === 'motivation') {
        if (news.sentiment > 0) {
            baseImpact = ROLE_IMPACT['derby_motivation'];
            factorDescription = 'High motivation match';
        } else {
            baseImpact = ROLE_IMPACT['nothing_to_play_for'];
            factorDescription = 'Low stakes match';
        }
    }

    // Apply decay and reliability weighting
    const weightedAttack = baseImpact.attack * decay * reliability;
    const weightedDefense = baseImpact.defense * decay * reliability;

    return {
        attack: weightedAttack,
        defense: weightedDefense,
        factor: factorDescription ? `${factorDescription} (${(decay * 100).toFixed(0)}% weight)` : ''
    };
}

/**
 * Aggregate multiple news items into team impact
 * @param newsItems All news items for a team
 * @returns Aggregated team impact
 */
export function calculateTeamNewsImpact(newsItems: NewsImpactItem[]): TeamNewsImpact {
    if (!newsItems || newsItems.length === 0) {
        return {
            teamName: '',
            attackModifier: 1.0,
            defenseModifier: 1.0,
            overallModifier: 1.0,
            confidence: 0,
            factors: []
        };
    }

    const teamName = newsItems[0].teamName;
    let totalAttackMod = 0;
    let totalDefenseMod = 0;
    const factors: string[] = [];

    // Sum all individual impacts
    for (const news of newsItems) {
        const impact = calculateSingleNewsImpact(news);
        totalAttackMod += impact.attack;
        totalDefenseMod += impact.defense;
        if (impact.factor) {
            factors.push(impact.factor);
        }
    }

    // Convert additive modifiers to multiplicative (1 + sum)
    // Cap at ±30% total adjustment
    const cappedAttack = Math.max(-0.30, Math.min(0.30, totalAttackMod));
    const cappedDefense = Math.max(-0.30, Math.min(0.30, totalDefenseMod));

    const attackModifier = 1 + cappedAttack;
    const defenseModifier = 1 + cappedDefense;

    // Overall is the geometric mean of attack and defense
    const overallModifier = Math.sqrt(attackModifier * defenseModifier);

    // Confidence based on number & recency of news
    const avgDecay = newsItems.reduce((sum, n) => sum + calculateDecay(n.publishedAt), 0) / newsItems.length;
    const confidence = Math.min(1, newsItems.length * 0.15) * avgDecay;

    return {
        teamName,
        attackModifier,
        defenseModifier,
        overallModifier,
        confidence,
        factors
    };
}

/**
 * Apply news impact to expected goals
 * @param baseXG Original expected goals
 * @param newsImpact Calculated news impact for the team
 * @returns Adjusted expected goals
 */
export function applyNewsImpactToXG(baseXG: number, newsImpact: TeamNewsImpact): number {
    return baseXG * newsImpact.attackModifier;
}
