import { NextRequest, NextResponse } from "next/server";
import {
  requireRateLimit,
  requireSameOrigin,
  SecurityError,
  securityErrorResponse
} from "@/lib/security/request-guards";
import { assertProductionSafety } from "@/lib/env";

const MAX_JSON_BYTES = 16_384;
const MAX_FORM_BYTES = 4_200_000;

/** Bound the actual stream, including chunked requests without Content-Length. */
export async function boundedRequest(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  const maxBytes = type.startsWith("multipart/form-data") ? MAX_FORM_BYTES : MAX_JSON_BYTES;
  const size = request.headers.get("content-length");
  if (size && (!/^\d+$/.test(size) || Number(size) > maxBytes)) {
    throw new SecurityError("REQUEST_TOO_LARGE", 413);
  }
  if (!request.body) return request;
  if (
    !/^(application\/json|multipart\/form-data|application\/x-www-form-urlencoded)(;|$)/i.test(type)
  ) {
    throw new SecurityError("UNSUPPORTED_CONTENT_TYPE", 415);
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SecurityError("REQUEST_TOO_LARGE", 413);
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return new NextRequest(request.url, {
    method: request.method,
    headers: request.headers,
    body: Buffer.concat(chunks)
  });
}

/** Authorization stays in each handler/service; this is common HTTP protection. */
export function mutationRoute<Context>(
  action: string,
  handler: (request: NextRequest, context: Context) => Promise<Response>,
  limit = 30
) {
  return async (request: NextRequest, context: Context) => {
    try {
      requireSameOrigin(request);
      assertProductionSafety();
      await requireRateLimit({ request, action, limit, windowSeconds: 60 });
      const bounded = await boundedRequest(request);
      const response = await handler(bounded as NextRequest, context);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return NextResponse.json(
          { error: "INVALID_REQUEST" },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
      return securityErrorResponse(error);
    }
  };
}
