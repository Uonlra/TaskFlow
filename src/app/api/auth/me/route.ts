import { NextResponse } from "next/server";

import { getCurrentAuthEnvelope } from "@/lib/appwrite/server";

export async function GET() {
  const envelope = await getCurrentAuthEnvelope();

  if (!envelope) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(envelope);
}
