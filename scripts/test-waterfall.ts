/**
 * Direct test of the waterfall retrieval system
 * Tests executeFetchAndSaveCitation with real data
 */

import 'dotenv/config';
import { executeFetchAndSaveCitation } from '../lib/verifier/tools';
import { prisma } from '../lib/db';

async function testWaterfall() {
  console.log('🧪 Testing Waterfall Citation Retrieval System\n');

  // Test case 1: Well-known paper with DOI
  console.log('='.repeat(70));
  console.log('TEST CASE 1: Paper with DOI (should find full text or abstract)');
  console.log('='.repeat(70));

  const result1 = await executeFetchAndSaveCitation({
    title: 'Quorum sensing and antibiotic resistance in polymicrobial infections',
    author: 'Sunny Cui',
    year: 2024,
    doi: '10.1080/19420889.2024.2415598',
    pmid: '',
    journal: 'Communicative and Integrative Biology',
  });

  console.log('\n📊 Result 1:', result1);

  // Fetch the full citation from database to see what was saved
  const citation1 = await prisma.citation.findUnique({
    where: { id: result1.citationId },
  });

  console.log('\n💾 Saved to database:');
  console.log('   ID:', citation1?.id);
  console.log('   Title:', citation1?.title);
  console.log('   Full Text Length:', citation1?.fullText?.length || 0, 'chars');
  console.log('   Full Text Preview:', citation1?.fullText?.substring(0, 200) + '...');
  console.log('');

  // Test case 2: Paper with PMID
  console.log('='.repeat(70));
  console.log('TEST CASE 2: Paper with PMID (should retrieve abstract)');
  console.log('='.repeat(70));

  const result2 = await executeFetchAndSaveCitation({
    title: 'Giants in Neurosurgery',
    author: 'Douglas Kondziolka',
    year: 2023,
    doi: '',
    pmid: '',
    journal: 'Neurosurgery',
  });

  console.log('\n📊 Result 2:', result2);

  const citation2 = await prisma.citation.findUnique({
    where: { id: result2.citationId },
  });

  console.log('\n💾 Saved to database:');
  console.log('   ID:', citation2?.id);
  console.log('   Title:', citation2?.title);
  console.log('   Full Text Length:', citation2?.fullText?.length || 0, 'chars');
  console.log('   Full Text Preview:', citation2?.fullText?.substring(0, 200) + '...');
  console.log('');

  // Test case 3: Paper without DOI or PMID (should trigger CrossRef lookup)
  console.log('='.repeat(70));
  console.log('TEST CASE 3: Paper without DOI (should trigger CrossRef lookup)');
  console.log('='.repeat(70));

  const result3 = await executeFetchAndSaveCitation({
    title: 'Peer support for people with schizophrenia or other serious mental illness',
    author: 'Wai Tong Chien',
    year: 2003,
    doi: '',
    pmid: '',
    journal: 'Cochrane Database Systematic Review',
  });

  console.log('\n📊 Result 3:', result3);

  const citation3 = await prisma.citation.findUnique({
    where: { id: result3.citationId },
  });

  console.log('\n💾 Saved to database:');
  console.log('   ID:', citation3?.id);
  console.log('   Title:', citation3?.title);
  console.log('   Full Text Length:', citation3?.fullText?.length || 0, 'chars');
  console.log('   Full Text Preview:', citation3?.fullText?.substring(0, 200) + '...');
  console.log('');

  console.log('='.repeat(70));
  console.log('✅ All waterfall tests completed!');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

testWaterfall().catch(console.error);
