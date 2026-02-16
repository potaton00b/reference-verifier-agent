/**
 * PubMed Central Full Text API Client
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25499/
 * Purpose: Fetch full text XML from US PubMed Central using E-utilities efetch
 *
 * IMPORTANT: This retrieves from US PubMed Central, not Europe PMC
 * These are different databases with different content coverage
 */

import { fetchWithTimeout } from './client';

export async function getFullText(pmcid: string): Promise<string | null> {
  // Strip "PMC" prefix if present - NCBI expects numeric ID only
  const pmcidNumber = pmcid.replace(/^PMC/i, '');

  // Build URL with all recommended parameters
  const params = new URLSearchParams({
    db: 'pmc',                    // Database: PubMed Central
    id: pmcidNumber,              // PMCID (numeric only)
    retmode: 'xml',               // Return format: XML
    tool: 'verifier',             // Tool identifier (required)
    email: process.env.PUBMED_EMAIL || 'default@example.com', // Email (required)
  });

  // Add API key if available (increases rate limit from 3/sec to 10/sec)
  if (process.env.NCBI_API_KEY) {
    params.append('api_key', process.env.NCBI_API_KEY);
  }

  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?${params.toString()}`;

  console.log('🧬 [US PubMed] Fetching full text:', `PMC${pmcidNumber}`);

  try {
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      console.log('❌ [US PubMed] Full text not available (HTTP', response.status + ')');
      return null;
    }

    const xml = await response.text();

    // Check for NCBI error messages in XML
    if (xml.includes('<ERROR>') || xml.includes('error')) {
      console.log('❌ [US PubMed] API returned error');
      return null;
    }

    // Check if we got actual content (not just empty response)
    if (xml.length < 100) {
      console.log('❌ [US PubMed] Response too short, likely no content');
      return null;
    }

    // Convert XML to plain text (basic extraction)
    // This removes all XML tags and normalizes whitespace
    const text = xml
      .replace(/<[^>]*>/g, ' ')  // Remove XML tags
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();

    console.log('✅ [US PubMed] Full text retrieved:', text.length, 'chars');
    return text;
  } catch (error) {
    console.error('❌ [US PubMed] Error:', error);
    return null;
  }
}
