/**
 * GPT-based PMCID Finder
 * Uses GPT-5-mini with web search to find PMCID when PMC Converter fails
 *
 * This is a fallback when the DOI->PMCID conversion doesn't work
 * GPT-5-mini will search the web for the PMCID using the DOI and paper metadata
 */

import OpenAI from 'openai';

export async function findPMCIDWithGPT(params: {
  doi: string;
  title?: string;
  author?: string;
  year?: number;
}): Promise<string | null> {
  console.log('🤖 [GPT PMCID Finder] Searching for PMCID with web search...');
  console.log('   DOI:', params.doi);

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Find the PubMed Central ID (PMCID) for this paper:
- DOI: ${params.doi}
${params.title ? `- Title: ${params.title}` : ''}
${params.author ? `- Author: ${params.author}` : ''}
${params.year ? `- Year: ${params.year}` : ''}

Search PubMed Central (https://www.ncbi.nlm.nih.gov/pmc/) or NCBI databases to find the PMCID.

Return ONLY the PMCID in the format "PMC1234567" (PMC followed by numbers).
If you cannot find a PMCID, respond with exactly "NOT_FOUND".
Do NOT include any explanation or additional text.`;

    // Use Responses API with web_search tool
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
      tools: [
        { type: 'web_search' }, // Enable web search
      ],
      input: prompt,
    });

    // Extract the output text from the response
    const result = response.output_text?.trim();

    if (!result || result === 'NOT_FOUND') {
      console.log('❌ [GPT PMCID Finder] Could not find PMCID');
      return null;
    }

    // Validate PMCID format (should be PMC followed by digits)
    const pmcidMatch = result.match(/PMC\d+/i);
    if (pmcidMatch) {
      const pmcid = pmcidMatch[0].toUpperCase(); // Ensure PMC is uppercase
      console.log('✅ [GPT PMCID Finder] Found PMCID:', pmcid);
      return pmcid;
    }

    console.log('⚠️  [GPT PMCID Finder] Invalid format:', result);
    return null;
  } catch (error) {
    console.error('❌ [GPT PMCID Finder] Error:', error);
    return null;
  }
}
