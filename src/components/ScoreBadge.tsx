import { storyScore10 } from "@/lib/scoring/display";

export default function ScoreBadge({
  score,
  size = "sm",
}: {
  score: number;
  size?: "sm" | "lg";
}) {
  const value = storyScore10(score).toFixed(2);
  const big = size === "lg";
  return (
    <span className="inline-flex items-baseline gap-1 font-serif text-crimson-2">
      <span className={big ? "text-[56px] leading-none" : "text-[20px]"}>
        {value}
      </span>
      <span className={big ? "text-[19px] text-tx3" : "text-[12px] text-tx3"}>
        / 10
      </span>
    </span>
  );
}
