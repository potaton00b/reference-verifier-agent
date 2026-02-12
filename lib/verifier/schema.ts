import { z } from 'zod';

// Schema for verification result (final output)
export const VerificationResultSchema = z.object({
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
  fullText: z.string(),  // Add: The complete text content of the source
});

// Combined schema for complete verification response (verification + citation data)
export const VerificationResponseSchema = z.object({
  verdict: z.enum(['supports', 'contradicts', 'cannot_verify']),
  confidence: z.enum(['high', 'medium', 'low']),
  evidence: z.array(z.string()),
  notes: z.string(),
  citationData: CitationDataSchema,  // Include the full citation data
});

// Export TypeScript types
export type VerificationResult = z.infer<typeof VerificationResultSchema>;
export type CitationData = z.infer<typeof CitationDataSchema>;
export type VerificationResponse = z.infer<typeof VerificationResponseSchema>;
