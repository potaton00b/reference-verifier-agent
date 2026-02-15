#!/usr/bin/env tsx

// Load environment variables from .env and .env.local
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env first (database credentials)
config({ path: resolve(process.cwd(), '.env') });
// Then load .env.local (overrides for local dev)
config({ path: resolve(process.cwd(), '.env.local') });

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

interface VerifyRequest {
  claim: string;
  citation: string;
}

interface CitationData {
  title: string;
  author?: string;
  year?: number;
  url?: string;
  excerpt: string;
  citationId: string;
}

interface VerifyResponse {
  claim: string;
  citation: string;
  verdict: 'supports' | 'contradicts' | 'cannot_verify';
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  notes?: string;
  citationData?: CitationData;
  [key: string]: any;
}

interface TestResult {
  citation: string;
  claim: string;
  response?: VerifyResponse;
  error?: string;
  duration_ms: number;
  timestamp: string;
}

interface TestOutput {
  timestamp: string;
  total: number;
  results: TestResult[];
  summary: {
    success: number;
    failed: number;
    verdicts: Record<string, number>;
  };
}

interface ClaimCitationPair {
  claim: string;
  citation: string;
}

const CITATIONS_FILE = join(process.cwd(), 'tests', 'citations.txt');
const RESULTS_FILE = join(process.cwd(), 'tests', 'results.json');
const API_URL = process.env.API_URL || 'http://localhost:3000/api/verify';
const SERVICE_SECRET = process.env.SERVICE_SECRET;

async function verifyCitation(claim: string, citation: string): Promise<VerifyResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (SERVICE_SECRET) {
    headers['Authorization'] = `Bearer ${SERVICE_SECRET}`;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ claim, citation } as VerifyRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText}`);
  }

  return await response.json();
}

async function main() {
  console.log('Citation Verification Test Runner\n');

  // Check if citations file exists
  if (!existsSync(CITATIONS_FILE)) {
    console.error(`Error: Citations file not found at ${CITATIONS_FILE}`);
    console.log('Please create tests/citations.txt with one citation per line.');
    process.exit(1);
  }

  // Read and parse claim-citation pairs
  const fileContent = readFileSync(CITATIONS_FILE, 'utf-8');
  const lines = fileContent.split('\n').map(line => line.trim());

  const pairs: ClaimCitationPair[] = [];
  let currentClaim: string | null = null;

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    // Parse "Claim: ..." or "Citation: ..." format
    if (line.toLowerCase().startsWith('claim:')) {
      currentClaim = line.substring(6).trim();
    } else if (line.toLowerCase().startsWith('citation:')) {
      const citation = line.substring(9).trim();
      if (currentClaim) {
        pairs.push({ claim: currentClaim, citation });
        currentClaim = null;  // Reset for next pair
      } else {
        console.warn(`Warning: Found citation without a claim: ${citation}`);
      }
    }
  }

  if (pairs.length === 0) {
    console.error('Error: No claim-citation pairs found in tests/citations.txt');
    console.log('\nExpected format:');
    console.log('Claim: Your claim here');
    console.log('Citation: Your citation here\n');
    process.exit(1);
  }

  console.log(`Testing ${pairs.length} claim-citation pair${pairs.length === 1 ? '' : 's'}...`);
  console.log(`API URL: ${API_URL}\n`);

  const results: TestResult[] = [];
  const verdicts: Record<string, number> = {};
  let successCount = 0;
  let failedCount = 0;

  // Test each claim-citation pair
  for (let i = 0; i < pairs.length; i++) {
    const { claim, citation } = pairs[i];
    const index = i + 1;

    console.log(`[${index}/${pairs.length}]`);
    console.log(`  Claim: ${claim.substring(0, 80)}${claim.length > 80 ? '...' : ''}`);
    console.log(`  Citation: ${citation.substring(0, 80)}${citation.length > 80 ? '...' : ''}`);

    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      const response = await verifyCitation(claim, citation);
      const duration = Date.now() - startTime;

      results.push({
        citation,
        claim,
        response,
        duration_ms: duration,
        timestamp,
      });

      // Track verdict
      verdicts[response.verdict] = (verdicts[response.verdict] || 0) + 1;
      successCount++;

      console.log(`  → Verdict: ${response.verdict} (confidence: ${response.confidence})`);
      if (response.citationData) {
        console.log(`  → Extracted: ${response.citationData.title}${response.citationData.author ? ` by ${response.citationData.author}` : ''}${response.citationData.year ? ` (${response.citationData.year})` : ''}`);
      }
      console.log(`  → Duration: ${duration}ms\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      results.push({
        citation,
        claim,
        error: errorMessage,
        duration_ms: duration,
        timestamp,
      });

      failedCount++;
      console.log(`  → Error: ${errorMessage}`);
      console.log(`  → Duration: ${duration}ms\n`);
    }
  }

  // Create output
  const output: TestOutput = {
    timestamp: new Date().toISOString(),
    total: pairs.length,
    results,
    summary: {
      success: successCount,
      failed: failedCount,
      verdicts,
    },
  };

  // Save results
  writeFileSync(RESULTS_FILE, JSON.stringify(output, null, 2), 'utf-8');

  console.log('='.repeat(50));
  console.log('Test Summary:');
  console.log(`Total pairs tested: ${pairs.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log('\nVerdicts:');
  Object.entries(verdicts).forEach(([verdict, count]) => {
    console.log(`  ${verdict}: ${count}`);
  });
  console.log('\n' + '='.repeat(50));
  console.log(`\nResults saved to: ${RESULTS_FILE}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
