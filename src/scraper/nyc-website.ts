// src/scraper/nyc-website.ts
import { parseHTML } from 'linkedom';
import { retry } from '../utils/retry';
import { getNycNow } from '../utils/date-utils';
import { ScrapeResult } from '../types';

const NYC_ASP_URL = 'https://www.nyc.gov/html/dot/html/motorist/alternate-side-parking.shtml';

/**
 * Scrape NYC DOT website to check if ASP is suspended today
 */
export async function scrapeNycWebsite(): Promise<ScrapeResult> {
  const html = await retry(
    async () => {
      const res = await fetch(NYC_ASP_URL);
      if (!res.ok) {
        throw new Error(`Failed to fetch NYC website: ${res.status}`);
      }
      return await res.text();
    },
    { maxAttempts: 3, initialDelayMs: 1000 }
  );

  return parseHtmlForSuspension(html);
}

/**
 * Parse HTML to detect suspension status
 */
export function parseHtmlForSuspension(html: string): ScrapeResult {
  const { document } = parseHTML(html);

  // Look for common suspension indicators
  const bodyText = document.body.textContent?.toLowerCase() || '';

  const suspensionPhrases = [
    'asp is suspended',
    'alternate side parking is suspended',
    'parking rules are suspended',
    'asp suspended today',
    'not in effect today',
    'suspended due to',
  ];

  for (const phrase of suspensionPhrases) {
    if (bodyText.includes(phrase)) {
      // Try to extract reason
      const reason = extractSuspensionReason(bodyText, phrase);

      return {
        isSuspendedToday: true,
        reason,
        scrapedAt: getNycNow(),
      };
    }
  }

  return {
    isSuspendedToday: false,
    scrapedAt: getNycNow(),
  };
}

/**
 * Attempt to extract the reason for suspension from text
 */
function extractSuspensionReason(text: string, foundPhrase: string): string | undefined {
  const reasonKeywords = ['snow', 'weather', 'emergency', 'holiday'];

  for (const keyword of reasonKeywords) {
    if (text.includes(keyword)) {
      return keyword;
    }
  }

  // Default reason
  return 'emergency';
}
