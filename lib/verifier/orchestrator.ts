import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { sourceRetrieverSubAgent } from './sourceRetrieverSubAgent';
import { claimVerifierSubAgent } from './claimVerifierSubAgent';
import { VerificationResponseSchema } from './schema';

const orchestratorAgent = new Agent({
  name: 'OrchestratorAgent',
  instructions: `You coordinate verification by calling subagent tools:
    1. First, call the 'SourceRetrieverAgent' tool with the citation to retrieve source information
    2. Then, call the 'ClaimVerifierAgent' tool with the claim and source data to verify
    3. Return a combined result that includes BOTH:
       - The verification result (verdict, confidence, evidence, notes) from ClaimVerifierAgent
       - The citation data (title, author, year, fullText, excerpt, url) from SourceRetrieverAgent

    Always call both tools in this sequence and include all data from both in your final response.`,
  tools: [
    sourceRetrieverSubAgent.asTool({
      toolDescription: 'Retrieves citation data from a source. Call this first with the citation to get source information.',
      parameters: z.object({
        citation: z.string().describe('The citation URL or reference text to retrieve (e.g., "https://example.com/paper" or "Smith et al. 2023")'),
      }),
      inputBuilder: (options) => options.params.citation,
    }),  // Manager Pattern: subagent as tool
    claimVerifierSubAgent.asTool({
      toolDescription: 'Verifies a claim against source data. Call this after retrieving source information.',
      parameters: z.object({
        claim: z.string().describe('The claim statement to verify (e.g., "The Earth orbits the Sun")'),
        sourceTitle: z.string().describe('The title of the source document'),
        fullText: z.string().describe('The complete full text content of the source document (not excerpts)'),
      }),
      inputBuilder: (options) =>
        `Verify this claim: "${options.params.claim}"\nSource: "${options.params.sourceTitle}"\n\nFull Text:\n${options.params.fullText}`,
    }),
  ],
  outputType: VerificationResponseSchema,  // Now returns combined result
  model: 'gpt-5-mini',  // Cost-efficient model, sufficient for simple orchestration
});

export async function verify(claim: string, citation: string) {
  const result = await run(
    orchestratorAgent,
    `Verify this claim: "${claim}" using this citation: "${citation}"`
  );

  return result.finalOutput;
}
