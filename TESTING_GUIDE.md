# Citation Testing Guide

## What Changed

### ✅ 1. API Now Returns Full Citation Data

**Before:** API only returned `verdict`, `confidence`, `evidence`, `notes`

**Now:** API also returns:
```json
{
  "verdict": "supports",
  "confidence": "high",
  "evidence": ["Supporting snippet here..."],
  "notes": "Analysis notes...",
  "citationData": {
    "title": "Sample Academic Paper",
    "author": "Dr. Example Author",
    "year": 2023,
    "url": "https://example.com",
    "excerpt": "Short excerpt...",
    "fullText": "Complete full text that was retrieved..."
  },
  "claim": "Your claim",
  "citation": "Your citation"
}
```

This lets you verify:
- ✅ Citation info extraction (author, year, title)
- ✅ Full text retrieval
- ✅ Supporting snippets (in `evidence` array)

### ✅ 2. Test Script Handles Claim-Citation Pairs

**New Format** (`tests/citations.txt`):
```
Claim: A study found a 56% higher prevalence of stroke
Citation: Smith, J. (2023). Stroke Study. JAMA, 45(2), 123-145.

Claim: The Earth is the third planet from the Sun
Citation: https://en.wikipedia.org/wiki/Earth
```

Each claim is tested against its specific citation.

---

## How to Use

### 1. Add Your Test Cases

Edit `tests/citations.txt`:
```
Claim: Your specific claim here
Citation: Your citation (URL, APA, Vancouver, etc.)

Claim: Another claim
Citation: Another citation
```

### 2. Start the Dev Server

```bash
npm run dev
```

### 3. Run Tests (in new terminal)

```bash
npm run test:citations
```

### 4. Review Results

Open `tests/results.json` to see:
- **Citation extraction**: Check `citationData.author`, `citationData.year`, `citationData.title`
- **Full text**: Check `citationData.fullText`
- **Supporting snippet**: Check `evidence` array
- **Verdict**: Check `verdict` and `confidence`

---

## Example Console Output

```
Testing 3 claim-citation pairs...

[1/3]
  Claim: A study found a 56% higher prevalence of stroke
  Citation: Smith, J. (2023). Stroke Study. JAMA, 45(2), 123-145.
  → Verdict: supports (confidence: high)
  → Extracted: Sample Academic Paper by Dr. Example Author (2023)
  → Duration: 2340ms

==================================================
Test Summary:
Total pairs tested: 3
Success: 3
Failed: 0

Verdicts:
  supports: 2
  cannot_verify: 1

==================================================

Results saved to: tests/results.json
```

---

## What to Look For in `results.json`

**Focus on these 3 key areas:**

1. **Citation Extraction** - Does `citationData` have correct fields?
   ```json
   "citationData": {
     "author": "Smith, J.",  // ← Extracted correctly?
     "year": 2023,           // ← Parsed correctly?
     "title": "Stroke Study" // ← Identified correctly?
   }
   ```

2. **Full Text Retrieval** - Is `citationData.fullText` populated?
   ```json
   "fullText": "This is the complete text..."  // ← Contains actual content?
   ```

3. **Supporting Snippet** - Does `evidence` contain relevant quotes?
   ```json
   "evidence": ["The study found 56% higher prevalence..."]  // ← Relevant snippet?
   ```

---

## Modified Files

- ✅ `lib/verifier/schema.ts` - Added `OrchestratorResponseSchema` with `citationData`
- ✅ `lib/verifier/orchestrator.ts` - Returns combined verification + citation data
- ✅ `lib/verifier/index.ts` - Exports `OrchestratorResponse` type
- ✅ `scripts/test-citations.ts` - Parses claim-citation pairs
- ✅ `tests/citations.txt` - New format with pairs
- ✅ API endpoint unchanged (automatically includes new data via spread)

---

## Environment Variables

Optional configuration:

```bash
export SERVICE_SECRET="your-secret-token"  # For authentication
export API_URL="http://localhost:3000/api/verify"  # Custom API URL
```
