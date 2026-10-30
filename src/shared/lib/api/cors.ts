import { NextResponse, type NextRequest } from "next/server";

const allowedMethods = "GET,POST,PATCH,DELETE,OPTIONS";
const allowedHeaders = "Content-Type, X-Requested-With";

function getAllowedOrigins() {
  return new Set(
    (process.env.DESKTOP_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function getCorsOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || !getAllowedOrigins().has(origin)) return null;
  return origin;
}

export function withApiCors(response: NextResponse, request: NextRequest) {
  const origin = getCorsOrigin(request);
  if (!origin) return response;

  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", allowedMethods);
  response.headers.set("Access-Control-Allow-Headers", allowedHeaders);
  response.headers.append("Vary", "Origin");
  return response;
}

export function createCorsPreflightResponse(request: NextRequest) {
  return withApiCors(new NextResponse(null, { status: 204 }), request);
}
