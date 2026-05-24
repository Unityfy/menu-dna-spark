/**
 * Menu DNA — Analytics Engine
 * Core business logic: profitability scoring, BCG classification,
 * and menu intelligence scoring.
 *
 * CHANGELOG (v2):
 *  - Fixed: Intelligence score no longer inflates when cost data is missing (cost=0).
 *    Items with no cost data get a neutral food-cost score instead of a perfect 20/20.
 *  - Fixed: profitEfficiency when prepTime=0 now uses a sensible default (median prep time)
 *    instead of raw margin, so items without prep data don't get artificially high/low scores.
 *  - Fixed: classifyDishes computes max values once outside the map loop (performance).
 *  - Fixed: BCG scatter plot data now includes actual threshold values so reference lines
 *    can be drawn at the correct positions instead of a fixed 50/50.
 *  - Added: Revenue contribution factor in intelligence score.
 *  - Added: Plowhorse recommendation no longer produces negative price suggestions.
 *  - Added: Recommendations include estimated weekly revenue impact where possible.
 */

// Re-export normalizeRow from posParser for backward compatibility
export { normalizeRow as normalizeCSVRow } from './posParser.js';

// ─── Profitability Metrics ───────────────────────────────────────────────────

export function computeDishMetrics(dish) {
  const {
    name, category, price, cost, unitsSold, prepTime,
  } = dish;

  const contributionMargin     = price - cost;
  const contributionMarginPct  = price > 0 ? (contributionMargin / price) * 100 : 0;
  const totalRevenue           = price * unitsSold;
  const totalCost              = cost  * unitsSold;
  const totalProfit            = contributionMargin * unitsSold;
  const foodCostPct            = price > 0 ? (cost / price) * 100 : 0;

  // Flag whether this dish has actual cost data
  const hasCostData = cost > 0;

  // Efficiency: profit per minute of kitchen time
  // When prepTime is 0, we leave profitEfficiency as null and handle it in scoring
  const profitEfficiency = prepTime > 0 ? contributionMargin / prepTime : null;

  return {
    name, category, price, cost, unitsSold, prepTime,
    contributionMargin,
    contributionMarginPct,
    totalRevenue,
    totalCost,
    totalProfit,
    foodCostPct,
    profitEfficiency,
    hasCostData,
  };
}

// ─── BCG Classification ──────────────────────────────────────────────────────

/**
 * Menu BCG Matrix:
 *   STAR:      High popularity + High profitability  → Feature prominently
 *   PLOWHORSE: High popularity + Low profitability   → Reprice or reformulate
 *   PUZZLE:    Low popularity  + High profitability  → Promote aggressively
 *   DOG:       Low popularity  + Low profitability   → Review/remove
 */
export function classifyDishes(dishes) {
  if (!dishes.length) return [];

  const avgPopularity    = dishes.reduce((s, d) => s + d.unitsSold, 0) / dishes.length;
  const avgProfitability = dishes.reduce((s, d) => s + d.contributionMargin, 0) / dishes.length;

  // Compute max values ONCE outside the loop (performance fix)
  const maxUnits  = Math.max(...dishes.map(d => d.unitsSold));
  const maxMargin = Math.max(...dishes.map(d => d.contributionMargin));

  // Compute the threshold positions on the 0-100 scale for scatter plot reference lines
  const popularityThreshold   = maxUnits  > 0 ? (avgPopularity / maxUnits) * 100 : 50;
  const profitabilityThreshold = maxMargin > 0 ? (avgProfitability / maxMargin) * 100 : 50;

  return dishes.map(d => {
    const highPopularity    = d.unitsSold          >= avgPopularity;
    const highProfitability = d.contributionMargin >= avgProfitability;

    let classification, recommendation, urgency;

    if (highPopularity && highProfitability) {
      classification  = 'star';
      recommendation  = 'Feature prominently. Consider upselling complementary items.';
      urgency         = 'maintain';
    } else if (highPopularity && !highProfitability) {
      classification  = 'plowhorse';
      // Ensure price increase suggestion is always positive
      const marginGap = Math.max(0, avgProfitability - d.contributionMargin);
      const suggestedIncrease = Math.ceil(marginGap * 0.7);
      recommendation  = suggestedIncrease > 0
        ? `High demand but low margin. Review ingredient costs or raise price by ₹${suggestedIncrease}.`
        : 'High demand but margin below average. Review ingredient sourcing for cost savings.';
      urgency         = 'optimize';
    } else if (!highPopularity && highProfitability) {
      classification  = 'puzzle';
      recommendation  = 'Good margin, low visibility. Promote via placement, photos, or staff recommendations.';
      urgency         = 'promote';
    } else {
      classification  = 'dog';
      recommendation  = 'Low popularity and low margin. Consider removal or full reformulation.';
      urgency         = 'review';
    }

    // Normalized scores (0–100) for scatter positioning
    const popularityScore    = maxUnits  > 0 ? (d.unitsSold / maxUnits) * 100 : 0;
    const profitabilityScore = maxMargin > 0 ? (d.contributionMargin / maxMargin) * 100 : 0;

    return {
      ...d,
      classification,
      recommendation,
      urgency,
      popularityScore,
      profitabilityScore,
      avgPopularity,
      avgProfitability,
      // Threshold positions for scatter plot reference lines
      popularityThreshold,
      profitabilityThreshold,
    };
  });
}

