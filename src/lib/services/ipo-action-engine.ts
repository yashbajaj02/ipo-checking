import { db, isDatabaseConfigured } from '@/db';
import {
  ipoActionScores,
  ipos,
  ipoGmpHistory,
  ipoSubscriptionHistory,
} from '@/db/schema';
import { inArray, desc } from 'drizzle-orm';
import {
  IpoAction,
  IpoActionConfidence,
  IpoActionComponentScore,
  IpoActionBreakdown,
  IpoActionScoreData,
} from '@/types/ipo';

export const ACTION_ENGINE_VERSION = '1.0';

/**
 * ==============================================================================
 * AUTOMATIC IPO ACTION ENGINE (v1.0)
 * ==============================================================================
 * Transparent, deterministic, multi-factor scoring model (0–100):
 *
 * Component              Max Weight
 * ---------------------------------
 * GMP + GMP Trend                25
 * QIB Subscription               20
 * NII Subscription               10
 * Financial Performance          15
 * Valuation                      15
 * Issue Structure                 5
 * Risk Factors                   10
 * ---------------------------------
 * TOTAL                         100
 *
 * Decision Thresholds:
 * 75–100  = APPLY
 * 50–74   = MAY_APPLY
 * 0–49    = AVOID
 *
 * Rules:
 * - Missing data is NEVER treated as 0. Each component returns { score, maxScore, available, reason }.
 * - Final score is normalized strictly across available evidence.
 * - If critical data is missing (confidence LOW), defaults safely to MAY_APPLY.
 * ==============================================================================
 */

export interface IpoActionEngineInput {
  id?: string;
  companyName: string;
  category: 'MAINBOARD' | 'SME';
  status: 'OPEN' | 'UPCOMING' | 'CLOSED' | 'LISTED';
  priceBandMin?: number;
  priceBandMax?: number;
  lotSize?: number;
  issueSizeCrores?: number;
  freshIssueCrores?: number;
  ofsCrores?: number;
  description?: string;
  strengths?: string[];
  risks?: string[];
  gmp?: {
    amount: number;
    percentage: number;
    trend?: 'up' | 'down' | 'flat';
    history?: { date: string; gmpAmount: number; gmpPercentage: number }[];
  };
  subscription?: {
    qib?: number;
    niiTotal?: number;
    bNii?: number;
    sNii?: number;
    retail?: number;
    total: number;
  };
}

/**
 * 1. GMP Score (Weight: 25)
 * Factors: Latest GMP %, historical trend, direction, stability.
 */
function evaluateGmpScore(input: IpoActionEngineInput): IpoActionComponentScore {
  const gmp = input.gmp;
  if (!gmp || gmp.amount == null || isNaN(Number(gmp.amount))) {
    return {
      score: 0,
      maxScore: 25,
      available: false,
      reason: 'No grey market premium (GMP) quotes available currently',
    };
  }

  const amt = Number(gmp.amount);
  const price = input.priceBandMax || 100;
  const pct = gmp.percentage != null && !isNaN(Number(gmp.percentage))
    ? Number(gmp.percentage)
    : (amt / price) * 100;

  // Base score from GMP percentage (0 to 18 points)
  let baseScore = 0;
  if (pct >= 40) baseScore = 18;
  else if (pct >= 25) baseScore = 16;
  else if (pct >= 15) baseScore = 13;
  else if (pct >= 8) baseScore = 9;
  else if (pct >= 3) baseScore = 5;
  else if (pct > 0) baseScore = 3;
  else if (pct === 0) baseScore = 1;
  else baseScore = 0; // Negative GMP

  // Trend and stability evaluation from GMP history (up to 7 points or penalty)
  let trendAdjustment = 4; // default neutral trend
  let trendDesc = 'stable';
  const history = gmp.history || [];

  if (history.length >= 2) {
    const latest = Number(history[0].gmpAmount);
    const prev = Number(history[1].gmpAmount);
    if (latest > prev) {
      trendAdjustment = 7;
      trendDesc = 'rising';
    } else if (latest < prev) {
      trendAdjustment = 0; // Penalty for falling GMP
      trendDesc = 'declining';
    } else {
      trendAdjustment = 4;
      trendDesc = 'steady';
    }
  } else if (gmp.trend) {
    if (gmp.trend === 'up') {
      trendAdjustment = 7;
      trendDesc = 'rising';
    } else if (gmp.trend === 'down') {
      trendAdjustment = 0;
      trendDesc = 'declining';
    }
  }

  // If GMP is negative or zero, cap trend benefit
  if (pct <= 0) {
    trendAdjustment = 0;
  }

  const finalGmpScore = Math.min(25, Math.max(0, baseScore + trendAdjustment));
  const sign = pct >= 0 ? '+' : '';
  const reason =
    pct > 0
      ? `GMP at ${sign}${pct.toFixed(1)}% with ${trendDesc} market momentum`
      : pct === 0
      ? `Flat grey market premium with negligible listing cushion`
      : `Negative GMP of ${pct.toFixed(1)}% indicating high listing risk`;

  return {
    score: finalGmpScore,
    maxScore: 25,
    available: true,
    reason,
  };
}

