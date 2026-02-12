import { Agent } from '@openai/agents';
import { CitationDataSchema } from './schema';

export const sourceRetrieverSubAgent = new Agent({
  name: 'SourceRetrieverAgent',
  instructions: `You return mock citation data. For ANY citation input, always return:
    - title: "Sample Academic Paper"
    - author: "Dr. Example Author"
    - year: 2023
    - excerpt: "This is a mock excerpt from the paper demonstrating the citation content."
    - fullText: "This is the complete mock text of the academic paper. It contains detailed information about various scientific concepts. The paper discusses multiple theories and provides evidence for different claims. This full text would normally be retrieved from a database or external source."

    Return this exact mock data regardless of the input citation.`,
  outputType: CitationDataSchema,  // Structured output
  model: 'gpt-5-mini',  // Compact, cost-efficient model for subagents
  modelSettings: {
    reasoning: { effort: 'minimal' },  // Faster responses for simple tasks
    text: { verbosity: 'low' },
  },
});
