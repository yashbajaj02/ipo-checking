import crypto from 'crypto';
import { db, isDatabaseConfigured } from '@/db';
import { ipos } from '@/db/schema';
import { eq } from 'drizzle-orm';

const GEMINI_MODEL = 'gemini-3.8-flash';

export interface EnrichmentContext {
  companyName: string;
  category?: string | null;
  description?: string | null;
  strengths?: unknown;
  risks?: unknown;
  slug?: string | null;
  rhpUrl?: string | null;
  drhpUrl?: string | null;
  sourceUrl?: string | null;
}

export interface EnrichmentResult {
  aiDescription: string | null;
  aiSourceHash: string;
  aiModelVersion: string;
  aiGeneratedAt: Date;
  status: 'CACHED' | 'GENERATED' | 'FALLBACK_INSUFFICIENT' | 'FALLBACK_ERROR';
  error?: string;
}

/**
 * Verified authoritative official company websites or official filing source URLs.
 * Used as a fallback when provider description, strengths, or risks are missing.
 */
export const VERIFIED_OFFICIAL_WEBSITES: Record<string, string> = {
  'nityas-gems-jewellery-ipo': 'https://nityas.in/about/',
};

/**
 * Server-side helper to fetch and extract factual text from an authoritative source URL.
 * Strictly strips HTML chrome (scripts, styles, nav, footer, header) and returns clean text.
 */
export async function fetchAuthoritativeSourceContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!res.ok) return null;

    const html = await res.text();

    const stripped = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');

    const textPieces: string[] = [];
    const blockRegex = /<(?:p|h[1-6]|li|span)[^>]*>([\s\S]*?)<\/(?:p|h[1-6]|li|span)>/gi;
    let match;
    while ((match = blockRegex.exec(stripped)) !== null) {
      const rawText = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (
        rawText.length >= 25 &&
        !rawText.toLowerCase().includes('annual report') &&
        !rawText.toLowerCase().includes('board meetings')
      ) {
        textPieces.push(rawText);
      }
    }

    const combined = Array.from(new Set(textPieces)).join('. ');
    if (combined.length < 40) return null;

    return combined.slice(0, 1000);
  } catch (err) {
    console.warn(`[Authoritative Source] Extraction error for ${url}:`, err);
    return null;
  }
}

/**
 * Calculate SHA-256 hash of the input source context.
 * Used to detect material changes in underlying source data.
 */