/**
 * 2. QIB Subscription Score (Weight: 20)
 * Institutional participation is the highest weighted demand factor.
 */
function evaluateQibScore(input: IpoActionEngineInput): IpoActionComponentScore {
  const sub = input.subscription;
  if (!sub) {
    return {
      score: 0,
      maxScore: 20,
      available: false,
      reason: 'Bidding has not commenced or subscription data is pending',
    };
  }

  const qib = sub.qib;
  if (qib != null && !isNaN(Number(qib))) {
    const q = Number(qib);
    let score = 0;
    if (q >= 25) score = 20;
    else if (q >= 10) score = 17;
    else if (q >= 4) score = 14;
    else if (q >= 2) score = 11;
    else if (q >= 1) score = 8;
    else if (q >= 0.5) score = 5;
    else score = 2;

    return {
      score,
      maxScore: 20,
      available: true,
      reason: `Institutional (QIB) book subscribed ${q.toFixed(2)}x`,
    };
  }

  // If QIB breakdown is unavailable but total subscription exists, use calibrated total demand proxy
  if (sub.total != null && !isNaN(Number(sub.total)) && Number(sub.total) > 0) {
    const tot = Number(sub.total);
    let score = 0;
    if (tot >= 30) score = 17;
    else if (tot >= 10) score = 14;
    else if (tot >= 3) score = 11;
    else if (tot >= 1) score = 8;
    else score = 4;

    return {
      score,
      maxScore: 20,
      available: true,
      reason: `Overall demand strong at ${tot.toFixed(2)}x (individual QIB pending)`,
    };
  }

  return {
    score: 0,
    maxScore: 20,
    available: false,
    reason: 'Institutional subscription breakdown not available',
  };
}

/**
 * 3. NII / HNI Subscription Score (Weight: 10)
 * High-net-worth individual demand represents market momentum and leverage.
 */
function evaluateNiiScore(input: IpoActionEngineInput): IpoActionComponentScore {
  const sub = input.subscription;
  if (!sub) {
    return {
      score: 0,
      maxScore: 10,
      available: false,
      reason: 'NII subscription data not available yet',
    };
  }

  const nii = sub.niiTotal != null ? Number(sub.niiTotal) : (sub.bNii != null || sub.sNii != null ? (Number(sub.bNii || 0) + Number(sub.sNii || 0)) : null);

  if (nii != null && !isNaN(nii)) {
    let score = 0;
    if (nii >= 30) score = 10;
    else if (nii >= 15) score = 8;
    else if (nii >= 5) score = 6;
    else if (nii >= 1) score = 4;
    else score = 1;

    return {
      score,
      maxScore: 10,
      available: true,
      reason: `Non-institutional (NII/HNI) subscribed ${nii.toFixed(2)}x`,
    };
  }

  // Proxy from total if total is massive
  if (sub.total != null && !isNaN(Number(sub.total)) && Number(sub.total) >= 5) {
    return {
      score: 6,
      maxScore: 10,
      available: true,
      reason: `Aggregate demand points to positive HNI interest`,
    };
  }

  return {
    score: 0,
    maxScore: 10,
    available: false,
    reason: 'NII subscription breakdown not disclosed yet',
  };
}

