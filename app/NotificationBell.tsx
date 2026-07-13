"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { markNotificationRead, markAllNotificationsRead } from "@/app/content-actions";
import { useT } from "@/app/LanguageProvider";
import Avatar from "@/app/Avatar";
import { fmtDate } from "@/lib/timeline";
import type { AppNotification, MemberProfile } from "@/lib/data";

// The topbar "Glocke": an unread badge and a dropdown of recent in-app
// notifications. Read-marking is optimistic (local state) with a best-effort
// server write, so the badge updates instantly without a round-trip.
export default function NotificationBell({
  notifications,
  authors,
}: {
  notifications: AppNotification[];
  authors: Record<string, MemberProfile>;
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setItems(notifications), [notifications]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read_at).length;

  const fallback: MemberProfile = { name: t("notif.someone"), color: "#8a8a8a" };
  const who = (id: string) => authors[id] ?? fallback;

  function label(n: AppNotification): string {
    const name = who(n.actor_id).name;
    if (n.kind === "entry") return t("notif.new_entry", { name });
    if (n.kind === "comment") return t("notif.comment", { name });
    return t("notif.reaction", { name, emoji: n.emoji ?? "❤️" });
  }

  function href(n: AppNotification): string {
    return n.entry_id ? `/#entry-${n.entry_id}` : "/";
  }

  function onItem(n: AppNotification) {
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      void markNotificationRead(n.id);
    }
    setOpen(false);
  }

  function onMarkAll() {
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    void markAllNotificationsRead().then(() => router.refresh());
  }

  return (
    <div className="bellwrap" ref={wrapRef}>
      <button
        className="menubtn bellbtn"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("notif.aria", { n: unread })}
        aria-expanded={open}
      >
        🔔
        {unread > 0 ? <span className="bellbadge">{unread > 9 ? "9+" : unread}</span> : null}
      </button>

      {open ? (
        <div className="bellpop" role="dialog" aria-label={t("notif.title")}>
          <div className="bellhead">
            <b>{t("notif.title")}</b>
            {unread > 0 ? (
              <button type="button" className="bellmark" onClick={onMarkAll}>
                {t("notif.mark_all")}
              </button>
            ) : null}
          </div>

          {items.length === 0 ? (
            <p className="bellempty">{t("notif.none")}</p>
          ) : (
            <ul className="belllist">
              {items.map((n) => {
                const a = who(n.actor_id);
                return (
                  <li key={n.id}>
                    <a
                      className={"bellitem" + (n.read_at ? "" : " unread")}
                      href={href(n)}
                      onClick={() => onItem(n)}
                    >
                      <Avatar name={a.name} color={a.color} url={a.avatarUrl} className="cava" />
                      <span className="belltext">
                        <span>{label(n)}</span>
                        {n.entryTitle ? <em className="belltitle">„{n.entryTitle}“</em> : null}
                        <small className="muted">{fmtDate(n.created_at)}</small>
                      </span>
                      {n.read_at ? null : <span className="belldot" aria-hidden />}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}

          <a className="bellfoot" href="/settings/notifications" onClick={() => setOpen(false)}>
            {t("notif.settings_link")}
          </a>
        </div>
      ) : null}
    </div>
  );
}
