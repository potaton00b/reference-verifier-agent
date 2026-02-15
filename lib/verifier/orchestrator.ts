import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { sourceRetrieverSubAgent } from './sourceRetrieverSubAgent';
import { claimVerifierSubAgent } from './claimVerifierSubAgent';
import { OrchestratorResponseSchema } from './schema';

const orchestratorAgent = new Agent({
  name: 'OrchestratorAgent',
  instructions: `You coordinate verification by calling subagent tools.
  CRITICAL RULE (read first): You are an orchestrator. DO NOT verify claims yourself.
  You MUST use the available subagents for retrieval and verification.
    1. First, call 'SourceRetrieverSubAgent' with the citation to retrieve source information
       - This returns citationId (full text is saved to database automatically)
    2. Then, call 'ClaimVerifierSubAgent' with the claim and citationId
       - This retrieves full text from database internally and verifies the claim
    3. Return a combined result that includes BOTH:
       - The verification result (verdict, confidence, evidence, notes) from ClaimVerifierSubAgent
       - The citation data (title, author, year, excerpt, citationId) from SourceRetrieverSubAgent
    4. You MUST call SourceRetrieverSubAgent first - DO NOT skip it.
        Pass the citation parameter to SourceRetrieverSubAgent.
        Wait for it to return a citationId.
        Then call ClaimVerifierSubAgent with that citationId.
        Do NOT generate citationData yourself.
    5. MOST IMPORTANTLY, DO NOT DO THE VERIFICATION YOURSELF. You MUST use the agents available to you.

    IMPORTANT: Pass the citationId from SourceRetriever to ClaimVerifier, NOT the fullText.`,
  tools: [
    sourceRetrieverSubAgent.asTool({
      toolDescription: 'Retrieves the full-text or abstract data from any reference format (APA, Vancouver, etc). Call this first with the citation to get reference information.',
      parameters: z.object({
        citation: z.string().describe('The citation URL or reference text to retrieve (e.g., "https://example.com/paper" or "Smith et al. 2023")'),
      }),
      inputBuilder: (options) => options.params.citation,
    }),  // Manager Pattern: subagent as tool
    claimVerifierSubAgent.asTool({
      toolDescription: 'Verifies a claim against citation data. Call this after retrieving source information.',
      parameters: z.object({
        claim: z.string().describe('The claim statement to verify'),
        citationId: z.string().describe('The citation ID to retrieve full text from database'),
      }),  
      inputBuilder: (options) =>
        `Verify this claim: "${options.params.claim}"\nCitation ID: ${options.params.citationId}`,
    }),
  ],
  outputType: OrchestratorResponseSchema,  // Now safe - tools are being called thanks to toolChoice: 'required'
  model: 'gpt-5',  // More capable model for better instruction following
  modelSettings: {
    reasoning: { effort: 'medium' },
    text: { verbosity: 'low' },
    toolChoice: 'required',  // Force model to call tools instead of fabricating output
  },
});

// Add event listeners for debugging tool calls
orchestratorAgent.on('agent_tool_start', (ctx, tool, details) => {
  console.log(`🔵 [OrchestratorAgent] tool_start: ${tool.name}`);
  console.log('   Arguments:', JSON.stringify(details.toolCall.arguments, null, 2));
});

orchestratorAgent.on('agent_tool_end', (ctx, tool, result, details) => {
  console.log(`✅ [OrchestratorAgent] tool_end: ${tool.name}`);
  console.log('   Result:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
});

export async function verify(claim: string, citation: string) {
  console.log('\n🎯 [ORCHESTRATOR] Starting verification...');
  console.log('   Claim:', claim.substring(0, 100) + (claim.length > 100 ? '...' : ''));
  console.log('   Citation:', citation.substring(0, 100) + (citation.length > 100 ? '...' : ''));
  console.log('   Tools available:', orchestratorAgent.tools?.map(t => t.name).join(', ') || 'none');

  const result = await run(
    orchestratorAgent,
    `Verify this claim: "${claim}" using this citation: "${citation}"`
  );

  console.log('✅ [ORCHESTRATOR] Verification complete!');
  console.log('   Result:', JSON.stringify(result.finalOutput, null, 2));
  console.log('─'.repeat(80) + '\n');

  return result.finalOutput;
}
