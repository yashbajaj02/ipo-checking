import zlib from 'zlib';
import { IpoMarketQuote } from '@/types/ipo';

/**
 * ==============================================================================
 * UPSTOX LIVE MARKET QUOTES SERVICE
 * ==============================================================================
 * Fetches real-time LTP (Last Traded Price), net change, % change, and volume
 * using the Upstox Market Quote API and UPSTOX_ANALYTICS_TOKEN.
 *
 * Rules:
 * 1. Bulk request: fetches quotes for all instruments in a single HTTP call.
 * 2. In-memory caching: cached for 30s to prevent API rate limiting.
 * 3. Instrument resolution: maps IPO symbol / name to Upstox instrument keys.
 * 4. Resilient: Returns undefined on failure; never throws or shows artificial 0.
 * ==============================================================================
 */

interface UpstoxInstrument {
  instrument_key: string;
  trading_symbol?: string;
  name?: string;
  segment?: string;
  exchange?: string;
}

// In-memory cache for instrument master index (TTL 24 hours)
let cachedInstruments: UpstoxInstrument[] | null = null;
let instrumentsLastFetched = 0;
const INSTRUMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// In-memory cache for live quotes (TTL 30 seconds)
const quoteCache = new Map<string, { quote: IpoMarketQuote; timestamp: number }>();
const QUOTE_CACHE_TTL_MS = 30 * 1000;

/**
 * Loads Upstox instrument master index with daily caching.
 */
async function getUpstoxInstruments(): Promise<UpstoxInstrument[]> {
  const now = Date.now();
  if (cachedInstruments && now - instrumentsLastFetched < INSTRUMENT_CACHE_TTL_MS) {
    return cachedInstruments;
  }

  try {
    const res = await fetch('https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz', {
      headers: { 'Accept-Encoding': 'gzip' },
    });

    if (!res.ok) {
      console.warn(`Failed to fetch Upstox instrument master: HTTP ${res.status}`);
      return cachedInstruments || [];
    }

    const buffer = await res.arrayBuffer();
    const uncompressed = zlib.gunzipSync(Buffer.from(buffer));
    const all = JSON.parse(uncompressed.toString()) as UpstoxInstrument[];

    // Filter equity instruments on NSE and BSE
    cachedInstruments = all.filter(
      (inst) => inst.segment === 'NSE_EQ' || inst.segment === 'BSE_EQ'
    );
    instrumentsLastFetched = now;
    return cachedInstruments;
  } catch (err) {
    console.warn('Error downloading Upstox instrument master:', err instanceof Error ? err.message : err);
    return cachedInstruments || [];
  }
}

/**
 * Finds the best instrument key for a given IPO symbol or company name.
 */
function findInstrumentKey(
  symbol: string,
  companyName: string,
  instruments: UpstoxInstrument[]
): string | null {
  const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Exact match on NSE trading_symbol
  const nseExact = instruments.find(
    (i) => i.segment === 'NSE_EQ' && i.trading_symbol && i.trading_symbol.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanSymbol
  );
  if (nseExact) return nseExact.instrument_key;

  // 2. Exact match on BSE trading_symbol
  const bseExact = instruments.find(
    (i) => i.segment === 'BSE_EQ' && i.trading_symbol && i.trading_symbol.toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanSymbol
  );
  if (bseExact) return bseExact.instrument_key;

  // 3. Name startsWith or symbol startsWith match
  if (cleanSymbol.length >= 4) {
    const nsePrefix = instruments.find(
      (i) => i.segment === 'NSE_EQ' && i.trading_symbol && (
        i.trading_symbol.toUpperCase().startsWith(cleanSymbol) ||
        cleanSymbol.startsWith(i.trading_symbol.toUpperCase())
      )
    );
    if (nsePrefix) return nsePrefix.instrument_key;
  }

  // 4. Clean company name match
  if (cleanName.length >= 6) {
    const nameMatch = instruments.find((i) => {
      if (!i.name) return false;
      const instNameClean = i.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return instNameClean.includes(cleanName) || cleanName.includes(instNameClean);
    });
    if (nameMatch) return nameMatch.instrument_key;
  }

  return null;
}

