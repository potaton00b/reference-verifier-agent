import { Agent } from '@openai/agents';
import { VerificationResultSchema } from './schema';

export const claimVerifierSubAgent = new Agent({
  name: 'ClaimVerifierAgent',
  instructions: `You are a STUB agent. Always return:
    - verdict: "cannot_verify"
    - confidence: "low"
    - evidence: [] (empty array)
    - notes: "This is a stub agent. Real claim verification is not implemented yet."

    Return this exact stub response regardless of input.`,
  outputType: VerificationResultSchema,
  model: 'gpt-5-mini',
  modelSettings: {
    reasoning: { effort: 'minimal' },
    text: { verbosity: 'low' },
  },
});
