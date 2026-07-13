// Pure builders for the offline export bundle — no React, IO or bundler deps,
// so they can be unit-tested directly (see the export restore test). The
// index.html they produce opens in any browser from file://, forever.

export type ViewerMedia = { path: string; kind: string };

export type ViewerEntry = {
  date: string;
  created_at: string;
  author: string;
  color: string;
  place: string | null;
  private: boolean;
  title: string | null;
  body: string | null;
  children: string[];
  media: ViewerMedia[];
};

export type SidecarEntry = {
  event_date: string;
  created_at: string;
  is_private: boolean;
  place_name: string | null;
  title: string | null;
  body: string | null;
};

export type ViewerSnapshot = {
  date: string;
  child: string;
  age: string;
  items: { label: string; value: string }[];
};

// Written without template literals so they nest cleanly inside the HTML string.
const VIEWER_CSS = [
  ":root{--bg:#faf8fb;--surface:#fff;--ink:#241f29;--muted:#7d7684;--gold:#c99a3f;--faint:rgba(0,0,0,.09)}",
  "@media(prefers-color-scheme:dark){:root{--bg:#15121a;--surface:#221e29;--ink:#f1ecf3;--muted:#a79fad;--gold:#e0b45f;--faint:rgba(255,255,255,.11)}}",
  "*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}",
  "header{max-width:640px;margin:0 auto;padding:32px 20px 8px}header h1{margin:0;font-size:1.7rem;letter-spacing:-.02em}.note{color:var(--muted);font-size:.85rem;margin:4px 0 0}",
  "main{max-width:640px;margin:0 auto;padding:12px 20px 80px}",
  "h2.month{font-size:1.05rem;margin:26px 0 12px}",
  ".entry{background:var(--surface);border:1px solid var(--faint);border-radius:16px;padding:16px 18px;margin:0 0 14px}",
  ".meta{display:flex;align-items:center;gap:8px;margin-bottom:8px}",
  ".dot{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:.72rem;font-weight:800;flex:0 0 auto}",
  ".nm{font-weight:700;font-size:.9rem}.when{color:var(--muted);font-size:.78rem;margin-left:auto}",
  ".priv{font-size:.7rem;font-weight:700;color:var(--gold);border:1px solid var(--faint);border-radius:999px;padding:2px 8px}",
  ".entry h3{font-size:1.12rem;margin:2px 0 6px}.place{color:var(--muted);font-size:.82rem;margin:0 0 6px}.body{white-space:pre-wrap;margin:8px 0 0}",
  ".grid{display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));margin-top:8px}",
  ".grid img,.grid video{width:100%;border-radius:12px;display:block;background:#000;max-height:340px;object-fit:cover}",
  ".grid audio{width:100%}.empty{color:var(--muted);text-align:center;padding:40px 0}",
].join("\n");

const VIEWER_JS = [
  "document.querySelector('header h1').textContent=TITLE;",
  "var tl=document.getElementById('tl');",
  "if(!ENTRIES.length){var d=document.createElement('p');d.className='empty';d.textContent='Noch keine Einträge.';tl.appendChild(d);}",
  "var months={},order=[];",
  "for(var i=0;i<ENTRIES.length;i++){var e=ENTRIES[i];var k=e.date.slice(0,7);if(!months[k]){months[k]=[];order.push(k);}months[k].push(e);}",
  "order.sort();order.reverse();",
  "var fmt=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'long',year:'numeric'});",
  "var mfmt=new Intl.DateTimeFormat('de-DE',{month:'long',year:'numeric'});",
  "for(var j=0;j<order.length;j++){var kk=order[j];var sec=document.createElement('section');",
  "var h2=document.createElement('h2');h2.className='month';h2.textContent=mfmt.format(new Date(kk+'-01T00:00:00'));sec.appendChild(h2);",
  "var list=months[kk];list.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:(a.created_at<b.created_at?1:-1);});",
  "for(var m=0;m<list.length;m++){sec.appendChild(card(list[m]));}tl.appendChild(sec);}",
  "if(typeof SNAPSHOTS!=='undefined'&&SNAPSHOTS.length){var sh=document.createElement('h2');sh.className='month';sh.textContent='Schnappschüsse';tl.appendChild(sh);for(var si=0;si<SNAPSHOTS.length;si++){tl.appendChild(snapCard(SNAPSHOTS[si]));}}",
  "function snapCard(s){var art=document.createElement('article');art.className='entry';var meta=document.createElement('div');meta.className='meta';var nm=document.createElement('span');nm.className='nm';nm.textContent=s.date+(s.age?(' · '+s.child+' mit '+s.age):'');meta.appendChild(nm);art.appendChild(meta);",
  "for(var i=0;i<s.items.length;i++){var it=s.items[i];var k=document.createElement('p');k.className='place';k.textContent=it.label;art.appendChild(k);var v=document.createElement('p');v.className='body';v.style.marginTop='2px';v.textContent=it.value;art.appendChild(v);}return art;}",
  "function card(e){var art=document.createElement('article');art.className='entry';",
  "var meta=document.createElement('div');meta.className='meta';",
  "var dot=document.createElement('span');dot.className='dot';dot.style.background=e.color||'#999';dot.textContent=(e.author||'?').slice(0,1).toUpperCase();",
  "var nm=document.createElement('span');nm.className='nm';nm.textContent=e.author||'Elternteil';meta.appendChild(dot);meta.appendChild(nm);",
  "if(e.private){var pb=document.createElement('span');pb.className='priv';pb.textContent='🔒 Privat';meta.appendChild(pb);}",
  "var wh=document.createElement('span');wh.className='when';wh.textContent=fmt.format(new Date(e.date+'T00:00:00'));meta.appendChild(wh);art.appendChild(meta);",
  "if(e.title){var h3=document.createElement('h3');h3.textContent=e.title;art.appendChild(h3);}",
  "if(e.place){var pl=document.createElement('p');pl.className='place';pl.textContent='📍 '+e.place;art.appendChild(pl);}",
  "if(e.media&&e.media.length){var g=document.createElement('div');g.className='grid';for(var q=0;q<e.media.length;q++){g.appendChild(mediaEl(e.media[q]));}art.appendChild(g);}",
  "if(e.body){var p=document.createElement('p');p.className='body';p.textContent=e.body;art.appendChild(p);}return art;}",
  "function mediaEl(m){if(m.kind==='video'){var v=document.createElement('video');v.src=m.path;v.controls=true;v.preload='metadata';return v;}",
  "if(m.kind==='audio'){var a=document.createElement('audio');a.src=m.path;a.controls=true;return a;}",
  "var img=document.createElement('img');img.src=m.path;img.loading='lazy';img.alt='';return img;}",
].join("\n");