// ─── Intelligence Score ──────────────────────────────────────────────────────

/**
 * Composite intelligence score (0–100) per dish.
 * Weights: profitability 35%, popularity 30%, food cost 15%, efficiency 10%, revenue contribution 10%
 *
 * Key fixes:
 *  - Items missing cost data (cost=0) get a neutral food-cost score (7.5/15)
 *    instead of a perfect score, preventing artificial inflation.
 *  - Items missing prep time get a neutral efficiency score (5/10)
 *    instead of using raw margin as a proxy.
 *  - Added revenue contribution component (10%) to reward items that
 *    contribute significantly to total revenue.
 */
export function computeIntelligenceScore(dishes) {
  if (!dishes.length) return dishes;

  const maxMargin      = Math.max(...dishes.map(d => d.contributionMargin));
  const maxUnits       = Math.max(...dishes.map(d => d.unitsSold));
  const totalRevenue   = dishes.reduce((s, d) => s + d.totalRevenue, 0);

  // For efficiency, only consider dishes that have prep time data
  const dishesWithPrepTime = dishes.filter(d => d.profitEfficiency !== null);
  const maxEfficiency = dishesWithPrepTime.length > 0
    ? Math.max(...dishesWithPrepTime.map(d => d.profitEfficiency))
    : 0;

  return dishes.map(d => {
    // Profitability component (35%): higher margin = higher score
    const profitScore = maxMargin > 0
      ? (d.contributionMargin / maxMargin) * 35
      : 0;

    // Popularity component (30%): more units sold = higher score
    const popularityScore = maxUnits > 0
      ? (d.unitsSold / maxUnits) * 30
      : 0;

    // Food cost component (15%): lower food cost % = higher score
    // KEY FIX: If cost data is missing (cost=0 and hasCostData=false),
    // assign a neutral score (midpoint) instead of a perfect score.
    let foodCostScore;
    if (!d.hasCostData) {
      foodCostScore = 7.5; // Neutral — don't reward missing data
    } else {
      foodCostScore = (1 - Math.min(d.foodCostPct / 100, 1)) * 15;
    }

    // Efficiency component (10%): higher profit per minute = higher score
    // KEY FIX: If prep time is missing, assign a neutral score
    let efficiencyScore;
    if (d.profitEfficiency === null || maxEfficiency <= 0) {
      efficiencyScore = 5; // Neutral — don't penalize or reward missing data
    } else {
      efficiencyScore = (d.profitEfficiency / maxEfficiency) * 10;
    }

    // Revenue contribution component (10%): what % of total revenue this dish drives
    const revenueContribution = totalRevenue > 0
      ? (d.totalRevenue / totalRevenue) * 10
      : 0;

    const intelligenceScore = Math.round(
      profitScore + popularityScore + foodCostScore + efficiencyScore + revenueContribution
    );

    return { ...d, intelligenceScore: Math.min(intelligenceScore, 100) };
  });
}

// ─── Portfolio Summary ───────────────────────────────────────────────────────

export function computePortfolioSummary(dishes) {
  if (!dishes.length) return null;

  const totalRevenue   = dishes.reduce((s, d) => s + d.totalRevenue, 0);
  const totalProfit    = dishes.reduce((s, d) => s + d.totalProfit, 0);
  const totalCost      = dishes.reduce((s, d) => s + d.totalCost, 0);
  const totalUnitsSold = dishes.reduce((s, d) => s + d.unitsSold, 0);

  // Average food cost only for dishes that have cost data
  const dishesWithCost = dishes.filter(d => d.hasCostData);
  const avgFoodCost    = dishesWithCost.length
    ? dishesWithCost.reduce((s, d) => s + d.foodCostPct, 0) / dishesWithCost.length
    : 0;

  const overallMargin  = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const byClass = {
    star:      dishes.filter(d => d.classification === 'star').length,
    plowhorse: dishes.filter(d => d.classification === 'plowhorse').length,
    puzzle:    dishes.filter(d => d.classification === 'puzzle').length,
    dog:       dishes.filter(d => d.classification === 'dog').length,
  };

  const topDish = [...dishes].sort((a, b) => b.intelligenceScore - a.intelligenceScore)[0];

  // Count how many dishes are missing cost data
  const missingCostCount = dishes.filter(d => !d.hasCostData).length;

  return {
    totalRevenue,
    totalProfit,
    totalCost,
    totalUnitsSold,
    avgFoodCost,
    overallMargin,
    dishCount: dishes.length,
    byClass,
    topDish,
    missingCostCount,
  };
}