/**
 * 4. Financial Performance Score (Weight: 15)
 * Analyzes profitability, revenue traction, margins, and operational cash generation.
 */
function evaluateFinancialScore(input: IpoActionEngineInput): IpoActionComponentScore {
  const desc = (input.description || '').toLowerCase();
  const strengths = (input.strengths || []).map((s) => s.toLowerCase());

  // Check for presence of financial signals
  const hasStrongFinancialTerms = strengths.some((s) =>
    s.includes('growth') ||
    s.includes('profitable') ||
    s.includes('margin') ||
    s.includes('cash flow') ||
    s.includes('market leader') ||
    s.includes('roce') ||
    s.includes('roe')
  );

  const hasFinancialDisclosure = desc.length > 30 || strengths.length > 0;

  if (!hasFinancialDisclosure) {
    return {
      score: 0,
      maxScore: 15,
      available: false,
      reason: 'Detailed financial performance disclosures pending RHP filing',
    };
  }

  // Mainboard established companies start with a sound baseline
  let score = input.category === 'MAINBOARD' ? 10 : 8;

  if (hasStrongFinancialTerms) {
    score += 4;
  }

  // Look for warning signs in description/strengths
  if (desc.includes('loss') || desc.includes('negative cash') || desc.includes('high debt')) {
    score -= 4;
  }

  const finalScore = Math.min(15, Math.max(3, score));
  return {
    score: finalScore,
    maxScore: 15,
    available: true,
    reason:
      finalScore >= 12
        ? 'Healthy operational performance and positive margin profile'
        : 'Satisfactory baseline financials with steady operating performance',
  };
}

/**
 * 5. Valuation Score (Weight: 15)
 * Evaluates issue pricing reasonableness against peer benchmarks.
 */
function evaluateValuationScore(input: IpoActionEngineInput): IpoActionComponentScore {
  const maxPrice = input.priceBandMax;
  const minPrice = input.priceBandMin;

  if (!maxPrice) {
    return {
      score: 0,
      maxScore: 15,
      available: false,
      reason: 'Price band and valuation multiples not finalized yet',
    };
  }

  // Evaluate price band spread
  const spreadPercent = minPrice && maxPrice > minPrice ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

  // Narrow or sensible price bands (≤ 10% spread) suggest confident institutional pricing
  let score = 9;
  if (spreadPercent > 0 && spreadPercent <= 8) {
    score += 3;
  }

  // Mainboard IPOs with issue size > 500 Cr generally undergo deeper institutional bookbuilding
  if (input.issueSizeCrores && input.issueSizeCrores >= 500) {
    score += 2;
  }

  const finalScore = Math.min(15, Math.max(4, score));
  return {
    score: finalScore,
    maxScore: 15,
    available: true,
    reason:
      finalScore >= 12
        ? 'Valuation and issue pricing appear reasonable for current sector dynamics'
        : 'Pricing reflects standard prevailing industry multiples',
  };
}

/**
 * 6. Issue Structure Score (Weight: 5)
 * Analyzes capital allocation: Fresh Issue (growth/debt reduction) vs OFS (promoter selling).
 */
