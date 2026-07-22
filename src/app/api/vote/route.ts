import { NextResponse } from "next/server";
import {
  applyVote,
  getVoteState,
  parseEntityType,
  parseVoteValue,
  VoteInputError,
} from "@/lib/voting";
import { getVoterId, getOrCreateVoterId } from "@/lib/voter-session";

export const dynamic = "force-dynamic";

/** Read the current aggregate rating plus this browser's own vote. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const entityType = parseEntityType(url.searchParams.get("entityType"));
    const entityId = url.searchParams.get("entityId") ?? "";
    if (!entityId) throw new VoteInputError("Missing entityId");

    const voterId = await getVoterId();
    const state = await getVoteState({ entityType, entityId, voterId });
    if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(state);
  } catch (e) {
    if (e instanceof VoteInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

/** Cast, change, or clear (value=0) this browser's vote. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const { entityType: rawType, entityId: rawId, value: rawValue } =
      (body ?? {}) as Record<string, unknown>;
    const entityType = parseEntityType(rawType);
    const value = parseVoteValue(rawValue);
    const entityId = typeof rawId === "string" ? rawId : "";
    if (!entityId) throw new VoteInputError("Missing entityId");

    const voterId = await getOrCreateVoterId();
    const state = await applyVote({ entityType, entityId, voterId, value });
    if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(state);
  } catch (e) {
    if (e instanceof VoteInputError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
