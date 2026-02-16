/**
 * CrossRef API Client
 * Docs: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
 * Purpose: Lookup DOI from citation metadata (title, author, year)
 */

import { fetchJSON } from './client';

export async function lookupDOI(params: {
  title: string;
  author?: string;
  year?: number;
}): Promise<string | null> {
  const query = [params.title, params.author, params.year]
    .filter(Boolean)
    .join(' ');

  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=1`;

  console.log('🔍 [CrossRef] Looking up DOI:', query.substring(0, 50));

  const data = await fetchJSON<any>(url);

  if (data?.message?.items?.[0]?.DOI) {
    const doi = data.message.items[0].DOI;
    console.log('✅ [CrossRef] Found DOI:', doi);
    return doi;
  }

  console.log('❌ [CrossRef] No DOI found');
  return null;
}