export function computeSourceHash(ctx: EnrichmentContext): string {
  const payload = [
    ctx.companyName || '',
    ctx.category || '',
    ctx.description || '',
    Array.isArray(ctx.strengths) ? ctx.strengths.join(';') : '',
    Array.isArray(ctx.risks) ? ctx.risks.join(';') : '',
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Validate Gemini generated output text against strict compliance and source grounding rules.
 */
export function validateGeminiOutput(text: string, sourceText: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 40 || trimmed.length > 500) return false;
  if (trimmed.includes('INSUFFICIENT_CONTEXT')) return false;

  const lastChar = trimmed.slice(-1);
  if (!['.', '!', '?'].includes(lastChar)) return false;

  const lowerGen = trimmed.toLowerCase();
  const lowerSource = (sourceText || '').toLowerCase();

  // Prohibited financial, speculative, or recommendation keywords
  const forbiddenKeywords = [
    'gmp',
    'grey market',
    'subscription',
    'listing price',
    'target price',
    'buy',
    'sell',
    'apply',
    'avoid',
    'investment recommendation',
    'financial advice',
    'guaranteed',
    'expected return',
  ];

  for (const kw of forbiddenKeywords) {
    if (lowerGen.includes(kw)) {
      return false;
    }
  }

  // Grounding check: Reject ungrounded identity/technology claims not present in source context
  const strictUnstatedClaims = ['indian', 'mainboard', 'automated', 'automation', 'global leading', 'pioneer', 'market leader'];
  for (const claim of strictUnstatedClaims) {
    if (lowerGen.includes(claim) && !lowerSource.includes(claim)) {
      console.info(`[Gemini Enrichment] Output rejected: Contains ungrounded claim "${claim}" absent from source context.`);
      return false;
    }
  }

  return true;
}

/**
 * Server-only function to generate a concise 2-3 sentence About summary via Gemini API.
 * Checks Neon DB cache first. Regenerates only if source context changes or is missing.
 */
export async function generateGeminiAbout(
  ipoId: string,
  ctx: EnrichmentContext,
  options?: { forceRefresh?: boolean }
): Promise<EnrichmentResult> {
  const now = new Date();

  // 1. Resolve source context: if provider description, strengths, and risks are missing,
  // attempt to retrieve legitimate company information from authoritative sources.
  let effectiveDescription = ctx.description?.trim() || null;
  const hasExistingRawDesc = Boolean(effectiveDescription && effectiveDescription.length >= 15);
  const hasStrengths = Array.isArray(ctx.strengths) && ctx.strengths.length > 0;
  const hasRisks = Array.isArray(ctx.risks) && ctx.risks.length > 0;

  if (!hasExistingRawDesc && !hasStrengths && !hasRisks) {
    const candidateUrl =
      ctx.sourceUrl ||
      (ctx.slug ? VERIFIED_OFFICIAL_WEBSITES[ctx.slug] : null) ||
      (ctx.rhpUrl && !ctx.rhpUrl.endsWith('.pdf') ? ctx.rhpUrl : null) ||
      (ctx.drhpUrl && !ctx.drhpUrl.endsWith('.pdf') ? ctx.drhpUrl : null) ||
      null;

    if (candidateUrl) {
      const authoritativeText = await fetchAuthoritativeSourceContent(candidateUrl);
      if (authoritativeText) {
        effectiveDescription = authoritativeText;
      }
    }
  }

  const effectiveCtx: EnrichmentContext = {
    ...ctx,
    description: effectiveDescription,
  };
  const sourceHash = computeSourceHash(effectiveCtx);

  // 2. Check existing DB cache first
  if (isDatabaseConfigured() && !options?.forceRefresh) {
    const [existing] = await db
      .select({
        aiDescription: ipos.aiDescription,
        aiSourceHash: ipos.aiSourceHash,
        aiModelVersion: ipos.aiModelVersion,
        aiGeneratedAt: ipos.aiGeneratedAt,
      })
      .from(ipos)
      .where(eq(ipos.id, ipoId))
      .limit(1);

    if (existing && existing.aiDescription && existing.aiSourceHash === sourceHash) {
      return {
        aiDescription: existing.aiDescription,
        aiSourceHash: existing.aiSourceHash,
        aiModelVersion: existing.aiModelVersion || GEMINI_MODEL,
        aiGeneratedAt: existing.aiGeneratedAt || now,
        status: 'CACHED',
      };
    }
  }

  // 3. Validate source context availability
  const hasValidDesc = Boolean(effectiveDescription && effectiveDescription.length >= 15);
  if (!hasValidDesc && !hasStrengths && !hasRisks) {
    return {
      aiDescription: null,
      aiSourceHash: sourceHash,
      aiModelVersion: GEMINI_MODEL,
      aiGeneratedAt: now,
      status: 'FALLBACK_INSUFFICIENT',
    };
  }

  // 4. Verify server-side GEMINI_API_KEY
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ GEMINI_API_KEY is not configured on server.');
    return {
      aiDescription: null,
      aiSourceHash: sourceHash,
      aiModelVersion: GEMINI_MODEL,
      aiGeneratedAt: now,
      status: 'FALLBACK_ERROR',
      error: 'GEMINI_API_KEY missing',
    };
  }

  // 5. Construct strict factual prompt
  const contextDetails = [
    `Company Name: ${ctx.companyName}`,
    effectiveDescription ? `Business Context: ${effectiveDescription}` : null,
    hasStrengths ? `Strengths: ${(ctx.strengths as string[]).join(', ')}` : null,
    hasRisks ? `Risk Factors: ${(ctx.risks as string[]).join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const systemInstruction = `You are a factual business description assistant for an IPO information platform.
Your task is to write a concise 2 to 3 sentence explanation of what the company does based ONLY on the provided source details.

CRITICAL GROUNDING RULES:
- Use ONLY information explicitly present in the supplied source context.
- Do NOT infer nationality, geography, technology, scale, capabilities, customers, future plans, financial performance, or other unstated facts.
- Do NOT turn IPO category classifications into company identity phrases like "Mainboard company" or "SME firm".
- If a fact (such as "Indian", "automated", or "global") is not explicitly supported by the source details below, omit it.
- Maximum 2 to 3 sentences.
- Summarize ONLY the provided source material.
- DO NOT invent, fabricate, or extrapolate any company facts, numbers, or events.
- DO NOT make financial predictions, valuation claims, or investment recommendations (never say "apply", "avoid", "buy", or "invest").
- DO NOT mention GMP, grey market premium, subscription figures, listing prices, or dates.
- Write in clear, professional, objective, user-friendly language.
- Avoid marketing hype or repeating the company name excessively.
- If the source details do not contain enough facts about what the business does, reply with EXACTLY: INSUFFICIENT_CONTEXT`;

  const prompt = `${systemInstruction}\n\n--- SOURCE DETAILS ---\n${contextDetails}`;

  try {
    let cleanGenerated = '';
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1000,
              thinkingConfig: {
                thinkingBudget: 0,
              },
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawGenerated = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        cleanGenerated = rawGenerated.trim();
        break;
      }

      if ((response.status === 503 || response.status === 429) && attempt < maxAttempts) {
        console.warn(`[Gemini Enrichment] Attempt ${attempt} failed with ${response.status}. Retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const errText = await response.text();
      console.warn(`[Gemini Enrichment] Production model ${GEMINI_MODEL} request failed (${response.status}): ${response.statusText}`);
      return {
        aiDescription: null,
        aiSourceHash: sourceHash,
        aiModelVersion: GEMINI_MODEL,
        aiGeneratedAt: now,
        status: 'FALLBACK_ERROR',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    if (!validateGeminiOutput(cleanGenerated, contextDetails)) {
      console.info(`Gemini output failed validation or insufficient context for "${ctx.companyName}"`);
      return {
        aiDescription: null,
        aiSourceHash: sourceHash,
        aiModelVersion: GEMINI_MODEL,
        aiGeneratedAt: now,
        status: 'FALLBACK_INSUFFICIENT',
      };
    }

    // 6. Persist into Neon DB cache if DB is configured
    if (isDatabaseConfigured()) {
      await db
        .update(ipos)
        .set({
          aiDescription: cleanGenerated,
          aiSourceHash: sourceHash,
          aiGeneratedAt: now,
          aiModelVersion: GEMINI_MODEL,
        })
        .where(eq(ipos.id, ipoId));
    }

    return {
      aiDescription: cleanGenerated,
      aiSourceHash: sourceHash,
      aiModelVersion: GEMINI_MODEL,
      aiGeneratedAt: now,
      status: 'GENERATED',
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn('[Gemini Enrichment] Request failed safely:', errMsg);
    return {
      aiDescription: null,
      aiSourceHash: sourceHash,
      aiModelVersion: GEMINI_MODEL,
      aiGeneratedAt: now,
      status: 'FALLBACK_ERROR',
      error: errMsg,
    };
  }
}
