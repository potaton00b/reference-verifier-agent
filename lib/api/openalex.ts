/**
 * OpenAlex API Client
 * Docs: https://docs.openalex.org/
 * Purpose: Get abstracts (inverted index format)
 * Note: API key required starting Feb 13, 2026 (free)
 */

import { fetchJSON } from './client';

export async function getAbstract(doi: string): Promise<string | null> {
  const url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`;

  const headers: Record<string, string> = {};
  if (process.env.OPENALEX_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.OPENALEX_API_KEY}`;
  }

  console.log('📚 [OpenAlex] Fetching abstract:', doi);

  const data = await fetchJSON<any>(url, { headers });

  // OpenAlex provides abstracts as inverted index
  const invertedIndex = data?.abstract_inverted_index;

  if (invertedIndex) {
    // Convert inverted index to plain text
    const words: Array<{ word: string; position: number }> = [];

    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions as number[]) {
        words.push({ word, position: pos });
      }
    }

    const abstract = words
      .sort((a, b) => a.position - b.position)
      .map(w => w.word)
      .join(' ');

    console.log('✅ [OpenAlex] Abstract retrieved:', abstract.length, 'chars');
    return abstract;
  }

  console.log('❌ [OpenAlex] No abstract available');
  return null;
}
