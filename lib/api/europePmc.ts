/**
 * Europe PMC API Client
 * Docs: https://europepmc.org/developers
 * Purpose: Fetch full text XML for Open Access articles
 */

import { fetchWithTimeout } from './client';

export async function getFullText(pmcid: string): Promise<string | null> {
  // Ensure PMCID format (should start with PMC)
  const cleanPMCID = pmcid.startsWith('PMC') ? pmcid : `PMC${pmcid}`;

  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/${cleanPMCID}/fullTextXML`;

  console.log('📄 [Europe PMC] Fetching full text:', cleanPMCID);

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.log('❌ [Europe PMC] Full text not available');
      return null;
    }

    const xml = await response.text();

    // Convert XML to plain text (basic extraction)
    const text = xml
      .replace(/<[^>]*>/g, ' ')  // Remove XML tags
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();

    console.log('✅ [Europe PMC] Full text retrieved:', text.length, 'chars');
    return text;
  } catch (error) {
    console.error('❌ [Europe PMC] Error:', error);
    return null;
  }
}
