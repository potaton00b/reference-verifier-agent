import { tool } from '@openai/agents';
import { z } from 'zod';
import { prisma } from '@/lib/db';

// ============================================================================
// Execute Functions (exported for testing)
// ============================================================================

/**
 * Parses a citation string into structured metadata
 */
export async function executeParseCitation(args: {
  citation: string;
}) {
  console.log('🔧 [TOOL] parseCitation called!');
  console.log('   Input citation:', args.citation.substring(0, 100) + (args.citation.length > 100 ? '...' : ''));

  const citation = args.citation.trim();

  // Extract DOI (various formats)
  const doiPatterns = [
    /doi[:\s]*(?:https?:\/\/(?:dx\.)?doi[.\-]?org\/)?(10\.\d{4,9}\/[^\s,;]+)/i,
    /https?:\/\/(?:dx\.)?doi[.\-]?(?:org|com)\/(10\.\d{4,9}\/[^\s,;]+)/i,
    /(10\.\d{4,9}\/[^\s,;]+)/,
  ];
  let doi: string | undefined;
  for (const pattern of doiPatterns) {
    const match = citation.match(pattern);
    if (match) {
      doi = match[1].replace(/[.)]+$/, ''); // strip trailing punctuation
      break;
    }
  }

  // Extract PMID
  const pmidMatch = citation.match(/PMID[:\s]*(\d+)/i);
  const pmid = pmidMatch ? pmidMatch[1] : undefined;

  // Extract year (4-digit number in parens or standalone)
  const yearMatch = citation.match(/\((\d{4})\)/) || citation.match(/\b((?:19|20)\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined;

  // Extract author (first segment before year/parens, or before period)
  let author: string | undefined;
  const authorMatch = citation.match(/^([^(.\d]+?)[\s]*[.(]/);
  if (authorMatch) {
    author = authorMatch[1].trim().replace(/,\s*$/, '');
  }

  // Extract title — text after "year)" or after first period
  let title: string | undefined;
  const titleAfterYear = citation.match(/\(\d{4}[a-z]?\)\.\s*(.+?)\./);
  if (titleAfterYear) {
    title = titleAfterYear[1].trim();
  } else {
    // Vancouver style: authors. Title. Journal...
    const parts = citation.split('. ');
    if (parts.length >= 2) {
      title = parts[1].trim().replace(/\.$/, '');
    }
  }

  // Extract journal — look for common patterns
  let journal: string | undefined;
  // Vancouver: "Journal Name. Year"
  const vanJournal = citation.match(/\.\s+([A-Z][^.]+?)\.\s+\d{4}/);
  // APA: "Journal Name, Volume"
  const apaJournal = citation.match(/\.\s+([A-Z][^.]+?),\s+\d+/);
  if (vanJournal) {
    journal = vanJournal[1].trim();
  } else if (apaJournal) {
    journal = apaJournal[1].trim();
  }

  const result = {
    title: title || "Unknown Title",
    author: author || "Unknown Author",
    year: year,
    doi: doi,
    pmid: pmid,
    journal: journal,
  };

  console.log('   Output:', JSON.stringify(result, null, 2));
  return result;
}

// ============================================================================
// Tool Definitions (for agent use)
// ============================================================================

// Tool 1: Parse citation string into structured data
export const parseCitation = tool({
  name: 'parse_citation',
  description: 'Parses a citation string in any format (APA, Vancouver, MLA, etc.) and extracts structured metadata including title, author, year, DOI, PMID, and journal.',
  parameters: z.object({
    citation: z.string().describe('The citation string to parse (e.g., "Smith, J. (2023). Climate Change. Nature, 123(4), 567-890. doi:10.1234/example")'),
  }),
  execute: executeParseCitation,
});

/**
 * Fetches metadata and abstract from CrossRef by DOI
 */
async function fetchFromCrossRef(doi: string): Promise<{ title: string; author: string; abstract: string; url: string } | null> {
  try {
    console.log('🌐 [TOOL] Fetching from CrossRef for DOI:', doi);
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`, {
      headers: { 'User-Agent': 'VerifierService/0.1 (mailto:verifier@example.com)' },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const work = data.message;

    const title = work.title?.[0] || 'Unknown Title';
    const authors = (work.author || [])
      .map((a: { family?: string; given?: string }) => `${a.given || ''} ${a.family || ''}`.trim())
      .join(', ');
    const abstract = work.abstract
      ? work.abstract.replace(/<[^>]*>/g, '') // strip HTML tags
      : '';
    const url = work.URL || `https://doi.org/${doi}`;

    console.log('✅ [TOOL] CrossRef returned data for:', title);
    return { title, author: authors || 'Unknown Author', abstract, url };
  } catch (error) {
    console.error('⚠️ [TOOL] CrossRef fetch failed:', error);
    return null;
  }
}

/**
 * Fetches abstract from PubMed by PMID
 */
async function fetchFromPubMed(pmid: string): Promise<{ title: string; author: string; abstract: string; url: string } | null> {
  try {
    console.log('🌐 [TOOL] Fetching from PubMed for PMID:', pmid);
    const res = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=abstract&retmode=xml`
    );
    if (!res.ok) return null;

    const xml = await res.text();

    // Simple XML extraction
    const titleMatch = xml.match(/<ArticleTitle>([\s\S]+?)<\/ArticleTitle>/);
    const abstractMatch = xml.match(/<AbstractText[^>]*>([\s\S]+?)<\/AbstractText>/);
    const authorMatches = [...xml.matchAll(/<LastName>(.+?)<\/LastName>\s*<ForeName>(.+?)<\/ForeName>/g)];

    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '') : 'Unknown Title';
    const author = authorMatches.length > 0
      ? authorMatches.map(m => `${m[2]} ${m[1]}`).join(', ')
      : 'Unknown Author';
    const abstract = abstractMatch ? abstractMatch[1].replace(/<[^>]*>/g, '') : '';

    console.log('✅ [TOOL] PubMed returned data for:', title);
    return { title, author, abstract, url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
  } catch (error) {
    console.error('⚠️ [TOOL] PubMed fetch failed:', error);
    return null;
  }
}

/**
 * Fetches full text using structured metadata and saves to database
 */
export async function executeFetchAndSaveCitation(args: {
  title: string;
  author: string;
  year: number;
  doi: string;
  pmid: string;
  journal: string;
}) {
  console.log('🔧 [TOOL] fetchAndSaveCitation called!');
  console.log('   Input:', JSON.stringify(args, null, 2));

  let fetchedTitle = args.title;
  let fetchedAuthor = args.author;
  let fullText = '';
  let url: string | undefined;

  // 1. Try CrossRef if DOI is available
  if (args.doi && args.doi !== '') {
    const crossRefData = await fetchFromCrossRef(args.doi);
    if (crossRefData) {
      fetchedTitle = crossRefData.title;
      fetchedAuthor = crossRefData.author;
      fullText = crossRefData.abstract;
      url = crossRefData.url;
    }
  }

  // 2. Try PubMed if PMID is available and we don't have text yet
  if (!fullText && args.pmid && args.pmid !== '') {
    const pubmedData = await fetchFromPubMed(args.pmid);
    if (pubmedData) {
      fetchedTitle = pubmedData.title;
      fetchedAuthor = pubmedData.author;
      fullText = pubmedData.abstract;
      url = pubmedData.url;
    }
  }

  // 3. If we still have no text, try CrossRef title search as fallback
  if (!fullText && args.title && args.title !== 'Unknown Title') {
    try {
      console.log('🌐 [TOOL] Trying CrossRef title search...');
      const query = encodeURIComponent(args.title);
      const res = await fetch(`https://api.crossref.org/works?query.title=${query}&rows=1`, {
        headers: { 'User-Agent': 'VerifierService/0.1 (mailto:verifier@example.com)' },
      });
      if (res.ok) {
        const data = await res.json();
        const work = data.message?.items?.[0];
        if (work) {
          fetchedTitle = work.title?.[0] || fetchedTitle;
          fullText = work.abstract ? work.abstract.replace(/<[^>]*>/g, '') : '';
          url = url || work.URL;
        }
      }
    } catch (error) {
      console.error('⚠️ [TOOL] CrossRef title search failed:', error);
    }
  }

  if (!fullText) {
    fullText = `No full text or abstract could be retrieved for: ${fetchedTitle}`;
    console.log('⚠️ [TOOL] Could not retrieve text from any source');
  }

  const excerpt = fullText.length > 300 ? fullText.substring(0, 300) + '...' : fullText;

  console.log('💾 [TOOL] Attempting to save to database...');

  try {
    const savedCitation = await prisma.citation.create({
      data: {
        title: fetchedTitle,
        author: fetchedAuthor,
        year: args.year,
        url: url || (args.doi && args.doi !== '' ? `https://doi.org/${args.doi}` : undefined),
        excerpt,
        fullText,
      },
    });

    console.log('✅ [TOOL] Successfully saved to database!');
    console.log('   Citation ID:', savedCitation.id);

    return {
      citationId: savedCitation.id,
      title: savedCitation.title,
      author: savedCitation.author,
      year: savedCitation.year,
      excerpt: savedCitation.excerpt,
      url: savedCitation.url,
    };
  } catch (error) {
    console.error('❌ [TOOL] Database save failed!');
    console.error('   Error:', error);
    throw error;
  }
}

