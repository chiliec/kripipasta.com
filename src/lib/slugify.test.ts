import { describe, it, expect } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("keeps latin words hyphenated", () => {
    expect(slugify("Ben Drowned")).toBe("ben-drowned");
    expect(slugify("Ticci Toby")).toBe("ticci-toby");
  });

  it("transliterates cyrillic", () => {
    expect(slugify("зомби")).toBe("zombi");
    expect(slugify("Худи")).toBe("hudi");
  });

  it("collapses punctuation and trims hyphens", () => {
    expect(slugify("  Blaskyhoody, Man!  ")).toBe("blaskyhoody-man");
  });

  it("falls back to 'tag' when nothing remains", () => {
    expect(slugify("!!!")).toBe("tag");
    expect(slugify("")).toBe("tag");
  });
});
