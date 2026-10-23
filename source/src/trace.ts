// Shared hand-eye system: device-only difficulty steps (1-5) + a forgiving path follower (drag/trace).
import { D, Pt } from "./core";
import { store, RM } from "./calm";

export const shortSide = () => Math.min(D.W, D.H);
/** linear value between step 1 and step 5 (percent of the shorter side, or any unit) */
export const lerp5 = (a: number, b: number, step: number) => a + (b - a) * (Math.max(1, Math.min(5, step)) - 1) / 4;

// ---- difficulty: after 3 clean rounds in a row go one step harder, after 2 misses in a row go one step easier. Device only. ----
const KEY = "lrHandEye";
type Rec = { step: number; clean: number; miss: number };
let db: Record<string, Rec> | null = null;
const load = () => { if (db) return db; try { db = JSON.parse(store.get(KEY) || "{}") || {}; } catch (e) { db = {}; } return db!; };
const rec = (id: string): Rec => { const d = load(); if (!d[id]) d[id] = { step: 1, clean: 0, miss: 0 }; return d[id]; };
const save = () => store.set(KEY, JSON.stringify(db || {}));
export const Diff = {
  step: (id: string) => rec(id).step,
  /** a miss happened (roll-back); two in the same round step the level down */
  miss(id: string) { const r = rec(id); r.clean = 0; r.miss++; if (r.miss >= 2) { r.step = Math.max(1, r.step - 1); r.miss = 0; } save(); },
  /** a round finished: clean rounds count up towards the next step, any finished round clears the miss streak */
  roundEnd(id: string, misses: number) { const r = rec(id); r.miss = 0; if (misses === 0) { r.clean++; if (r.clean >= 3) { r.clean = 0; r.step = Math.min(5, r.step + 1); } } else r.clean = 0; save(); },
  reset() { db = {}; store.del(KEY); },
};

// ---- path follower ----
export type P2 = { x: number; y: number };
export class Tracer {
  pts: P2[] = []; cum: number[] = []; len = 0;
  prog = 0; shown = 0; state: "idle" | "drag" | "lost" | "back" | "done" = "idle";
  lostT = 0; good = 0; marks: number[] = []; got: boolean[] = [];
  grabR = 40; reach = 120; wait = 3;
  /** allowed distance of the finger from the road centre at progress d */
  tol: (d: number) => number = () => 60;
  onMark: (i: number) => void = () => {}; onLost: () => void = () => {}; onMiss: () => void = () => {}; onDone: () => void = () => {}; onGrab: () => void = () => {};
  setPath(pts: P2[], marks: number[]) {
    this.pts = pts; this.cum = [0]; for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    this.len = this.cum[this.cum.length - 1]; this.marks = marks; this.got = marks.map(() => false);
  }
  reset() { this.prog = this.shown = this.good = 0; this.state = "idle"; this.lostT = 0; this.got = this.marks.map(() => false); }
  /** point and direction at distance d along the path */
  at(d: number) {
    d = Math.max(0, Math.min(this.len, d)); let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] <= d) lo = m; else hi = m; }
    const a = this.pts[lo], b = this.pts[hi], l = this.cum[hi] - this.cum[lo] || 1, t = (d - this.cum[lo]) / l;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: (b.x - a.x) / l, dy: (b.y - a.y) / l };
  }
  /** nearest path point to p, searching only distances lo..hi so a bend can never pull the car across to another stretch */
  proj(p: P2, lo: number, hi: number) {
    let best = 1e9, bd = 0;
    for (let i = 1; i < this.pts.length; i++) {
      if (this.cum[i] < lo || this.cum[i - 1] > hi) continue; const a = this.pts[i - 1], b = this.pts[i], vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
      let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2; t = Math.max(0, Math.min(1, t)); const d = this.cum[i - 1] + t * Math.sqrt(l2);
      if (d < lo || d > hi) continue; const dd = Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y); if (dd < best) { best = dd; bd = d; }
    }
    return { d: bd, dist: best };
  }
  held = false;
  down(p: P2): boolean {
    if (this.state === "done") return false;
    const c = this.at(this.shown); if (Math.hypot(p.x - c.x, p.y - c.y) > this.grabR) return false;
    if (this.state === "back") this.prog = this.shown; this.state = "drag"; this.held = true; this.lostT = 0; this.onGrab(); return true;
  }
  move(p: P2) {
    if (!this.held || this.state === "done" || this.state === "back") return;
    const pr = this.proj(p, Math.max(0, this.prog - this.reach * 0.5), this.prog + this.reach);
    if (pr.dist <= this.tol(pr.d)) { if (this.state === "lost") { this.state = "drag"; this.lostT = 0; } this.prog = pr.d; }
    else if (this.state === "drag") { this.state = "lost"; this.lostT = 0; this.onLost(); }
  }
  up() { this.held = false; if (this.state === "drag") { this.state = "lost"; this.lostT = 0; this.onLost(); } }
  update(dt: number) {
    const rm = RM();
    if (this.state === "back") {
      if (rm) this.prog = this.good; else { const d = this.good - this.prog, sp = Math.max(this.len * 0.05, Math.abs(d) * 1.6); this.prog += Math.sign(d) * Math.min(Math.abs(d), sp * dt); }
      if (Math.abs(this.prog - this.good) < 1) { this.prog = this.good; this.state = "idle"; }
    } else if (this.state === "lost") { this.lostT += dt; if (this.lostT >= this.wait && !this.held) { this.state = "back"; this.onMiss(); } else if (this.lostT >= this.wait && this.held) { this.state = "back"; this.held = false; this.onMiss(); } }
    const k = rm ? 40 : 14; this.shown += (this.prog - this.shown) * Math.min(1, dt * k);
    if (this.state !== "back" && Math.abs(this.prog - this.shown) < 0.5) this.shown = this.prog;
    if (this.state === "drag" || this.state === "lost") for (let i = 0; i < this.marks.length; i++) if (!this.got[i] && this.shown >= this.marks[i] - 2) { this.got[i] = true; this.good = this.marks[i]; this.onMark(i); }
    if ((this.state === "drag") && this.shown >= this.len - 2) { this.state = "done"; this.held = false; this.onDone(); }
  }
}
