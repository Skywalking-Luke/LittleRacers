// Vehicle sounds (honks, engine loops, start-ups, drive-aways). Files are Sylphy's own, in public/sfx/ (listed in sfx/manifest.json).
// They are not voices: the public site and the family copy both play them. Everything respects the sound button (S.mute),
// goes through one gentle limiter, caps simultaneous sounds and rate-limits repeated taps. Missing files fall back to the old code beeps.
import { S, ctx, onUnlock, onMute, onReal, FAMILY } from "./audio";
const BASE = (import.meta as any).env.BASE_URL || "/LittleRacers/";
export type VK = "car" | "taxi" | "jeep" | "van" | "lorry" | "bus" | "moto" | "train" | "fire" | "amb" | "tow";
const KIND: Record<string, VK> = { car: "car", taxi: "taxi", police: "car", jeep: "jeep", van: "van", lorry: "lorry", truck: "lorry", bus: "bus", moto: "moto", train: "train", fire: "fire", amb: "amb", tow: "tow" };
export const kindOf = (k: string): VK | null => KIND[k] || null;
type Role = "honk" | "loop" | "start" | "away";
interface Ent { files: string[]; vol: number; raw?: ArrayBuffer; buf?: AudioBuffer; busy?: boolean }
const ents: Record<string, Ent> = {};
const HONK: Record<VK, string> = { car: "honk-car", taxi: "honk-taxi", jeep: "honk-jeep", van: "honk-van", lorry: "honk-lorry", bus: "honk-bus", moto: "honk-motorcycle", train: "horn-train", fire: "horn-firetruck", amb: "horn-ambulance", tow: "honk-tow" };
const LOOP: Record<VK, string> = { car: "engine-car-idle", taxi: "engine-car-idle", jeep: "engine-car-idle", van: "engine-van-idle", lorry: "engine-lorry-idle", bus: "engine-bus-idle", moto: "engine-motorcycle-idle", train: "engine-train-chug", fire: "engine-lorry-idle", amb: "engine-van-idle", tow: "engine-lorry-idle" };
const T3: Record<VK, string> = { car: "car", taxi: "car", jeep: "car", van: "car", lorry: "lorry", bus: "lorry", moto: "motorcycle", train: "lorry", fire: "lorry", amb: "car", tow: "lorry" }; // start-* / vroom-* exist for car, motorcycle, lorry
// per-vehicle tap sounds: each type has its own honk plus a playful extra (beep-beep or a happy rev) that the taps rotate through; quick repeat taps use a short toot
const POOL: Partial<Record<VK, string[]>> = { car: ["honk-car", "beep-beep", "rev-happy-car"], taxi: ["honk-taxi", "beep-beep"], jeep: ["honk-jeep", "rev-happy-jeep"], bus: ["honk-bus", "rev-happy-bus"], moto: ["honk-motorcycle", "beep-beep-motorcycle"], van: ["honk-van", "beep-beep"], tow: ["honk-tow", "beep-beep"] };
const SHORT: Partial<Record<VK, string>> = { van: "honk-short-car", tow: "honk-short-car", car: "honk-short-car", taxi: "honk-short-car", jeep: "honk-short-car", bus: "honk-short-bus", moto: "beep-beep-motorcycle" };
const pi: Partial<Record<VK, number>> = {};
const ROLE_NAME: Record<Role, (k: VK) => string[]> = { honk: (k) => [HONK[k]], loop: (k) => [LOOP[k]], start: (k) => ["start-" + T3[k]], away: (k) => ["vroom-" + T3[k]] };
const FALL: Record<VK, VK> = { car: "car", taxi: "taxi", jeep: "jeep", van: "van", lorry: "lorry", bus: "bus", moto: "moto", train: "train", fire: "fire", amb: "amb", tow: "tow" };
let master: GainNode | null = null;
function chain(ac: AudioContext) {
  if (master) return master;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 20; comp.ratio.value = 10; comp.attack.value = 0.005; comp.release.value = 0.25;
  master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination); return master;
}
let started = false, realStarted = false;
// ogg gives gapless loops where it decodes (Chrome, Firefox, Brave); Safari / iPad get the mp3 (and any ogg decode failure falls back to the mp3 too)
const oggOK = () => { try { const a = document.createElement("audio"); return a.canPlayType('audio/ogg; codecs="vorbis"') !== "" && !(/iPad|iPhone|iPod/.test(navigator.userAgent) || (/Safari/.test(navigator.userAgent) && !/Chrome|Chromium|CriOS|FxiOS|Firefox|Edg/.test(navigator.userAgent))); } catch (e) { return false; } };
async function load(man = "sfx/manifest.json") {
  if (man === "sfx/manifest.json") { if (started) return; started = true; } else { if (realStarted) return; realStarted = true; }
  try {
    const before = new Set(Object.keys(ents));
    const m = await (await fetch(BASE + man, { cache: "no-cache" })).json();
    if (FAMILY) delete m["cheer-soft"]; // voices: never even downloaded in the family copy
    for (const k of Object.keys(m)) { const e = m[k], files: string[] = e.files || []; const ogg = oggOK(), order = ogg ? files.slice().sort((a, b) => (b.endsWith(".ogg") ? 1 : 0) - (a.endsWith(".ogg") ? 1 : 0)) : files.slice().sort((a, b) => (b.endsWith(".mp3") ? 1 : 0) - (a.endsWith(".mp3") ? 1 : 0)), pick = order[0]; if (pick) ents[k] = { files: order, vol: e.vol ?? 1 }; }
    // fetch (not blocking the first paint) a few at a time, decode lazily once the audio context exists
    const names = Object.keys(ents).filter((n) => !before.has(n)); let i = 0;
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
idle(() => { load(); if (S.real) load("sfx/real-manifest.json"); }, { timeout: 4000 });
onReal.push(() => load("sfx/real-manifest.json"));
// ---- real recordings (parent switch "real sounds", default off). Tap / listen moments only, same 2-voice cap and limiter. Starting gains are deliberately low: nobody has heard them yet.
export const REAL_GAIN = { horn: 0.33, start: 0.3, loop: 0.12, far: 0.28 };
const RPOOL: Partial<Record<VK, string[]>> = { car: ["real-horn-car", "real-horn-car-beepbeep"], taxi: ["real-horn-car", "real-horn-car-beepbeep"], jeep: ["real-horn-car"], train: ["real-horn-train", "real-horn-train-emu"] };
const rok = (n: string) => (S.real && ents[n] && ents[n].buf ? ents[n] : null);
const rpi: Record<string, number> = {};

interface Voice { src: AudioBufferSourceNode; g: GainNode; end: number; loop: boolean }
let lastPraise = 0, lastAnimal = 0; const animalI: Record<string, number> = {}; let voices: Voice[] = [], lastHonk = 0, lastKind: Record<string, number> = {}, engine: Voice | null = null, engineKind = "";
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
    const since = t - (lastKind[k] || 0);
    if (t - lastHonk < 250 || since < 250) return true; // rate limit: swallow hammering
    let e: Ent | null = null;
    if (S.real && since >= 700 && RPOOL[k]) { const rp = RPOOL[k]!, n = (rpi[k] || 0) % rp.length, c = rok(rp[n]); if (c) { rpi[k] = n + 1; lastHonk = lastKind[k] = t; play(c, REAL_GAIN.horn * vol); return true; } else if (ents[rp[n]] && ents[rp[n]].raw) decode(rp[n]); }
    if (since < 1500 && SHORT[k] && ents[SHORT[k]!] && ents[SHORT[k]!].buf) e = ents[SHORT[k]!]; // quick repeat tap: short toot (any gap under 700 ms is only the short one)
    else if (since < 700) return true;
    else { const pool = POOL[k]; if (pool) { const n = (pi[k] || 0) % pool.length; const c = ents[pool[n]]; if (c && c.buf) { e = c; pi[k] = n + 1; } else if (c && c.raw) decode(pool[n]); } if (!e) e = find("honk", k); }
    if (!e) return false;
    lastHonk = lastKind[k] = t; play(e, 0.48 * vol); return true;
  },
  /** calm praise: a soft clap, plus a gentle cheer (never in the family copy unless it is a non-vocal sound) - always the same pair, rate-limited, muted when muted */
  praise(): boolean {
    if (S.mute) return true; const t = now(); if (t - lastPraise < 1500) return true;
    const ok = (n: string) => (ents[n] && ents[n].buf ? n : null); // clap-soft is voice-free (both copies); cheer-soft has voices (standard copy only)
    const c = ok("clap-soft"), h = FAMILY ? null : ok("cheer-soft"); if (!c && !h) return false; lastPraise = t;
    if (c) play(ents[c], 0.4); if (h) setTimeout(() => { if (ents[h].buf) play(ents[h], 0.32); }, 250); return true;
  },
  /** Itik Lalu: soft quack / peep / cluck (Sylphy's, not voices, so both copies). The two variants alternate; gains from audio/README v5; muted with the sound button */
  animal(kind: "duck" | "duckling" | "hen"): boolean {
    const base = kind === "duck" ? "quack-soft" : kind === "duckling" ? "peep-soft" : "cluck-soft";
    const i = (animalI[base] = ((animalI[base] ?? -1) + 1) % 2), n = base + "-" + (i + 1), e = ents[n] && ents[n].buf ? ents[n] : ents[base + "-" + (2 - i)];
    if (!e || !e.buf) return false; if (S.mute) return true; const t = now(); if (t - lastAnimal < 180) return true; lastAnimal = t;
    const gain = kind === "duckling" ? 0.2 : kind === "duck" ? 0.45 : e === ents["cluck-soft-1"] ? 0.55 : 0.45;
    play(e, gain); return true;
  },
  start(kind: string, vol = 1) { const k = kindOf(kind); if (!k || S.mute) return; if ((k === "car" || k === "taxi" || k === "jeep") && rok("real-engine-car-start")) { play(ents["real-engine-car-start"], REAL_GAIN.start * vol); return; } const e = find("start", k); if (e) play(e, 0.4 * vol); },
  away(kind: string, vol = 1) { const k = kindOf(kind); if (!k || S.mute) return; const e = find("away", k); if (e) play(e, 0.4 * vol); },
  /** quiet engine loop while a vehicle drives; stops by itself after `max` seconds */
  engine(kind: string, max = 8, vol = 1) {
    const k = kindOf(kind); if (!k || S.mute) return; if (engine && engineKind === k) { clearTimeout(engTimer); engTimer = setTimeout(() => stopEngine(0.3), max * 1000); return; }
    stopEngine(0.15); const rl = oggOK() ? (k === "car" || k === "taxi" || k === "jeep" ? rok("real-engine-car-idle") : k === "train" ? rok("real-train-chug") : null) : null; const e = rl || find("loop", k); if (!e) return; const v = play(e, (rl ? REAL_GAIN.loop : 0.25) * vol, true, 0.2); if (v) { engine = v; engineKind = k; clearTimeout(engTimer); engTimer = setTimeout(() => stopEngine(0.3), max * 1000); }
  },
  /** a far-away horn (real recording when the switch is on, otherwise the normal soft honk) */
  far(kind: string, vol = 1): boolean { const k = kindOf(kind); if (k === "train" && rok("real-horn-train-distant")) { if (S.mute) return true; play(ents["real-horn-train-distant"], REAL_GAIN.far * vol); return true; } return vs.honk(kind, vol); },
  stopEngine(t = 0.5) { clearTimeout(engTimer); stopEngine(t); },
  stopAll() { stopEngine(0.1); for (const v of voices) fade(v, 0.1); voices = []; },
};
