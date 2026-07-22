import { describe, it, expect } from "vitest";
import {
  parseTags,
  textToHtml,
  validateSubmission,
  type SubmissionInput,
} from "./submission-validate";

const base: SubmissionInput = {
  title: "Полночный гость",
  intro: "",
  content: "a".repeat(60),
  authorName: "",
  authorLink: "",
  authorEmail: "",
  tags: "",
  website: "",
};

describe("parseTags", () => {
  it("splits, trims, drops empties, dedupes case-insensitively", () => {
    expect(parseTags("Худи, худи ,  ,Крипи")).toEqual(["Худи", "Крипи"]);
  });
  it("returns [] for blank input", () => {
    expect(parseTags("   ")).toEqual([]);
  });
});

describe("textToHtml", () => {
  it("wraps blank-line-separated blocks in <p> and escapes html", () => {
    expect(textToHtml("Первый\n\n<b>второй</b>")).toBe(
      "<p>Первый</p><p>&lt;b&gt;второй&lt;/b&gt;</p>",
    );
  });
  it("turns single newlines into <br>", () => {
    expect(textToHtml("одна\nдве")).toBe("<p>одна<br>две</p>");
  });
});

describe("validateSubmission", () => {
  it("accepts a valid submission and paragraph-wraps content", () => {
    const r = validateSubmission({ ...base, tags: "Крипи, Лес" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.title).toBe("Полночный гость");
      expect(r.data.contentHtml.startsWith("<p>")).toBe(true);
      expect(r.data.tagNames).toEqual(["Крипи", "Лес"]);
    }
  });

  it("rejects a short title and short content with per-field errors", () => {
    const r = validateSubmission({ ...base, title: "ab", content: "too short" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.title).toBeTruthy();
      expect(r.errors.content).toBeTruthy();
    }
  });

  it("rejects a malformed author link and email", () => {
    const r = validateSubmission({
      ...base,
      authorLink: "not-a-url",
      authorEmail: "nope",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.authorLink).toBeTruthy();
      expect(r.errors.authorEmail).toBeTruthy();
    }
  });

  it("treats a filled honeypot as spam with a single form error", () => {
    const r = validateSubmission({ ...base, website: "http://spam" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.form).toBe("spam");
  });

  it("rejects more than 8 tags", () => {
    const r = validateSubmission({
      ...base,
      tags: "a,b,c,d,e,f,g,h,i",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.tags).toBeTruthy();
  });
});