// Tool 2: Fetch full text using structured metadata and save to database
export const fetchAndSaveCitation = tool({
  name: 'fetch_and_save_citation',
  description: 'Fetches full text from academic sources using structured citation metadata (title, author, year, DOI, PMID) and saves it to the database. Returns a citation ID for future reference.',
  parameters: z.object({
    title: z.string().describe('The title of the academic paper'),
    author: z.string().describe('The primary author name'),
    year: z.number().describe('The publication year'),
    doi: z.string().default('').describe('Digital Object Identifier (if available, empty string if not)'),
    pmid: z.string().default('').describe('PubMed ID (if available, empty string if not)'),
    journal: z.string().default('').describe('Journal name (if available, empty string if not)'),
  }),
  execute: executeFetchAndSaveCitation,
});

/**
 * Retrieves full text from the database using a citation ID
 */
export async function executeReadFullTextFromDatabase(args: {
  citationId: string;
}) {
  console.log('🔧 [TOOL] readFullTextFromDatabase called!');
  console.log('   Citation ID:', args.citationId);

  try {
    const citation = await prisma.citation.findUnique({
      where: { id: args.citationId },
      select: {
        fullText: true,
        title: true,
      },
    });

    if (!citation) {
      console.error('❌ [TOOL] Citation not found in database!');
      throw new Error(`Citation with ID ${args.citationId} not found`);
    }

    console.log('✅ [TOOL] Successfully retrieved from database!');
    console.log('   Title:', citation.title);
    console.log('   Full text length:', citation.fullText.length, 'characters');

    return {
      fullText: citation.fullText,
      title: citation.title,
    };
  } catch (error) {
    console.error('❌ [TOOL] Database read failed!');
    console.error('   Error:', error);
    throw error;
  }
}

// Tool 3: Read full text from database
export const readFullTextFromDatabase = tool({
  name: 'read_full_text_from_database',
  description: 'Retrieves full text from the database using a citation ID.',
  parameters: z.object({
    citationId: z.string().describe('The citation ID to retrieve full text for'),
  }),
  execute: executeReadFullTextFromDatabase,
});
