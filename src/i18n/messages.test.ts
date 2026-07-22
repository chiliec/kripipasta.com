import { describe, it, expect } from "vitest";
import ru from "../../messages/ru.json";
import en from "../../messages/en.json";

function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    keyPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("message catalogs", () => {
  it("RU and EN have identical key trees", () => {
    const ruKeys = keyPaths(ru).sort();
    const enKeys = keyPaths(en).sort();
    expect(enKeys).toEqual(ruKeys);
  });

  it("no value is an empty string", () => {
    for (const cat of [ru, en]) {
      for (const path of keyPaths(cat)) {
        const value = path
          .split(".")
          .reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], cat);
        expect(String(value).length, path).toBeGreaterThan(0);
      }
    }
  });
});
