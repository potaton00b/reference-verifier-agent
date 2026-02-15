import { Agent } from '@openai/agents';
import { ClaimVerificationResultSchema } from './schema';
import { readFullTextFromDatabase } from './tools';

export const claimVerifierSubAgent = new Agent({
  name: 'ClaimVerifierAgent',
  instructions: `You verify claims against full-text retrieved from the database.

  Steps:
  1. Receive claim and citationId as input
  2. Call 'read_full_text_from_database' tool with the citationId to retrieve fullText
  3. Analyze the fullText to verify the claim (currently stub)
  4. Return verdict, confidence, evidence, and notes

  STUB BEHAVIOR (for now):
  - Always return "cannot_verify" verdict
  - Always return "low" confidence
  - Return empty evidence array
  - Note: "This is a stub agent. Real claim verification is not implemented yet."`,
  tools: [readFullTextFromDatabase],
  outputType: ClaimVerificationResultSchema,
  model: 'gpt-5-mini',
  modelSettings: {
    reasoning: { effort: 'minimal' },
    text: { verbosity: 'low' },
  },
});

// Add event listeners for debugging tool calls
claimVerifierSubAgent.on('agent_tool_start', (ctx, tool, details) => {
  console.log(`🟡 [ClaimVerifierAgent] tool_start: ${tool.name}`);
  console.log('   Arguments:', JSON.stringify(details.toolCall.arguments, null, 2));
});

claimVerifierSubAgent.on('agent_tool_end', (ctx, tool, result) => {
  console.log(`✅ [ClaimVerifierAgent] tool_end: ${tool.name}`);
  console.log('   Result:', result.substring(0, 200) + (result.length > 200 ? '...' : ''));
});
