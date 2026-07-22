/** Score in [0,1] → story rating on a 0–10 scale, 2 decimals. */
export function storyScore10(score: number): number {
  return Math.round(score * 10 * 100) / 100;
}

/** Score in [0,1] → dossier popularity on a 0–100 integer scale. */
export function dossierPopularity100(score: number): number {
  return Math.round(score * 100);
}