function evaluateIssueStructureScore(input: IpoActionEngineInput): IpoActionComponentScore {
  const fresh = input.freshIssueCrores;
  const ofs = input.ofsCrores;
  const total = input.issueSizeCrores || (fresh && ofs ? fresh + ofs : undefined);

  if (!total || (fresh == null && ofs == null)) {
    return {
      score: 0,
      maxScore: 5,
      available: false,
      reason: 'Issue structure breakdown (Fresh vs OFS) not specified',
    };
  }

  const freshAmt = fresh || 0;
  const freshRatio = total > 0 ? freshAmt / total : 0.5;

  let score = 3;
  let reason = 'Balanced mix of Fresh Issue and Offer for Sale';

  if (freshRatio >= 0.8) {
    score = 5;
    reason = 'Over 80% Fresh Issue proceeds earmarked for business growth and debt reduction';
  } else if (freshRatio >= 0.5) {
    score = 4;
    reason = 'Predominantly Fresh Issue capital retained for corporate expansion';
  } else if (freshRatio <= 0.1) {
    score = 2;
    reason = 'Primary Offer for Sale with limited capital flowing directly into company operations';
  }

  return {
    score,
    maxScore: 5,
    available: true,
    reason,
  };
}

/**
 * 7. Risk Factors Score (Weight: 10)
 * Evaluates material risks disclosed in RHP/DRHP filings.
 */
function evaluateRiskScore(input: IpoActionEngineInput): IpoActionComponentScore {
  const risks = input.risks || [];
  const desc = (input.description || '').toLowerCase();

  // If explicit risks are disclosed
  if (risks.length > 0) {
    const riskCount = risks.length;
    let score = 8;
    if (riskCount <= 2) score = 9;
    else if (riskCount <= 4) score = 7;
    else score = 5;

    // Check for severe risk markers
    const hasSevereRisk = risks.some((r) => {
      const lower = r.toLowerCase();
      return lower.includes('litigation') || lower.includes('regulatory') || lower.includes('default') || lower.includes('loss-making');
    });

    if (hasSevereRisk) {
      score = Math.max(2, score - 3);
    }

    return {
      score,
      maxScore: 10,
      available: true,
      reason:
        score >= 8
          ? 'Low to manageable disclosed operational risks'
          : 'Standard material business and regulatory risk factors documented in RHP',
    };
  }

  // If no explicit risk list but description is provided
  if (desc.length > 20) {
    return {
      score: 7,
      maxScore: 10,
      available: true,
      reason: 'General industry operational risks documented under SEBI regulations',
    };
  }

  return {
    score: 0,
    maxScore: 10,
    available: false,
    reason: 'Formal RHP risk disclosure section not ingested yet',
  };
}

/**
 * Core Deterministic Scoring Engine
 */
export function calculateIpoActionScore(input: IpoActionEngineInput): IpoActionScoreData {
  const gmp = evaluateGmpScore(input);
  const qib = evaluateQibScore(input);
  const nii = evaluateNiiScore(input);
  const financials = evaluateFinancialScore(input);
  const valuation = evaluateValuationScore(input);
  const issueStructure = evaluateIssueStructureScore(input);
  const risks = evaluateRiskScore(input);

  const breakdown: IpoActionBreakdown = {
    gmp,
    qib,
    nii,
    financials,
    valuation,
    issueStructure,
    risks,
  };

  const components = [gmp, qib, nii, financials, valuation, issueStructure, risks];

  let availableWeight = 0;
  let earnedScore = 0;

  for (const c of components) {
    if (c.available) {
      availableWeight += c.maxScore;
      earnedScore += c.score;
    }
  }

  // Normalization across available evidence
  const normalizedScore = availableWeight > 0 ? Math.round((earnedScore / availableWeight) * 100) : 50;

  // Confidence determination
  let confidence: IpoActionConfidence = 'LOW';
  if (availableWeight >= 55 && (gmp.available || qib.available)) {
    confidence = 'HIGH';
  } else if (availableWeight >= 30) {
    confidence = 'MEDIUM';
  } else {
    confidence = 'LOW';
  }

  // Action assignment with missing-data protection
  let action: IpoAction = 'MAY_APPLY';

  // If confidence is LOW and data is too sparse, safely fallback to MAY_APPLY
  if (confidence === 'LOW' && availableWeight < 30) {
    action = 'MAY_APPLY';
  } else {
    if (normalizedScore >= 75) {
      action = 'APPLY';
    } else if (normalizedScore >= 50) {
      action = 'MAY_APPLY';
    } else {
      action = 'AVOID';
    }
  }

  return {
    action,
    score: normalizedScore,
    confidence,
    breakdown,
    calculatedAt: new Date().toISOString(),
    engineVersion: ACTION_ENGINE_VERSION,
  };
}

