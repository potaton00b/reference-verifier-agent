import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verify } from "@/lib/verifier";

export const runtime = "nodejs";

const VerifyRequestSchema = z.object({
  claim: z.string().min(1, "Claim is required"),
  citation: z.string().min(1, "Citation is required"),
});

export async function POST(request: NextRequest) {
  // Check authorization
  const authHeader = request.headers.get("authorization");
  const serviceSecret = process.env.SERVICE_SECRET;

  if (!serviceSecret) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  if (token !== serviceSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const validation = VerifyRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    );
  }

  const { claim, citation } = validation.data;

  console.log('📥 [API] Received verification request');
  console.log('   Claim:', claim.substring(0, 80) + '...');
  console.log('   Citation:', citation.substring(0, 80) + '...');

  // Call orchestrator to verify claim
  const result = await verify(claim, citation);

  console.log('📤 [API] Sending response');
  console.log('   Verdict:', result.verdict);
  console.log('   CitationId:', result.citationData?.citationId || 'N/A');

  return NextResponse.json({
    ...result,  // verdict, confidence, evidence, notes
    claim,
    citation,
  });
}
