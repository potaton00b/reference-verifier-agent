import { z } from 'zod';

// Schema for claim verification result (output from ClaimVerifier agent)
export const ClaimVerificationResultSchema = z.object({
  verdict: z.enum(['supports', 'contradicts', 'cannot_verify']),
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.array(z.string()),
  notes: z.string(),
});

// Schema for citation data (sourceRetriever output)
export const CitationDataSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  year: z.number().optional(),
  url: z.string().optional(),
  excerpt: z.string(),
  citationId: z.string(),  // Reference ID to retrieve full text from database
});

// Combined schema for orchestrator response (verification + citation data from Orchestrator agent)
export const OrchestratorResponseSchema = z.object({
  verdict: z.enum(['supports', 'contradicts', 'cannot_verify']),
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.array(z.string()),
  notes: z.string(),
  citationData: CitationDataSchema,  // Include the full citation data
});

// Export TypeScript types
export type ClaimVerificationResult = z.infer<typeof ClaimVerificationResultSchema>;
export type CitationData = z.infer<typeof CitationDataSchema>;
export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;