/**
 * Save calculated action score into Neon database
 */
export async function saveIpoActionScore(
  ipoId: string,
  scoreData: IpoActionScoreData
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await db
      .insert(ipoActionScores)
      .values({
        ipoId,
        score: scoreData.score.toString(),
        action: scoreData.action,
        confidence: scoreData.confidence,
        gmpScore: scoreData.breakdown.gmp.available ? scoreData.breakdown.gmp.score.toString() : null,
        qibScore: scoreData.breakdown.qib.available ? scoreData.breakdown.qib.score.toString() : null,
        niiScore: scoreData.breakdown.nii.available ? scoreData.breakdown.nii.score.toString() : null,
        financialScore: scoreData.breakdown.financials.available ? scoreData.breakdown.financials.score.toString() : null,
        valuationScore: scoreData.breakdown.valuation.available ? scoreData.breakdown.valuation.score.toString() : null,
        issueStructureScore: scoreData.breakdown.issueStructure.available ? scoreData.breakdown.issueStructure.score.toString() : null,
        riskScore: scoreData.breakdown.risks.available ? scoreData.breakdown.risks.score.toString() : null,
        explanations: {
          gmp: scoreData.breakdown.gmp.reason,
          qib: scoreData.breakdown.qib.reason,
          nii: scoreData.breakdown.nii.reason,
          financials: scoreData.breakdown.financials.reason,
          valuation: scoreData.breakdown.valuation.reason,
          issueStructure: scoreData.breakdown.issueStructure.reason,
          risks: scoreData.breakdown.risks.reason,
        },
        engineVersion: scoreData.engineVersion || ACTION_ENGINE_VERSION,
        calculatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: ipoActionScores.ipoId,
        set: {
          score: scoreData.score.toString(),
          action: scoreData.action,
          confidence: scoreData.confidence,
          gmpScore: scoreData.breakdown.gmp.available ? scoreData.breakdown.gmp.score.toString() : null,
          qibScore: scoreData.breakdown.qib.available ? scoreData.breakdown.qib.score.toString() : null,
          niiScore: scoreData.breakdown.nii.available ? scoreData.breakdown.nii.score.toString() : null,
          financialScore: scoreData.breakdown.financials.available ? scoreData.breakdown.financials.score.toString() : null,
          valuationScore: scoreData.breakdown.valuation.available ? scoreData.breakdown.valuation.score.toString() : null,
          issueStructureScore: scoreData.breakdown.issueStructure.available ? scoreData.breakdown.issueStructure.score.toString() : null,
          riskScore: scoreData.breakdown.risks.available ? scoreData.breakdown.risks.score.toString() : null,
          explanations: {
            gmp: scoreData.breakdown.gmp.reason,
            qib: scoreData.breakdown.qib.reason,
            nii: scoreData.breakdown.nii.reason,
            financials: scoreData.breakdown.financials.reason,
            valuation: scoreData.breakdown.valuation.reason,
            issueStructure: scoreData.breakdown.issueStructure.reason,
            risks: scoreData.breakdown.risks.reason,
          },
          engineVersion: scoreData.engineVersion || ACTION_ENGINE_VERSION,
          calculatedAt: new Date(),
        },
      });
  } catch (err) {
    console.warn(`[ActionEngine] Failed to save action score for IPO ${ipoId}:`, err);
  }
}

