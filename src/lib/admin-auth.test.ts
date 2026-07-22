import { describe, it, expect } from "vitest";
import {
  safeEqual,
  checkPassword,
  sessionToken,
  verifySession,
} from "./admin-auth";

describe("safeEqual", () => {
  it("is true for equal strings, false otherwise", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("checkPassword", () => {
  it("matches the configured password", () => {
    expect(checkPassword("hunter2", "hunter2")).toBe(true);
    expect(checkPassword("wrong", "hunter2")).toBe(false);
  });
  it("is false when no password is configured", () => {
    expect(checkPassword("anything", "")).toBe(false);
  });
});

describe("sessionToken / verifySession", () => {
  it("produces a deterministic hex token per secret", () => {
    const a = sessionToken("s3cret");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(sessionToken("s3cret")).toBe(a);
    expect(sessionToken("other")).not.toBe(a);
  });
  it("verifies a matching token and rejects everything else", () => {
    const token = sessionToken("s3cret");
    expect(verifySession(token, "s3cret")).toBe(true);
    expect(verifySession(token, "other")).toBe(false);
    expect(verifySession(undefined, "s3cret")).toBe(false);
    expect(verifySession(token, "")).toBe(false);
  });
});
