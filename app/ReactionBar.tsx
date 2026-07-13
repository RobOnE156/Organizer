"use client";

import { useState } from "react";
import { addReaction, removeReaction } from "@/app/content-actions";
import { REACTION_EMOJIS, type ReactTarget } from "@/app/content-types";
import { useT } from "@/app/LanguageProvider";

type Reacted = { author_id: string; emoji: string };

export default function ReactionBar({
  targetType,
  targetId,
  householdId,
  initial,
  userId,
  compact = false,
}: {
  targetType: ReactTarget;
  targetId: string;
  householdId: string;
  initial: Reacted[];
  userId: string;
  compact?: boolean;
}) {
  const { t } = useT();
  const [reactions, setReactions] = useState<Reacted[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const countOf = (emoji: string) => reactions.filter((r) => r.emoji === emoji).length;
  const mine = (emoji: string) => reactions.some((r) => r.emoji === emoji && r.author_id === userId);
  const present = REACTION_EMOJIS.filter((e) => countOf(e) > 0);

  async function toggle(emoji: string) {
    if (busy) return;
    setBusy(emoji);
    const hadMine = mine(emoji);
    setReactions((prev) =>
      hadMine
        ? prev.filter((r) => !(r.emoji === emoji && r.author_id === userId))
        : [...prev, { author_id: userId, emoji }],
    );
    const res = hadMine
      ? await removeReaction(targetType, targetId, emoji)
      : await addReaction(targetType, targetId, householdId, emoji);
    setBusy(null);
    if (res.error) {
      // revert the optimistic change
      setReactions((prev) =>
        hadMine
          ? [...prev, { author_id: userId, emoji }]
          : prev.filter((r) => !(r.emoji === emoji && r.author_id === userId)),
      );
    }
  }

  return (
    <div className={"reacts" + (compact ? " sm" : "")}>
      {present.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={"react" + (mine(emoji) ? " on" : "")}
          onClick={() => toggle(emoji)}
          disabled={busy === emoji}
          aria-pressed={mine(emoji)}
          aria-label={t("react.aria", { emoji })}
        >
          <span className="re">{emoji}</span>
          <span className="rc">{countOf(emoji)}</span>
        </button>
      ))}
      <div className="reactadd">
        <button
          type="button"
          className="react addbtn"
          onClick={() => setPaletteOpen((o) => !o)}
          aria-expanded={paletteOpen}
          aria-label={t("react.add")}
        >
          🙂<span className="plus">＋</span>
        </button>
        {paletteOpen ? (
          <div className="palette" onMouseLeave={() => setPaletteOpen(false)}>
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={"pbtn" + (mine(emoji) ? " on" : "")}
                onClick={() => {
                  toggle(emoji);
                  setPaletteOpen(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