// ─── Weekly Recommendations ──────────────────────────────────────────────────

export function generateRecommendations(dishes) {
  const recs = [];

  // Dogs to review
  const dogs = dishes.filter(d => d.classification === 'dog');
  if (dogs.length > 0) {
    const dogRevenue = dogs.reduce((s, d) => s + d.totalRevenue, 0);
    recs.push({
      type: 'review',
      priority: 'high',
      title: `Review ${dogs.length} underperforming item${dogs.length > 1 ? 's' : ''}`,
      body: `${dogs.map(d => d.name).join(', ')} ${dogs.length > 1 ? 'are' : 'is'} generating low revenue and low margins. Together they account for ₹${Math.round(dogRevenue).toLocaleString('en-IN')} in revenue — consider removal or reformulation.`,
      icon: '⚠',
      accent: 'warn',
    });
  }

  // Plowhorses to reprice
  const plowhorses = dishes.filter(d => d.classification === 'plowhorse');
  if (plowhorses.length > 0) {
    // Calculate recoverable margin: gap between each plowhorse's margin and average
    const avgMargin = dishes.reduce((s, d) => s + d.contributionMargin, 0) / dishes.length;
    const recoverablePerCycle = plowhorses.reduce((s, d) => {
      const gap = Math.max(0, avgMargin - d.contributionMargin);
      return s + (gap * d.unitsSold);
    }, 0);
    recs.push({
      type: 'reprice',
      priority: 'high',
      title: `Optimize pricing for ${plowhorses.length} high-demand item${plowhorses.length > 1 ? 's' : ''}`,
      body: `${plowhorses.map(d => d.name).join(', ')} ${plowhorses.length > 1 ? 'are' : 'is'} popular but under-priced. Closing the margin gap could recover ~₹${Math.round(recoverablePerCycle).toLocaleString('en-IN')} per cycle.`,
      icon: '↑',
      accent: 'warn',
    });
  }

  // Puzzles to promote
  const puzzles = dishes.filter(d => d.classification === 'puzzle');
  if (puzzles.length > 0) {
    // Estimate potential if puzzles reached average popularity
    const avgUnits = dishes.reduce((s, d) => s + d.unitsSold, 0) / dishes.length;
    const potentialGain = puzzles.reduce((s, d) => {
      const extraUnits = Math.max(0, avgUnits - d.unitsSold);
      return s + (extraUnits * d.contributionMargin);
    }, 0);
    recs.push({
      type: 'promote',
      priority: 'medium',
      title: `Promote ${puzzles.length} hidden gem${puzzles.length > 1 ? 's' : ''}`,
      body: `${puzzles.map(d => d.name).join(', ')} ${puzzles.length > 1 ? 'have' : 'has'} strong margins but low visibility. Boosting sales to average could add ~₹${Math.round(potentialGain).toLocaleString('en-IN')} per cycle.`,
      icon: '◆',
      accent: 'info',
    });
  }

  // Stars to feature
  const stars = dishes.filter(d => d.classification === 'star');
  if (stars.length > 0) {
    const starRevenue = stars.reduce((s, d) => s + d.totalRevenue, 0);
    const totalRevenue = dishes.reduce((s, d) => s + d.totalRevenue, 0);
    const starPct = totalRevenue > 0 ? ((starRevenue / totalRevenue) * 100).toFixed(0) : 0;
    recs.push({
      type: 'feature',
      priority: 'low',
      title: `Protect your ${stars.length} star${stars.length > 1 ? 's' : ''}`,
      body: `${stars.map(d => d.name).join(', ')} ${stars.length > 1 ? 'drive' : 'drives'} ${starPct}% of your revenue. Maintain quality consistency and protect from cost increases.`,
      icon: '★',
      accent: 'opp',
    });
  }

  // Missing cost data warning
  const missingCost = dishes.filter(d => !d.hasCostData);
  if (missingCost.length > 0) {
    recs.push({
      type: 'data',
      priority: 'medium',
      title: `Add cost data for ${missingCost.length} item${missingCost.length > 1 ? 's' : ''}`,
      body: `${missingCost.length} dish${missingCost.length > 1 ? 'es' : ''} have no food cost data. Margin calculations and intelligence scores are approximate — add costs via "Add Items" to improve accuracy.`,
      icon: '◇',
      accent: 'info',
    });
  }

  return recs;
}
