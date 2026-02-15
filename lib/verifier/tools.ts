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

  // TODO: In future, implement actual citation parsing logic
  // For now, return mock structured data

  const result = {
    title: "Sample Academic Paper",
    author: "Dr. Example Author",
    year: 2023,
    doi: "10.1234/example",        // Optional
    pmid: undefined,                 // Optional (PubMed ID)
    journal: "Nature"                // Optional
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

  // TODO: In future, this will:
  // 1. Try DOI resolver APIs (CrossRef, DataCite) if DOI provided
  // 2. Try PubMed API if PMID provided
  // 3. Fall back to web search using title + author + year
  // For now, return mock data

  const mockFullText = "This is the complete mock text of the academic paper. It contains detailed information about various scientific concepts. The paper discusses multiple theories and provides evidence for different claims. This full text would normally be retrieved from CrossRef, PubMed, or other academic databases.";

  const mockExcerpt = "This is a mock excerpt from the paper demonstrating the citation content.";

  console.log('💾 [TOOL] Attempting to save to database...');

  try {
    // Save to database
    const savedCitation = await prisma.citation.create({
      data: {
        title: args.title,
        author: args.author,
        year: args.year,
        url: args.doi && args.doi !== '' ? `https://doi.org/${args.doi}` : undefined,
        excerpt: mockExcerpt,
        fullText: mockFullText,
      },
    });

    console.log('✅ [TOOL] Successfully saved to database!');
    console.log('   Citation ID:', savedCitation.id);

    // Return minimal data - just the ID and basic metadata (NO fullText)
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
