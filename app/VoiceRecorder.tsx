"use client";

import { useEffect, useRef, useState } from "react";

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + String(r).padStart(2, "0");
}

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"]) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      /* isTypeSupported may throw on some browsers */
    }
  }
  return undefined;
}

function extFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("aac")) return "aac";
  return "webm";
}

// Records a voice note in the browser. After stopping you can listen to it and
// either keep it (handed back as a File to the entry's uploads) or re-record —
// nothing is attached to the entry until you tap "Übernehmen".
export default function VoiceRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [mode, setMode] = useState<"idle" | "recording" | "review">("idle");
  const [secs, setSecs] = useState(0);
  const [pending, setPending] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef<{ url: string } | null>(null);

  // keep a ref to the pending url so cleanup can revoke it without re-running
  pendingRef.current = pending ? { url: pending.url } : null;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (pendingRef.current) URL.revokeObjectURL(pendingRef.current.url);
    };
  }, []);

  const supported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  async function start() {
    setError(null);
    if (pending) {
      URL.revokeObjectURL(pending.url);
      setPending(null);
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          const file = new File([blob], `sprachnotiz-${Date.now()}.${extFor(type)}`, { type });
          setPending({ url, file });
          setMode("review");
        } else {
          setMode("idle");
        }
      };
      recRef.current = rec;
      rec.start();
      setMode("recording");
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      let msg = "Mikrofon-Zugriff nicht möglich.";
      if (name === "NotAllowedError" || name === "SecurityError") {
        msg = "Mikrofon-Zugriff ist blockiert. Erlaube ihn in den Website-Einstellungen (Symbol links neben der Web-Adresse → Mikrofon → Zulassen) und lade die Seite neu.";
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        msg = "Kein Mikrofon gefunden. Schließe eins an — oder nimm am Handy auf.";
      } else if (name === "NotReadableError") {
        msg = "Das Mikrofon wird gerade von einem anderen Programm benutzt. Schließe es und versuche es erneut.";
      } else if (typeof window !== "undefined" && !window.isSecureContext) {
        msg = "Aufnahme braucht eine sichere (HTTPS-)Verbindung.";
      }
      setError(msg);
      setMode("idle");
    }
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recRef.current?.stop();
    recRef.current = null;
    // mode → "review" happens in rec.onstop
  }

  function accept() {
    if (!pending) return;
    onRecorded(pending.file);
    URL.revokeObjectURL(pending.url);
    setPending(null);
    setMode("idle");
  }

  if (!supported) {
    return (
      <p className="muted" style={{ fontSize: ".8rem", margin: "8px 0 0" }}>
        Aufnahme wird von diesem Browser nicht unterstützt — du kannst aber eine Audiodatei anhängen.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      {mode === "recording" ? (
        <button type="button" className="btn recbtn" onClick={stop}>
          <span className="recdot" /> Stopp · {fmt(secs)}
        </button>
      ) : mode === "review" && pending ? (
        <div className="recreview">
          <p className="muted" style={{ fontSize: ".8rem", margin: 0 }}>Aufnahme anhören:</p>
          <audio controls src={pending.url} />
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={accept}>✓ Übernehmen</button>
            <button type="button" className="btn" onClick={start}>↻ Neu aufnehmen</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn" onClick={start}>🎙️ Sprachnotiz aufnehmen</button>
      )}
      {error ? <p className="err" style={{ marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