/**
 * Bulk fetches market quotes from Upstox for a list of IPOs.
 * Returns a map of `ipoId -> IpoMarketQuote`.
 */
export async function getBulkMarketQuotes(
  ipos: Array<{ id: string; symbol: string; companyName: string }>
): Promise<Map<string, IpoMarketQuote>> {
  const result = new Map<string, IpoMarketQuote>();
  const token = process.env.UPSTOX_ANALYTICS_TOKEN;

  if (!token || ipos.length === 0) {
    return result;
  }

  const now = Date.now();
  const missingKeys: Array<{ ipoId: string; instrumentKey: string }> = [];

  // Check cache first
  const instruments = await getUpstoxInstruments();

  for (const ipo of ipos) {
    const cached = quoteCache.get(ipo.id);
    if (cached && now - cached.timestamp < QUOTE_CACHE_TTL_MS) {
      result.set(ipo.id, cached.quote);
      continue;
    }

    const key = findInstrumentKey(ipo.symbol, ipo.companyName, instruments);
    if (key) {
      missingKeys.push({ ipoId: ipo.id, instrumentKey: key });
    }
  }

  if (missingKeys.length === 0) {
    return result;
  }

  // Batch query in groups of 50 (Upstox supports bulk comma-separated keys)
  const batchSize = 50;
  for (let i = 0; i < missingKeys.length; i += batchSize) {
    const batch = missingKeys.slice(i, i + batchSize);
    const instrumentKeysParam = batch.map((b) => b.instrumentKey).join(',');
    const url = `https://api.upstox.com/v3/market-quote/ltp?instrument_key=${encodeURIComponent(instrumentKeysParam)}`;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 30 },
      });

      if (!res.ok) {
        console.warn(`Upstox LTP V3 batch fetch failed: HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      const quoteData = json.data as Record<
        string,
        {
          last_price?: number;
          cp?: number;
          ltq?: number;
          volume?: number;
          instrument_token?: string;
          symbol?: string;
        }
      >;

      if (!quoteData) continue;

      const quoteList = Object.values(quoteData);

      for (const item of batch) {
        // Find matching quote in response by instrument_token, instrumentKey, or symbol
        const matchedQuote = quoteList.find((q: { instrument_token?: string; symbol?: string }) => {
          if (!q) return false;
          if (q.instrument_token && q.instrument_token === item.instrumentKey) return true;
          const symbolPart = item.instrumentKey.split('|')[1];
          if (q.symbol && symbolPart && q.symbol.toUpperCase() === symbolPart.toUpperCase()) return true;
          return false;
        });

        if (matchedQuote && matchedQuote.last_price != null && !isNaN(Number(matchedQuote.last_price))) {
          const ltp = Number(matchedQuote.last_price);
          const cp = matchedQuote.cp != null && !isNaN(Number(matchedQuote.cp)) ? Number(matchedQuote.cp) : undefined;
          const netChange = cp != null ? ltp - cp : undefined;
          const changePercent = cp != null && cp > 0 ? ((ltp - cp) / cp) * 100 : undefined;

          const parsedQuote: IpoMarketQuote = {
            ltp,
            change: netChange != null ? Number(netChange.toFixed(2)) : undefined,
            changePercent: changePercent != null ? Number(changePercent.toFixed(2)) : undefined,
            previousClose: cp,
            volume: matchedQuote.volume != null ? Number(matchedQuote.volume) : undefined,
            lastUpdated: new Date().toISOString(),
          };

          quoteCache.set(item.ipoId, { quote: parsedQuote, timestamp: now });
          result.set(item.ipoId, parsedQuote);
        }
      }
    } catch (err) {
      console.warn('Error fetching Upstox LTP V3 market quotes batch:', err instanceof Error ? err.message : err);
    }
  }

  return result;
}

