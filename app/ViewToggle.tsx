"use client";

import { useT } from "@/app/LanguageProvider";

// A single button that switches between the 2D timeline and the 3D showcase.
// Shown next to the other top-bar controls; the label is the view it takes you
// TO ("3D" from the timeline, "2D" from the showcase).
export default function ViewToggle({
  current,
  className = "menubtn viewtoggle",
}: {
  current: "2d" | "3d";
  className?: string;
}) {
  const { t } = useT();
  const to3d = current === "2d";
  const label = to3d ? t("nav.showcase") : t("showcase.to_2d");
  return (
    <a className={className} href={to3d ? "/showcase" : "/"} aria-label={label} title={label}>
      {to3d ? "3D" : "2D"}
    </a>
  );
}
