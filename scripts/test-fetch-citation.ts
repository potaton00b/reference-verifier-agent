/**
 * Test script for individual API clients
 * Run with: npx tsx scripts/test-fetch-citation.ts
 */

import 'dotenv/config';
import * as crossref from '../lib/api/crossref';
import * as pmcConverter from '../lib/api/pmcConverter';
import * as pubmed from '../lib/api/pubmed';
import * as europePmc from '../lib/api/europePmc';
import * as openalex from '../lib/api/openalex';
import { searchAbstractWithGPT } from '../lib/api/webSearchFallback';

async function testAPIs() {
  console.log('🧪 Starting API Client Tests...\n');

  // Test 1: CrossRef DOI Lookup
  console.log('='.repeat(60));
  console.log('TEST 1: CrossRef DOI Lookup');
  console.log('='.repeat(60));
  const doi = await crossref.lookupDOI({
    title: 'Quorum sensing and antibiotic resistance in polymicrobial infections',
    author: 'Sunny Cui',
    year: 2024,
  });
  console.log('Result:', doi);
  console.log('');

  // Test 2: PMC ID Converter
  if (doi) {
    console.log('='.repeat(60));
    console.log('TEST 2: PMC ID Converter (DOI to PMID/PMCID)');
    console.log('='.repeat(60));
    console.log('Input DOI:', doi);
    const ids = await pmcConverter.convertDOItoPMC(doi);
    console.log('\n📋 Detailed Results:');
    console.log('  - PMID found:', ids?.pmid ? `✅ ${ids.pmid}` : '❌ NOT FOUND');
    console.log('  - PMCID found:', ids?.pmcid ? `✅ ${ids.pmcid}` : '❌ NOT FOUND');
    console.log('  - DOI confirmed:', ids?.doi ? `✅ ${ids.doi}` : '❌ NOT FOUND');
    console.log('\nFull API Response:', JSON.stringify(ids, null, 2));
    console.log('');

    // Test 3: PubMed Abstract (if PMID found)
    if (ids?.pmid) {
      console.log('='.repeat(60));
      console.log('TEST 3: PubMed Abstract Retrieval');
      console.log('='.repeat(60));
      const abstract = await pubmed.getAbstract(ids.pmid);
      console.log('Result:', abstract?.substring(0, 200) + '...');
      console.log('');
    }

    // Test 4: Europe PMC Full Text (if PMCID found)
    if (ids?.pmcid) {
      console.log('='.repeat(60));
      console.log('TEST 4: Europe PMC Full Text Retrieval');
      console.log('='.repeat(60));
      console.log('Attempting with PMCID:', ids.pmcid);
      const fullText = await europePmc.getFullText(ids.pmcid);
      console.log('\n📄 Full Text Results:');
      if (fullText) {
        console.log('  ✅ SUCCESS - Retrieved', fullText.length, 'characters');
        console.log('  Preview:', fullText.substring(0, 200) + '...');
      } else {
        console.log('  ❌ FAILED - No full text available');
        console.log('  Possible reasons:');
        console.log('    - Paper is not Open Access');
        console.log('    - PMCID not in Europe PMC database');
        console.log('    - API error or timeout');
      }
      console.log('');
    } else {
      console.log('='.repeat(60));
      console.log('TEST 4: Europe PMC Full Text Retrieval');
      console.log('='.repeat(60));
      console.log('⚠️  SKIPPED - No PMCID available from Step 2');
      console.log('   Cannot retrieve full text without PMCID');
      console.log('');
    }

    // Test 5: OpenAlex Abstract
    console.log('='.repeat(60));
    console.log('TEST 5: OpenAlex Abstract Retrieval');
    console.log('='.repeat(60));
    const openAlexAbstract = await openalex.getAbstract(doi);
    console.log('Result:', openAlexAbstract?.substring(0, 200) + '...');
    console.log('');
  }

  // Test 6: Specific PMID test
  console.log('='.repeat(60));
  console.log('TEST 6: PubMed Abstract (Known PMID: 17284678)');
  console.log('='.repeat(60));
  const knownAbstract = await pubmed.getAbstract('17284678');
  console.log('Result:', knownAbstract?.substring(0, 200) + '...');
  console.log('');

  // Test 7: GPT Web Search Fallback (optional, costs API credits)
  // Uncomment to test:
  /*
  console.log('='.repeat(60));
  console.log('TEST 7: GPT-5-mini Web Search Fallback');
  console.log('='.repeat(60));
  const gptAbstract = await searchAbstractWithGPT({
    title: 'Climate change impacts on biodiversity',
    author: 'Smith',
    year: 2023,
  });
  console.log('Result:', gptAbstract?.substring(0, 200) + '...');
  console.log('');
  */

  console.log('✅ All tests completed!');
}

testAPIs().catch(console.error);
