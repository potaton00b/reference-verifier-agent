/**
 * PubMed E-utilities API Client
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 * Purpose: Fetch abstracts using PMID
 */

import { fetchWithTimeout } from './client';

export async function getAbstract(pmid: string): Promise<string | null> {
  const email = process.env.PUBMED_EMAIL || 'default@example.com';
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml&rettype=abstract&email=${email}`;

  console.log('🧬 [PubMed] Fetching abstract:', pmid);

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.log('❌ [PubMed] Abstract not available');
      return null;
    }

    const xml = await response.text();

    // Extract abstract from XML (basic regex extraction)
    const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/);

    if (abstractMatch) {
      const abstract = abstractMatch[1]
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      console.log('✅ [PubMed] Abstract retrieved:', abstract.length, 'chars');
      return abstract;
    }

    console.log('❌ [PubMed] No abstract found in XML');
    return null;
  } catch (error) {
    console.error('❌ [PubMed] Error:', error);
    return null;
  }
}
