import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  client,
  storyFindUnique,
  storyUpdate,
  dossierFindUnique,
  dossierUpdate,
  voteFindUnique,
  voteUpsert,
  voteDeleteMany,
  voteGroupBy,
  $transaction,
} = vi.hoisted(() => {
  const storyFindUnique = vi.fn();
  const storyUpdate = vi.fn();
  const dossierFindUnique = vi.fn();
  const dossierUpdate = vi.fn();
  const voteFindUnique = vi.fn();
  const voteUpsert = vi.fn();
  const voteDeleteMany = vi.fn();
  const voteGroupBy = vi.fn();
  const $transaction = vi.fn();
  const client = {
    story: { findUnique: storyFindUnique, update: storyUpdate },
    dossier: { findUnique: dossierFindUnique, update: dossierUpdate },
    vote: {
      findUnique: voteFindUnique,
      upsert: voteUpsert,
      deleteMany: voteDeleteMany,
      groupBy: voteGroupBy,
    },
    $transaction,
  };
  return {
    client,
    storyFindUnique,
    storyUpdate,
    dossierFindUnique,
    dossierUpdate,
    voteFindUnique,
    voteUpsert,
    voteDeleteMany,
    voteGroupBy,
    $transaction,
  };
});

vi.mock("@/lib/db", () => ({ prisma: client }));

import {
  getVoteState,
  applyVote,
  parseVoteValue,
  parseEntityType,
  VoteInputError,
} from "./voting";

beforeEach(() => {
  vi.clearAllMocks();
  // Run the transaction callback against the same mock client.
  $transaction.mockImplementation((cb) => cb(client));
});

describe("parseVoteValue / parseEntityType", () => {
  it("accepts -1, 0, 1", () => {
    expect(parseVoteValue(1)).toBe(1);
    expect(parseVoteValue(-1)).toBe(-1);
    expect(parseVoteValue(0)).toBe(0);
  });
  it("rejects anything else", () => {
    expect(() => parseVoteValue(2)).toThrow(VoteInputError);
    expect(() => parseVoteValue("1")).toThrow(VoteInputError);
  });
  it("accepts known entity types and rejects others", () => {
    expect(parseEntityType("STORY")).toBe("STORY");
    expect(parseEntityType("DOSSIER")).toBe("DOSSIER");
    expect(() => parseEntityType("USER")).toThrow(VoteInputError);
  });
});

describe("getVoteState", () => {
  it("returns null when the entity is missing", async () => {
    storyFindUnique.mockResolvedValueOnce(null);
    expect(
      await getVoteState({ entityType: "STORY", entityId: "x" }),
    ).toBeNull();
  });

  it("returns myVote=0 when no voterId is provided", async () => {
    storyFindUnique.mockResolvedValueOnce({
      likeCount: 10,
      dislikeCount: 2,
      score: 0.7,
    });
    const state = await getVoteState({ entityType: "STORY", entityId: "s1" });
    expect(state).toEqual({
      likeCount: 10,
      dislikeCount: 2,
      score: 0.7,
      myVote: 0,
    });
    expect(voteFindUnique).not.toHaveBeenCalled();
  });

  it("reports the voter's existing vote", async () => {
    storyFindUnique.mockResolvedValueOnce({
      likeCount: 10,
      dislikeCount: 2,
      score: 0.7,
    });
    voteFindUnique.mockResolvedValueOnce({ value: -1 });
    const state = await getVoteState({
      entityType: "STORY",
      entityId: "s1",
      voterId: "v1",
    });
    expect(state?.myVote).toBe(-1);
  });
});

describe("applyVote", () => {
  it("upserts a like, recounts, and recomputes the Wilson score", async () => {
    storyFindUnique.mockResolvedValueOnce({
      likeCount: 0,
      dislikeCount: 0,
      score: 0,
    });
    voteGroupBy.mockResolvedValueOnce([{ value: 1, _count: { _all: 3 } }]);

    const result = await applyVote({
      entityType: "STORY",
      entityId: "s1",
      voterId: "v1",
      value: 1,
    });

    expect(voteUpsert).toHaveBeenCalledTimes(1);
    expect(voteUpsert.mock.calls[0][0].create.value).toBe(1);
    expect(result?.likeCount).toBe(3);
    expect(result?.dislikeCount).toBe(0);
    expect(result?.myVote).toBe(1);
    expect(result?.score).toBeGreaterThan(0);
    // Entity counts persisted with the recomputed score.
    expect(storyUpdate.mock.calls[0][0].data).toMatchObject({
      likeCount: 3,
      dislikeCount: 0,
    });
  });

  it("clears a vote when value=0 (deleteMany, no upsert)", async () => {
    storyFindUnique.mockResolvedValueOnce({
      likeCount: 1,
      dislikeCount: 0,
      score: 0.2,
    });
    voteGroupBy.mockResolvedValueOnce([]);

    const result = await applyVote({
      entityType: "STORY",
      entityId: "s1",
      voterId: "v1",
      value: 0,
    });

    expect(voteDeleteMany).toHaveBeenCalledTimes(1);
    expect(voteUpsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      likeCount: 0,
      dislikeCount: 0,
      score: 0,
      myVote: 0,
    });
  });

  it("returns null without mutating when the entity is missing", async () => {
    storyFindUnique.mockResolvedValueOnce(null);
    const result = await applyVote({
      entityType: "STORY",
      entityId: "gone",
      voterId: "v1",
      value: 1,
    });
    expect(result).toBeNull();
    expect(voteUpsert).not.toHaveBeenCalled();
    expect(storyUpdate).not.toHaveBeenCalled();
  });

  it("routes DOSSIER votes to the dossier delegate", async () => {
    dossierFindUnique.mockResolvedValueOnce({
      likeCount: 0,
      dislikeCount: 0,
      score: 0,
    });
    voteGroupBy.mockResolvedValueOnce([{ value: -1, _count: { _all: 1 } }]);

    await applyVote({
      entityType: "DOSSIER",
      entityId: "d1",
      voterId: "v1",
      value: -1,
    });

    expect(dossierUpdate).toHaveBeenCalledTimes(1);
    expect(storyUpdate).not.toHaveBeenCalled();
  });

  it("rejects a missing voterId", async () => {
    await expect(
      applyVote({ entityType: "STORY", entityId: "s1", voterId: "", value: 1 }),
    ).rejects.toBeInstanceOf(VoteInputError);
  });
});
