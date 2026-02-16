import { tool } from '@openai/agents';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import OpenAI from 'openai';
import * as crossref from '@/lib/api/crossref';
import * as pmcConverter from '@/lib/api/pmcConverter';
import * as europePmc from '@/lib/api/europePmc';
import * as pubmedFullText from '@/lib/api/pubmedFullText';
import * as openalex from '@/lib/api/openalex';
import * as pubmed from '@/lib/api/pubmed';
import { searchAbstractWithGPT } from '@/lib/api/webSearchFallback';
import { findPMCIDWithGPT } from '@/lib/api/gptPmcidFinder';

// ============================================================================
// Execute Functions (exported for testing)
// ============================================================================

/**
 * Parses a citation string into structured metadata using GPT-5-mini
 */
export async function executeParseCitation(args: {
  citation: string;
}) {
  console.log('🔧 [TOOL] parseCitation called!');
  console.log('   Input citation:', args.citation.substring(0, 100) + (args.citation.length > 100 ? '...' : ''));

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const systemPrompt = `You are a citation parser. Extract structured metadata from academic citations.

Extract these fields if present:
- title: The paper/article title
- author: Primary author name
- year: Publication year (as a number)
- journal: Journal or publication name
- doi: Digital Object Identifier (if present)
- pmid: PubMed ID (if present)

IMPORTANT: Only include fields that are explicitly present in the citation. If a field is missing, omit it from your response or set it to undefined. Do NOT make up or infer missing information.

Return valid JSON matching this structure:
{
  "title": string,
  "author": string,
  "year": number,
  "doi": string | undefined,
  "pmid": string | undefined,
  "journal": string | undefined
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Parse this citation:\n\n${args.citation}` }
      ],
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');

    const result = {
      title: parsed.title || "Unknown Title",
      author: parsed.author,
      year: parsed.year,
      doi: parsed.doi,
      pmid: parsed.pmid,
      journal: parsed.journal,
    };

    console.log('✅ [TOOL] Citation parsed successfully!');
    console.log('   Output:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ [TOOL] Citation parsing failed!');
    console.error('   Error:', error);

    // Return a fallback result to prevent complete failure
    return {
      title: "Error: Unable to parse citation",
      author: undefined,
      year: undefined,
      doi: undefined,
      pmid: undefined,
      journal: undefined,
    };
  }
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

  let fullText: string | null = null;
  let fetchedDOI = args.doi;
  let pmid = args.pmid;
  let pmcid: string | undefined;

  // ========================================
  // STEP 1: Get DOI if missing
  // ========================================
  if (!fetchedDOI || fetchedDOI === '') {
    console.log('📍 [STEP 1] DOI missing, looking up via CrossRef...');
    fetchedDOI = await crossref.lookupDOI({
      title: args.title,
      author: args.author,
      year: args.year,
    }) || '';
  } else {
    console.log('📍 [STEP 1] DOI already provided:', fetchedDOI);
  }

  // ========================================
  // STEP 2: Convert DOI to PMID/PMCID
  // ========================================
  if (fetchedDOI) {
    console.log('🔄 [STEP 2] Converting DOI to PMID/PMCID...');
    const identifiers = await pmcConverter.convertDOItoPMC(fetchedDOI);
    if (identifiers) {
      pmid = identifiers.pmid || pmid;
      pmcid = identifiers.pmcid;
      console.log('   PMID:', pmid, '| PMCID:', pmcid);
    }

    // ========================================
    // STEP 2b: GPT Fallback for PMCID (if not found)
    // ========================================
    if (!pmcid) {
      console.log('🤖 [STEP 2b] PMCID not found, trying GPT fallback...');
      pmcid = await findPMCIDWithGPT({
        doi: fetchedDOI,
        title: args.title,
        author: args.author,
        year: args.year,
      }) || undefined;
      if (pmcid) {
        console.log('   ✅ GPT found PMCID:', pmcid);
      } else {
        console.log('   ❌ GPT could not find PMCID');
      }
    }
  }

  // ========================================
  // STEP 3: Try Full Text (PARALLEL - Europe PMC + US PubMed)
  // ========================================
  console.log('📄 [STEP 3] Attempting full text retrieval (parallel from 2 sources)...');

  if (pmcid) {
    // Race between Europe PMC and US PubMed Central
    // Whichever responds first with actual content wins
    const fullTextPromises = [
      europePmc.getFullText(pmcid).then(result => ({ source: 'Europe PMC', result })),
      pubmedFullText.getFullText(pmcid).then(result => ({ source: 'US PubMed', result })),
    ];

    try {
      // Wait for first successful result (not just first response)
      const winner = await Promise.race(
        fullTextPromises.map(p =>
          p.then(({ source, result }) => {
            if (result) {
              console.log(`   🏆 ${source} won the race!`);
              return result;
            }
            // If result is null, reject so race continues
            return Promise.reject('No content');
          })
        )
      );
      fullText = winner;
    } catch (error) {
      // All sources failed or returned null
      console.log('   ❌ Both full text sources failed');
      fullText = null;
    }
  } else {
    console.log('   ⚠️  No PMCID available, skipping full text retrieval');
  }

  // ========================================
  // STEP 4: Try Abstract (PARALLEL) if no full text
  // ========================================
  if (!fullText) {
    console.log('📝 [STEP 4] Full text unavailable, attempting abstract (parallel)...');

    const abstractPromises: Promise<string | null>[] = [];

    if (pmid) {
      abstractPromises.push(pubmed.getAbstract(pmid));
    }

    if (fetchedDOI) {
      abstractPromises.push(openalex.getAbstract(fetchedDOI));
    }

    if (abstractPromises.length > 0) {
      fullText = await Promise.race(
        abstractPromises.map(p => p.catch(() => null))
      );
    }
  }

  // ========================================
  // STEP 5: GPT Web Search Fallback
  // ========================================
  if (!fullText) {
    console.log('🤖 [STEP 5] All APIs failed, using GPT web search fallback...');
    fullText = await searchAbstractWithGPT({
      title: args.title,
      author: args.author,
      year: args.year,
    });
  }

  // ========================================
  // STEP 6: Save to Database
  // ========================================
  console.log('💾 [STEP 6] Saving to database...');

  const finalFullText = fullText || 'No content available. Citation could not be retrieved from any source.';

  try {
    const savedCitation = await prisma.citation.create({
      data: {
        title: args.title,
        author: args.author,
        year: args.year,
        url: fetchedDOI ? `https://doi.org/${fetchedDOI}` : undefined,
        excerpt: '', // Will be populated later by claim verification
        fullText: finalFullText,
      },
    });

    console.log('✅ [TOOL] Successfully saved to database!');
    console.log('   Citation ID:', savedCitation.id);
    console.log('   Content length:', finalFullText.length, 'characters');

    // Return minimal data - just ID and metadata (NO fullText)
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
