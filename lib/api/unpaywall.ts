/**
 * Unpaywall API Client
 * Docs: https://unpaywall.org/products/api
 * Purpose: Get free PDF URLs for articles
 * Note: Returns PDF URL, not text. Would need PDF parser to extract text.
 */

import { fetchJSON } from './client';

export async function getPDFUrl(doi: string): Promise<string | null> {
  const email = process.env.UNPAYWALL_EMAIL || process.env.PUBMED_EMAIL || 'default@example.com';
  const url = `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${email}`;

  console.log('📎 [Unpaywall] Looking for PDF:', doi);

  const data = await fetchJSON<any>(url);

  const pdfUrl = data?.best_oa_location?.url_for_pdf;

  if (pdfUrl) {
    console.log('✅ [Unpaywall] PDF found:', pdfUrl);
    // Note: We would need a PDF parser to extract text
    // For now, return the URL (or skip this source)
    return pdfUrl;
  }

  console.log('❌ [Unpaywall] No free PDF available');
  return null;
}
