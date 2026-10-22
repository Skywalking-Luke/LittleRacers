import { V } from "./voice";
export type Lang = "en" | "bm";
export const S = {
  lang: (localStorage.getItem("lrLang") === "bm" ? "bm" : "en") as Lang,
  mute: localStorage.getItem("lrMute") === "1",
  music: localStorage.getItem("lrMusic") === "1",
  rain: localStorage.getItem("lrRain") === "1",
};
export function setLang(l: Lang) { S.lang = l; localStorage.setItem("lrLang", l); }
export function setMute(m: boolean) { S.mute = m; localStorage.setItem("lrMute", m ? "1" : "0"); if (m) stopVoice(); }

let ac: AudioContext | null = null;
export function unlock() {
  if (!ac) { try { ac = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch (e) { ac = null; } }
  if (ac && ac.state === "suspended") ac.resume();
}
function tone(f: number, d: number, type: OscillatorType = "square", vol = 0.08, at = 0, slide = 0) {
  if (S.mute || !ac) return;
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.linearRampToValueAtTime(f + slide, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
}
function noise(d: number, vol = 0.06, at = 0, hp = 800) {
  if (S.mute || !ac) return;
  const t = ac.currentTime + at, n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), dt = b.getChannelData(0);
  for (let i = 0; i < n; i++) dt[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol;
  s.buffer = b; s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t);
}
export const sfx = {
  tap() { tone(660, 0.08, "sine", 0.06); },
  pop() { tone(400, 0.12, "triangle", 0.12, 0, 500); },
  honk() { tone(392, 0.16, "triangle", 0.08); tone(494, 0.16, "sine", 0.05); tone(392, 0.18, "triangle", 0.08, 0.22); tone(494, 0.18, "sine", 0.05, 0.22); },
  siren() { tone(660, 0.3, "sine", 0.04); tone(550, 0.3, "sine", 0.04, 0.32); },
  vroom() { tone(90, 0.5, "triangle", 0.07, 0, 60); },
  ngeeng() { tone(220, 0.45, "triangle", 0.06, 0, 220); },
  whoosh() { noise(0.35, 0.05, 0, 1500); },
  splash() { noise(0.5, 0.08, 0, 500); },
  rub() { noise(0.08, 0.03, 0, 2500); },
  ding() { tone(988, 0.15, "triangle", 0.1); tone(1319, 0.3, "triangle", 0.1, 0.1); },
  boop() { tone(300, 0.15, "triangle", 0.08, 0, -80); },
  cheer() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.06, i * 0.1)); },
  fanfare() { [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.06, i * 0.15)); },
  applause() { // ~2 s of soft, synthesised clapping + a gentle cheer
    if (S.mute || !ac) return;
    for (let i = 0; i < 46; i++) { const t = i * 0.042 + Math.random() * 0.03, env = Math.min(1, i / 8) * Math.min(1, (46 - i) / 14); noise(0.035, 0.035 * env, t, 1200 + Math.random() * 1500); }
    [392, 494, 587].forEach((f, i) => tone(f, 0.9, "sine", 0.018, 0.15 + i * 0.06, 40));
  },
  beep() { tone(880, 0.1, "sine", 0.05); },
};

