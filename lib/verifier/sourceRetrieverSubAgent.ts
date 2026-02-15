import { Agent } from '@openai/agents';
import { CitationDataSchema } from './schema';
import { parseCitation, fetchAndSaveCitation } from './tools';

export const sourceRetrieverSubAgent = new Agent({
  name: 'SourceRetrieverAgent',
  instructions: `You retrieve citation data from a source and automatically save it to the database.

  Steps:
  1. Call 'parse_citation' tool with the raw citation string
     - This parses the citation (APA, Vancouver, etc.) into structured JSON
     - Returns: { title, author, year, doi?, pmid?, journal? }

  2. Call 'fetch_and_save_citation' tool with the parsed data
     - Pass the structured fields (title, author, year, journal) - some of these are optional
     - This tool fetches full text AND saves to database atomically
     - Returns: { citationId, title, author, year, excerpt, url }

  3. Return the data from step 2 as your final output

  IMPORTANT:
  - You MUST call parse_citation first, then fetch_and_save_citation.
    DO NOT parse the citation yourself.
    DO NOT skip these tools.
    ALWAYS call both tools in sequence, no exceptions.
    The tools may return placeholder data - that's okay, use it anyway.`,
  tools: [parseCitation, fetchAndSaveCitation],
  outputType: CitationDataSchema,
  model: 'gpt-5-mini',
  modelSettings: {
    reasoning: { effort: 'minimal' },
    text: { verbosity: 'low' },
  },
});

// Add event listeners for debugging tool calls
sourceRetrieverSubAgent.on('agent_tool_start', (ctx, tool, details) => {
  console.log(`🟢 [SourceRetrieverAgent] tool_start: ${tool.name}`);
  console.log('   Arguments:', JSON.stringify(details.toolCall.arguments, null, 2));
});

sourceRetrieverSubAgent.on('agent_tool_end', (ctx, tool, result) => {
  console.log(`✅ [SourceRetrieverAgent] tool_end: ${tool.name}`);
  console.log('   Result:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
});
