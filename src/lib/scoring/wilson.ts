/**
 * Wilson lower-bound of the positive-rating fraction.
 * @param likes    count of +1 votes
 * @param dislikes count of -1 votes
 * @param z        z-score for the confidence interval (1.96 ≈ 95%)
 * @returns value in [0, 1]
 */
export function wilsonScore(likes: number, dislikes: number, z = 1.96): number {
  const n = likes + dislikes;
  if (n === 0) return 0;
  const phat = likes / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const centre = phat + z2 / (2 * n);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);
  return (centre - margin) / denominator;
}