export function buildIndexHtml(title: string, entries: ViewerEntry[], snapshots: ViewerSnapshot[] = []): string {
  const json = JSON.stringify(entries).replace(/</g, "\\u003c");
  const snapJson = JSON.stringify(snapshots).replace(/</g, "\\u003c");
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    "<title>Tagebuch</title>",
    "<style>" + VIEWER_CSS + "</style>",
    "</head>",
    "<body>",
    '<header><h1></h1><p class="note">Offline-Sicherung · in jedem Browser ohne Internet lesbar</p></header>',
    '<main id="tl"></main>',
    "<script>",
    "var TITLE=" + JSON.stringify(title) + ";",
    "var ENTRIES=" + json + ";",
    "var SNAPSHOTS=" + snapJson + ";",
    VIEWER_JS,
    "</" + "script>",
    "</body></html>",
  ].join("\n");
}

function yaml(s: string): string {
  return JSON.stringify(s); // quoted + escaped — valid for a YAML scalar
}

export function buildSidecar(
  e: SidecarEntry,
  author: string,
  children: string[],
  mediaPaths: string[],
): string {
  const lines: (string | null)[] = [
    "---",
    "date: " + e.event_date,
    "author: " + yaml(author),
    e.place_name ? "place: " + yaml(e.place_name) : null,
    "private: " + String(e.is_private),
    children.length ? "children: [" + children.map(yaml).join(", ") + "]" : null,
    "created_at: " + e.created_at,
    "---",
    "",
    e.title ? "# " + e.title : null,
    "",
    e.body ?? "",
    mediaPaths.length ? "\nMedien:\n" + mediaPaths.map((p) => "- " + p).join("\n") : null,
    "",
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

export function buildSnapshotSidecar(
  date: string,
  child: string,
  age: string,
  items: { label: string; value: string }[],
): string {
  const lines: (string | null)[] = [
    "---",
    "date: " + date,
    "child: " + yaml(child),
    age ? "age: " + yaml(age) : null,
    "---",
    "",
    "# Wer ist " + child + " gerade? (" + date + ")",
    "",
    ...items.map((it) => "**" + it.label + "**\n" + it.value + "\n"),
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

export const EXPORT_README =
  "Benni-Tagebuch — Offline-Sicherung\n\n" +
  "So öffnest du dein Tagebuch:\n" +
  "1. Diese ZIP-Datei vollständig entpacken.\n" +
  "2. Im entpackten Ordner die Datei 'index.html' mit einem Browser öffnen (Doppelklick).\n" +
  "   Es funktioniert komplett offline — ohne App, ohne Internet.\n\n" +
  "Was ist enthalten:\n" +
  "- index.html   : dein Tagebuch als Webseite, in jedem Browser lesbar.\n" +
  "- media/       : alle Original-Fotos, -Videos und -Audios.\n" +
  "- entries/     : jeder Eintrag als einzelne Textdatei (Markdown, offen lesbar).\n" +
  "- snapshots/   : die „Wer ist … gerade?\"-Schnappschüsse als Textdateien.\n" +
  "- entries.json : alle Einträge als strukturierte Daten.\n\n" +
  "Tipp: Bewahre mindestens zwei Kopien an verschiedenen Orten auf\n" +
  "(z. B. Computer + externe Festplatte oder ein zweiter Cloud-Speicher).\n";

export function fileNameOf(storageKey: string, position: number): string {
  const last = storageKey.split("/").pop();
  return last && last.length > 0 ? last : "datei-" + position;
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "tagebuch";
}
