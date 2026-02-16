/**
 * PMC ID Converter API Client
 * Docs: https://pmc.ncbi.nlm.nih.gov/tools/id-converter-api/
 * Purpose: Convert DOI to PMID and PMCID
 */

import { fetchJSON } from './client';

export interface PMCIdentifiers {
  pmid?: string;
  pmcid?: string;
  doi?: string;
}

export async function convertDOItoPMC(doi: string): Promise<PMCIdentifiers | null> {
  const email = process.env.PUBMED_EMAIL || 'default@example.com';
  const url = `https://www.ncbi.nlm.nih.gov/pmc/utils/idconv/v1.0/?tool=verifier&email=${email}&ids=${encodeURIComponent(doi)}&format=json`;

  console.log('🔄 [PMC Converter] Converting DOI:', doi);

  const data = await fetchJSON<any>(url);

  if (data?.records?.[0]) {
    const record = data.records[0];
    const result: PMCIdentifiers = {
      pmid: record.pmid,
      pmcid: record.pmcid,
      doi: record.doi,
    };
    console.log('✅ [PMC Converter] Found:', JSON.stringify(result));
    return result;
  }

  console.log('❌ [PMC Converter] No identifiers found');
  return null;
}
