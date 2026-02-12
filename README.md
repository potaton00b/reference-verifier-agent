# Verifier Service

API-only microservice for verifying claims against citations.

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your environment variables in `.env.local`:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   SERVICE_SECRET=your_secret_token_here
   ```

## Running the Service

Start the development server:

```bash
npm run dev
```

The service will be available at `http://localhost:3000`.

## API Endpoints

### GET /api/health

Health check endpoint to verify the service is running.

**Request:**
```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "ok": true
}
```

### POST /api/verify

Verify a claim against a citation.

**Authentication:** Requires `Authorization: Bearer <SERVICE_SECRET>` header.

**Request Body:**
```json
{
  "claim": "The sky is blue",
  "citation": "According to atmospheric science, Rayleigh scattering causes the sky to appear blue."
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_secret_token_here" \
  -d '{
    "claim": "The sky is blue",
    "citation": "According to atmospheric science, Rayleigh scattering causes the sky to appear blue."
  }'
```

**Expected Response:**
```json
{
  "verdict": "cannot_verify",
  "confidence": "low",
  "evidence": [],
  "notes": "Stub. Agent not implemented yet.",
  "claim": "The sky is blue",
  "citation": "According to atmospheric science, Rayleigh scattering causes the sky to appear blue."
}
```

**Error Responses:**

401 Unauthorized (missing or invalid auth):
```json
{
  "error": "Unauthorized"
}
```

400 Bad Request (validation error):
```json
{
  "error": "Validation failed",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Claim is required",
      "path": ["claim"]
    }
  ]
}
```

## Technology Stack

- Next.js 15 (App Router)
- TypeScript
- Zod (validation)
- Node.js runtime
