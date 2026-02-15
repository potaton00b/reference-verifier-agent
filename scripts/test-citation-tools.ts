import 'dotenv/config';
import {
  executeFetchAndSaveCitation,
  executeReadFullTextFromDatabase
} from '@/lib/verifier/tools';

async function testTools() {
  console.log('Testing fetchAndSaveCitation...');
  const saveResult = await executeFetchAndSaveCitation({
    title: 'Test Paper',
    author: 'Test Author',
    year: 2024,
    doi: '10.1234/test',
  });
  console.log('✅ Save result:', saveResult);

  console.log('\nTesting readFullTextFromDatabase...');
  const readResult = await executeReadFullTextFromDatabase({
    citationId: saveResult.citationId,
  });
  console.log('✅ Read result:', readResult);
}

testTools().catch(console.error);
