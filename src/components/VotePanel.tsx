"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ScoreBadge from "@/components/ScoreBadge";
import { storyScore10 } from "@/lib/scoring/display";
import { ratingKey } from "@/lib/story-display";
import type { VoteEntityType, VoteValue } from "@/lib/voting";

interface Aggregate {
  likeCount: number;
  dislikeCount: number;
  score: number;
  myVote: VoteValue;
}

export default function VotePanel({
  entityType,
  entityId,
  initial,
}: {
  entityType: VoteEntityType;
  entityId: string;
  initial: { likeCount: number; dislikeCount: number; score: number };
}) {
  const [state, setState] = useState<Aggregate>({ ...initial, myVote: 0 });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  // The page is statically rendered, so it cannot know this browser's own
  // vote. Resolve it (and refresh the counts) on the client after mount.
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ entityType, entityId });
    fetch(`/api/vote?${params}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Aggregate | null) => {
        if (data && !cancelled) setState(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  async function send(value: VoteValue) {
    if (pending) return;
    setPending(true);
    setError(false);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, value }),
      });
      if (!res.ok) throw new Error("vote failed");
      setState(await res.json());
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  const t = useTranslations("vote");
  const tStory = useTranslations("story");
  const locale = useLocale();
  const total = state.likeCount + state.dislikeCount;
  const pct = Math.round(state.score * 100);
  const voted = state.myVote !== 0;

  return (
    <section className="mt-14 max-w-prose rounded-[16px] border border-line bg-s1 p-7">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-tx3">
        {tStory("ratingLabel")}
      </p>

      {!voted ? (
        <div className="mt-4">
          <p className="font-serif text-[19px] italic leading-snug text-tx2">
            {t("prompt")}
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => send(1)}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-[12px] border border-line bg-s2 px-4 py-[15px] font-sans text-[14px] font-medium text-ink transition-colors hover:border-line2 disabled:opacity-50"
            >
              <ThumbUp />
              {t("up")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => send(-1)}
              className="flex flex-1 items-center justify-center gap-2.5 rounded-[12px] border border-line bg-s2 px-4 py-[15px] font-sans text-[14px] font-medium text-tx2 transition-colors hover:border-line2 disabled:opacity-50"
            >
              <ThumbDown />
              {t("down")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-end gap-5">
            <ScoreBadge score={state.score} size="lg" />
            <div className="flex-1 pb-1.5">
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-s3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-crimson-deep to-crimson transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="font-mono text-[11.5px] text-tx3">
                {total.toLocaleString(locale)} {t("votesWord")} · {tStory(ratingKey(storyScore10(state.score)))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 border-t border-line pt-3.5">
            <span className="flex items-center gap-2 text-[12.5px] text-tx2">
              <span className="text-crimson-2">
                {state.myVote === 1 ? "▲" : "▼"}
              </span>
              {t("youVoted")}:{" "}
              <span className="text-ink">
                {state.myVote === 1 ? t("valueUp") : t("valueDown")}
              </span>
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => send(0)}
              className="ml-auto rounded-[9px] border border-line bg-s2 px-3.5 py-2 font-sans text-[12px] text-tx2 transition-colors hover:border-line2 disabled:opacity-50"
            >
              {t("change")}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 font-mono text-[11px] text-crimson-2">{t("error")}</p>
      )}
    </section>
  );
}

function ThumbUp() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 10v10H4V10z" />
      <path d="M7 10l4-7c1.3 0 2 .9 2 2v3h5.4c1 0 1.8.9 1.6 1.9l-1.4 6.2c-.2.9-1 1.9-2 1.9H7" />
    </svg>
  );
}

function ThumbDown() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 14V4h3v10z" />
      <path d="M17 14l-4 7c-1.3 0-2-.9-2-2v-3H5.6c-1 0-1.8-.9-1.6-1.9l1.4-6.2c.2-.9 1-1.9 2-1.9H17" />
    </svg>
  );
}
