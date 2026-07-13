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

// Records a voice note in the browser (MediaRecorder) and hands it back as a
// File, so it flows through the same upload path as a picked audio file.
export default function VoiceRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const supported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

  async function start() {
    setError(null);
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
        if (blob.size > 0) {
          onRecorded(new File([blob], `sprachnotiz-${Date.now()}.${extFor(type)}`, { type }));
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setSecs(0);
      timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } catch {
      setError("Mikrofon nicht verfügbar oder Zugriff verweigert.");
    }
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
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
      {recording ? (
        <button type="button" className="btn recbtn" onClick={stop}>
          <span className="recdot" /> Stopp · {fmt(secs)}
        </button>
      ) : (
        <button type="button" className="btn" onClick={start}>🎙️ Sprachnotiz aufnehmen</button>
      )}
      {error ? <p className="err" style={{ marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