// ---- voice: recorded mp3 (listed in voice/manifest.json) or speechSynthesis ----
const BASE = (import.meta as any).env.BASE_URL || "/LittleRacers/";
let recorded = new Set<string>();
// family mode: a private copy whose own voice/ folder (Luke's recordings) is checked first
export const FAMILY = !!(window as any).LR_FAMILY;
const FAM_BASE = location.pathname.replace(/[^/]*$/, "");
let family = new Set<string>();
const loadList = (url: string, set: (s: Set<string>) => void) => fetch(url, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : [])).then((a) => { if (Array.isArray(a)) set(new Set(a.map(String))); }).catch(() => {});
loadList(BASE + "voice/manifest.json", (x) => (recorded = x));
if (FAMILY) loadList(FAM_BASE + "voice/manifest.json", (x) => (family = x));
let curAudio: HTMLAudioElement | null = null;
export function stopVoice() {
  try { speechSynthesis.cancel(); } catch (e) {}
  if (curAudio) { curAudio.pause(); curAudio = null; }
}
function pickVoice(): SpeechSynthesisVoice | null {
  let vs: SpeechSynthesisVoice[] = [];
  try { vs = speechSynthesis.getVoices(); } catch (e) { return null; }
  const norm = (v: SpeechSynthesisVoice) => v.lang.replace("_", "-").toLowerCase();
  const prefs = S.lang === "bm" ? ["ms-my", "ms", "id-id", "id"] : ["en-us", "en-gb", "en"];
  for (const p of prefs) { const v = vs.find((v) => norm(v) === p || norm(v).startsWith(p + "-")); if (v) return v; }
  return null;
}
export function text(key: string, vars: Record<string, string> = {}) {
  const l = V[key]; if (!l) return key;
  let s = l[S.lang];
  for (const k in vars) {
    const v = vars[k];
    s = s.split("{" + k + "}").join(v).split("{" + k.toUpperCase() + "}").join(v.charAt(0).toUpperCase() + v.slice(1));
  }
  return s;
}
/** clip file stem: key, plus the filled-in values for templated lines (e.g. x_col_ask__merah) */
export function clipName(key: string, vars?: Record<string, string>) {
  if (!vars) return key;
  const v = Object.keys(vars).sort().map((k) => vars[k]).join("_").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return key + "__" + v;
}
export function word(key: string) { return V[key] ? V[key][S.lang] : key; }
/** Speak a line. cut=true stops whatever is playing first. Resolves when done (or after a safety timeout). */
export function say(key: string, vars?: Record<string, string>, cut = true, rate = 0.9): Promise<void> {
  if (cut) stopVoice();
  if (S.mute) return new Promise((r) => setTimeout(r, 300));
  const file = clipName(key, vars) + "_" + S.lang + ".mp3";
  return new Promise((res) => {
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    const s = text(key, vars);
    setTimeout(fin, 1200 + s.length * 90 / rate * 0.9);
    const src = family.has(file) ? FAM_BASE + "voice/" + file : recorded.has(file) ? BASE + "voice/" + file : "";
    if (src) {
      const a = new Audio(src); curAudio = a;
      a.onended = fin; a.onerror = fin; a.play().catch(fin); return;
    }
    try {
      const u = new SpeechSynthesisUtterance(s);
      u.lang = S.lang === "bm" ? "ms-MY" : "en-US";
      const v = pickVoice(); if (v) u.voice = v;
      u.rate = rate; u.pitch = rate < 0.8 ? 1.0 : 1.15; u.onend = fin; u.onerror = fin;
      speechSynthesis.speak(u);
    } catch (e) { fin(); }
  });
}
try { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); } catch (e) {}

export function setMusic(m: boolean) { S.music = m; localStorage.setItem("lrMusic", m ? "1" : "0"); }
export function setRain(m: boolean) { S.rain = m; localStorage.setItem("lrRain", m ? "1" : "0"); }
// very quiet lullaby loop, off by default (parent corner)
const MEL = [523, 587, 659, 784, 659, 587, 523, 440, 392, 440, 523, 587, 523, 440, 392, 392];
let mi = 0;
setInterval(() => { if (!S.music || S.mute || !ac || ac.state !== "running") return; tone(MEL[mi % MEL.length] / 2, 0.55, "sine", 0.018); if (mi % 4 == 0) tone(MEL[mi % MEL.length] / 4, 1.1, "sine", 0.012); mi++; }, 600);
export function bell(f: number, d = 1.2, vol = 0.05, at = 0) { tone(f, d, "sine", vol, at); tone(f * 2, d * 0.6, "sine", vol * 0.25, at); }
export function soft(kind: string) { if (kind === "pssh") noise(0.5, 0.02, 0, 2000); else if (kind === "choo") { tone(330, 0.5, "sine", 0.04); tone(392, 0.5, "sine", 0.03, 0.05); } else if (kind === "blink") tone(880, 0.2, "sine", 0.03); else tone(523, 0.4, "sine", 0.03); }
