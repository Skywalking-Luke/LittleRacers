// Vehicle sounds (honks, engine loops, start-ups, drive-aways). Files are Sylphy's own, in public/sfx/ (listed in sfx/manifest.json).
// They are not voices: the public site and the family copy both play them. Everything respects the sound button (S.mute),
// goes through one gentle limiter, caps simultaneous sounds and rate-limits repeated taps. Missing files fall back to the old code beeps.
import { S, ctx, onUnlock, onMute } from "./audio";
const BASE = (import.meta as any).env.BASE_URL || "/LittleRacers/";
export type VK = "car" | "van" | "lorry" | "bus" | "moto" | "train" | "fire" | "amb" | "tow";
const KIND: Record<string, VK> = { car: "car", taxi: "car", police: "car", jeep: "car", van: "van", lorry: "lorry", truck: "lorry", bus: "bus", moto: "moto", train: "train", fire: "fire", amb: "amb", tow: "tow" };
export const kindOf = (k: string): VK | null => KIND[k] || null;
type Role = "honk" | "loop" | "start" | "away";
interface Ent { files: string[]; vol: number; raw?: ArrayBuffer; buf?: AudioBuffer; busy?: boolean }
const ents: Record<string, Ent> = {};
const HONK: Record<VK, string> = { car: "honk-car", van: "honk-van", lorry: "honk-lorry", bus: "honk-bus", moto: "honk-motorcycle", train: "horn-train", fire: "horn-firetruck", amb: "horn-ambulance", tow: "honk-tow" };
const LOOP: Record<VK, string> = { car: "engine-car-idle", van: "engine-van-idle", lorry: "engine-lorry-idle", bus: "engine-bus-idle", moto: "engine-motorcycle-idle", train: "engine-train-chug", fire: "engine-lorry-idle", amb: "engine-van-idle", tow: "engine-lorry-idle" };
const T3: Record<VK, string> = { car: "car", van: "car", lorry: "lorry", bus: "lorry", moto: "motorcycle", train: "lorry", fire: "lorry", amb: "car", tow: "lorry" }; // start-* / vroom-* exist for car, motorcycle, lorry
const ROLE_NAME: Record<Role, (k: VK) => string[]> = { honk: (k) => [HONK[k]], loop: (k) => [LOOP[k]], start: (k) => ["start-" + T3[k]], away: (k) => ["vroom-" + T3[k]] };
const FALL: Record<VK, VK> = { car: "car", van: "van", lorry: "lorry", bus: "bus", moto: "moto", train: "train", fire: "fire", amb: "amb", tow: "tow" };
let master: GainNode | null = null;
function chain(ac: AudioContext) {
  if (master) return master;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 20; comp.ratio.value = 10; comp.attack.value = 0.005; comp.release.value = 0.25;
  master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination); return master;
}
let started = false;
// ogg gives gapless loops where it decodes (Chrome, Firefox, Brave); Safari / iPad get the mp3 (and any ogg decode failure falls back to the mp3 too)
const oggOK = () => { try { const a = document.createElement("audio"); return a.canPlayType('audio/ogg; codecs="vorbis"') !== "" && !(/iPad|iPhone|iPod/.test(navigator.userAgent) || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Firefox|Edg/.test(navigator.userAgent))); } catch (e) { return false; } };
async function load() {
  if (started) return; started = true;
  try {
    const m = await (await fetch(BASE + "sfx/manifest.json", { cache: "no-cache" })).json();
    for (const k of Object.keys(m)) { const e = m[k], files: string[] = e.files || []; const ogg = oggOK(), order = ogg ? files.slice().sort((a, b) => (b.endsWith(".ogg") ? 1 : 0) - (a.endsWith(".ogg") ? 1 : 0)) : files.slice().sort((a, b) => (b.endsWith(".mp3") ? 1 : 0) - (a.endsWith(".mp3") ? 1 : 0)), pick = order[0]; if (pick) ents[k] = { files: order, vol: e.vol ?? 1 }; }
    // fetch (not blocking the first paint) a few at a time, decode lazily once the audio context exists
    const names = Object.keys(ents); let i = 0;
        const next = async () => { while (i < names.length) { const n = names[i++], e = ents[n]; try { const r = await fetch(BASE + "sfx/" + e.files[0]); if (r.ok) e.raw = await r.arrayBuffer(); } catch (x) {} decode(n); } };
    await Promise.all([next(), next(), next()]);
  } catch (e) {}
}
function decode(n: string) {
  const ac = ctx(), e = ents[n]; if (!ac || !e || !e.raw || e.buf || e.busy) return; e.busy = true; const raw = e.raw; e.raw = undefined;
  const fail = async () => { e.busy = false; e.files.shift(); if (e.files.length) { try { const r = await fetch(BASE + "sfx/" + e.files[0]); if (r.ok) { e.raw = await r.arrayBuffer(); decode(n); } } catch (x) {} } };
  try { const p = ac.decodeAudioData(raw, (b) => { e.buf = b; e.busy = false; }, () => { fail(); }); if (p && (p as any).catch) (p as any).catch(() => {}); } catch (x) { fail(); }
}
onUnlock.push(() => { const ac = ctx(); if (ac) chain(ac); for (const n of Object.keys(ents)) decode(n); });
const idle = (window as any).requestIdleCallback || ((f: () => void) => setTimeout(f, 1200));
idle(() => load(), { timeout: 4000 });