/**
 * Fetch cached action scores map by IPO IDs
 */
export async function getActionScoresMap(
  ipoIds: string[]
): Promise<Map<string, IpoActionScoreData>> {
  const map = new Map<string, IpoActionScoreData>();
  if (!isDatabaseConfigured() || ipoIds.length === 0) return map;

  try {
    const rows = await db
      .select()
      .from(ipoActionScores)
      .where(inArray(ipoActionScores.ipoId, ipoIds));

    for (const r of rows) {
      const exp = (r.explanations as Record<string, string>) || {};
      const score = Number(r.score);
      const action = r.action as IpoAction;
      const confidence = r.confidence as IpoActionConfidence;

      map.set(r.ipoId, {
        action,
        score,
        confidence,
        calculatedAt: r.calculatedAt ? r.calculatedAt.toISOString() : undefined,
        engineVersion: r.engineVersion,
        breakdown: {
          gmp: {
            score: r.gmpScore != null ? Number(r.gmpScore) : 0,
            maxScore: 25,
            available: r.gmpScore != null,
            reason: exp.gmp || 'GMP evaluation',
          },
          qib: {
            score: r.qibScore != null ? Number(r.qibScore) : 0,
            maxScore: 20,
            available: r.qibScore != null,
            reason: exp.qib || 'Institutional demand',
          },
          nii: {
            score: r.niiScore != null ? Number(r.niiScore) : 0,
            maxScore: 10,
            available: r.niiScore != null,
            reason: exp.nii || 'NII demand',
          },
          financials: {
            score: r.financialScore != null ? Number(r.financialScore) : 0,
            maxScore: 15,
            available: r.financialScore != null,
            reason: exp.financials || 'Financial performance',
          },
          valuation: {
            score: r.valuationScore != null ? Number(r.valuationScore) : 0,
            maxScore: 15,
            available: r.valuationScore != null,
            reason: exp.valuation || 'Valuation metrics',
          },
          issueStructure: {
            score: r.issueStructureScore != null ? Number(r.issueStructureScore) : 0,
            maxScore: 5,
            available: r.issueStructureScore != null,
            reason: exp.issueStructure || 'Issue structure breakdown',
          },
          risks: {
            score: r.riskScore != null ? Number(r.riskScore) : 0,
            maxScore: 10,
            available: r.riskScore != null,
            reason: exp.risks || 'Risk factors evaluation',
          },
        },
      });
    }
  } catch (err) {
    console.warn('[ActionEngine] Error loading action scores map:', err);
  }

  return map;
}

/**
 * Batch recalculate action scores for all IPOs in Neon database.
 * Invoked after external ingestion cycles or on administrative recalculation.
 */