interface Voice { src: AudioBufferSourceNode; g: GainNode; end: number; loop: boolean }
let voices: Voice[] = [], lastHonk = 0, lastKind: Record<string, number> = {}, engine: Voice | null = null, engineKind = "";
const now = () => performance.now();
function find(role: Role, k: VK): Ent | null {
  for (const kk of [k, FALL[k]]) for (const n of ROLE_NAME[role](kk)) { const e = ents[n]; if (e && e.buf) return e; if (e && e.raw) { decode(n); } }
  return null;
}
function fade(v: Voice, t: number) { const ac = ctx(); if (!ac) return; try { v.g.gain.cancelScheduledValues(ac.currentTime); v.g.gain.setValueAtTime(v.g.gain.value, ac.currentTime); v.g.gain.linearRampToValueAtTime(0, ac.currentTime + t); v.src.stop(ac.currentTime + t + 0.02); } catch (e) {} }
function play(e: Ent, vol: number, loop = false, fin = 0.02): Voice | null {
  const ac = ctx(); if (!ac || S.mute || !e.buf || document.hidden) return null;
  const t = now(); voices = voices.filter((v) => v.end > t);
  if (voices.length >= 2) { const o = voices.find((v) => !v.loop); if (!o) return null; fade(o, 0.08); voices.splice(voices.indexOf(o), 1); }
  const src = ac.createBufferSource(), g = ac.createGain(); src.buffer = e.buf!; src.loop = loop;
  g.gain.setValueAtTime(0, ac.currentTime); g.gain.linearRampToValueAtTime(Math.min(1, e.vol * vol), ac.currentTime + fin);
  src.connect(g); g.connect(chain(ac)); src.start();
  const v = { src, g, end: loop ? Infinity : t + e.buf!.duration * 1000, loop }; voices.push(v);
  if (!loop) { const dur = e.buf!.duration; g.gain.setValueAtTime(Math.min(1, e.vol * vol), ac.currentTime + Math.max(fin, dur - 0.12)); g.gain.linearRampToValueAtTime(0, ac.currentTime + dur); }
  return v;
}
function stopEngine(t = 0.3) { if (engine) { fade(engine, t); voices = voices.filter((v) => v !== engine); engine = null; engineKind = ""; } }
onMute.push(() => { for (const v of voices) fade(v, 0.05); voices = []; engine = null; engineKind = ""; });
document.addEventListener("visibilitychange", () => { if (document.hidden) { for (const v of voices) fade(v, 0.05); voices = []; engine = null; engineKind = ""; } });
let engTimer: any = 0;
export const vs = {
  /** honk for a vehicle kind; returns false when no clip is ready (caller may fall back to the old beep) */
  honk(kind: string, vol = 1): boolean {
    const k = kindOf(kind); if (!k) return false; const t = now();
    if (S.mute) return true; // muted: stay silent, no fallback beep either
    if (t - lastHonk < 400 || t - (lastKind[k] || 0) < 700) return true; // rate limit: swallow repeated taps
    const e = find("honk", k); if (!e) return false;
    lastHonk = lastKind[k] = t; play(e, 0.48 * vol); return true;
  },
  start(kind: string, vol = 1) { const k = kindOf(kind); if (!k || S.mute) return; const e = find("start", k); if (e) play(e, 0.4 * vol); },
  away(kind: string, vol = 1) { const k = kindOf(kind); if (!k || S.mute) return; const e = find("away", k); if (e) play(e, 0.4 * vol); },
  /** quiet engine loop while a vehicle drives; stops by itself after `max` seconds */
  engine(kind: string, max = 8, vol = 1) {
    const k = kindOf(kind); if (!k || S.mute) return; if (engine && engineKind === k) { clearTimeout(engTimer); engTimer = setTimeout(() => stopEngine(0.3), max * 1000); return; }
    stopEngine(0.15); const e = find("loop", k); if (!e) return; const v = play(e, 0.25 * vol, true, 0.2); if (v) { engine = v; engineKind = k; clearTimeout(engTimer); engTimer = setTimeout(() => stopEngine(0.3), max * 1000); }
  },
  stopEngine(t = 0.5) { clearTimeout(engTimer); stopEngine(t); },
  stopAll() { stopEngine(0.1); for (const v of voices) fade(v, 0.1); voices = []; },
};