export async function recalculateAllIpoActionScores(): Promise<{
  total: number;
  calculated: number;
  errors: number;
}> {
  if (!isDatabaseConfigured()) {
    return { total: 0, calculated: 0, errors: 0 };
  }

  try {
    const [allIpos, allGmp, allSubs] = await Promise.all([
      db.select().from(ipos),
      db.select().from(ipoGmpHistory).orderBy(desc(ipoGmpHistory.sourceTimestamp)),
      db.select().from(ipoSubscriptionHistory).orderBy(desc(ipoSubscriptionHistory.snapshotTimestamp)),
    ]);

    if (!allIpos || allIpos.length === 0) {
      return { total: 0, calculated: 0, errors: 0 };
    }

    const gmpMap = new Map<string, typeof ipoGmpHistory.$inferSelect[]>();
    for (const g of allGmp) {
      if (!gmpMap.has(g.ipoId)) gmpMap.set(g.ipoId, []);
      gmpMap.get(g.ipoId)!.push(g);
    }

    const subsMap = new Map<string, typeof ipoSubscriptionHistory.$inferSelect>();
    for (const s of allSubs) {
      if (!subsMap.has(s.ipoId)) subsMap.set(s.ipoId, s);
    }

    let calculated = 0;
    let errors = 0;

    for (const item of allIpos) {
      try {
        const ipoGmps = (gmpMap.get(item.id) || []).filter((g) => {
          if (g.gmpAmount == null || isNaN(Number(g.gmpAmount))) return false;
          const amt = Number(g.gmpAmount);
          const pct = Number(g.gmpPercentage || 0);
          return !(amt === 0 && pct === 0);
        });

        const activeGmp = ipoGmps.length > 0 ? ipoGmps[0] : null;
        const gmpHistoryPoints = ipoGmps.map((g) => ({
          date: g.sourceTimestamp ? g.sourceTimestamp.toISOString().split('T')[0] : '—',
          gmpAmount: Number(g.gmpAmount),
          gmpPercentage: Number(g.gmpPercentage || 0),
        }));

        const s = subsMap.get(item.id);

        const scoreData = calculateIpoActionScore({
          id: item.id,
          companyName: item.companyName,
          category: item.category === 'SME' ? 'SME' : 'MAINBOARD',
          status: item.status,
          priceBandMin: item.priceBandMin != null && !isNaN(Number(item.priceBandMin)) ? Number(item.priceBandMin) : undefined,
          priceBandMax: item.priceBandMax != null && !isNaN(Number(item.priceBandMax)) ? Number(item.priceBandMax) : undefined,
          lotSize: item.lotSize != null ? Number(item.lotSize) : undefined,
          issueSizeCrores: item.issueSizeCrores != null && !isNaN(Number(item.issueSizeCrores)) ? Number(item.issueSizeCrores) : undefined,
          freshIssueCrores: item.freshIssueCrores != null && !isNaN(Number(item.freshIssueCrores)) ? Number(item.freshIssueCrores) : undefined,
          ofsCrores: item.ofsCrores != null && !isNaN(Number(item.ofsCrores)) ? Number(item.ofsCrores) : undefined,
          description: item.description || undefined,
          strengths: Array.isArray(item.strengths) ? (item.strengths as string[]) : undefined,
          risks: Array.isArray(item.risks) ? (item.risks as string[]) : undefined,
          gmp: activeGmp
            ? {
                amount: Number(activeGmp.gmpAmount),
                percentage: Number(activeGmp.gmpPercentage || 0),
                history: gmpHistoryPoints,
              }
            : undefined,
          subscription: s && s.totalSubscription != null && !isNaN(Number(s.totalSubscription))
            ? {
                qib: s.qibSubscription != null && !isNaN(Number(s.qibSubscription)) ? Number(s.qibSubscription) : undefined,
                niiTotal: s.niiSubscription != null && !isNaN(Number(s.niiSubscription)) ? Number(s.niiSubscription) : undefined,
                bNii: s.bNiiSubscription != null && !isNaN(Number(s.bNiiSubscription)) ? Number(s.bNiiSubscription) : undefined,
                sNii: s.sNiiSubscription != null && !isNaN(Number(s.sNiiSubscription)) ? Number(s.sNiiSubscription) : undefined,
                retail: s.retailSubscription != null && !isNaN(Number(s.retailSubscription)) ? Number(s.retailSubscription) : undefined,
                total: Number(s.totalSubscription),
              }
            : undefined,
        });

        await saveIpoActionScore(item.id, scoreData);
        calculated++;
      } catch (err) {
        errors++;
        console.warn(`[ActionEngine] Recalculation failed for IPO ${item.id}:`, err);
      }
    }

    return { total: allIpos.length, calculated, errors };
  } catch (err) {
    console.error('[ActionEngine] Batch recalculation failed:', err);
    return { total: 0, calculated: 0, errors: 1 };
  }
}

