// Cari Jalan (find the way): the car drives itself along a road network and stops calmly at each fork; the child taps a road
// (or drags the car into it). Wrong roads end at a gentle dead end (sleeping cow, resting buffalo, closed road, leaf pile):
// the car stops, turns round slowly and comes back; soft arrows glow over the fork. No fail sounds, no timers, no counts. Ages 4-5.
import { g, D, C, MIN, Pt, sfx, say } from "./core";
import { veh, VW, pic, cover, shadow } from "./art";
import { Game } from "./game";
import { vs } from "./vsfx";
import { Diff, lerp5, shortSide } from "./trace";
import { RM } from "./calm";
import { generate, Net, Branch, Kind, P, PROP_W } from "./cjlayout";

const ROAD_FRAC = 372 / 512;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const PROP: Record<Kind, string> = { cow: "deadend-cow-sleeping", buffalo: "deadend-buffalo", barrier: "deadend-barrier", leaves: "deadend-leafpile" };
const LINE: Record<Kind, string> = { cow: "x_cj_cow", buffalo: "x_cj_buffalo", barrier: "x_cj_closed", leaves: "x_cj_leaves" };
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function chaikin(p: P[], it = 3) { let a = p; for (let n = 0; n < it; n++) { const o: P[] = [a[0]]; for (let i = 0; i < a.length - 1; i++) { const q = a[i], r = a[i + 1]; o.push({ x: q.x * 0.75 + r.x * 0.25, y: q.y * 0.75 + r.y * 0.25 }, { x: q.x * 0.25 + r.x * 0.75, y: q.y * 0.25 + r.y * 0.75 }); } o.push(a[a.length - 1]); a = o; } return a; }
type Mode = "look" | "drive" | "wait" | "dead" | "back" | "home";
class Path { pts: P[]; cum: number[] = [0]; L = 0; constructor(p: P[]) { this.pts = p; for (let i = 1; i < p.length; i++) { this.L += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y); this.cum.push(this.L); } }
  at(d: number) { d = clamp(d, 0, this.L); let i = 1; while (i < this.cum.length - 1 && this.cum[i] < d) i++; const a = this.pts[i - 1], b = this.pts[i], s = (d - this.cum[i - 1]) / (this.cum[i] - this.cum[i - 1] || 1); return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s, dx: b.x - a.x }; } }

export class CariJalan extends Game {
  id = "carijalan"; rounds = 3; coalesce = true;
  S = 1; step = 1; misses = 0; seed = 1; net: Net | null = null; land = false; yFar = 0; yNear = 1; taper = 0.5; w0 = 60; road: HTMLCanvasElement | null = null;
  mode: Mode = "look"; fi = 0; path: Path | null = null; d = 0; br: Branch | null = null; timer = 0; hintT = 0; flip = false; lastFork = -9; started = 0;
  pressAt: Pt | null = null; onCar = false; minHouseW = 0; avoid = { x1: 0, y1: 0 }; signs: { x: number; y: number; w: number }[] = [];
  K(y: number) { return this.taper + (1 - this.taper) * clamp((y - this.yFar) / (this.yNear - this.yFar || 1), 0, 1); }
  start() { this.step = Diff.step(this.id); this.misses = 0; this.seed = (Math.random() * 1e9) | 0; this.net = null; this.place(); this.prompt(); }
  prompt() { say("x_carijalan"); }
  place() {
    const W = D.W, H = D.H, land = (this.land = W > H), S = (this.S = land ? H : Math.min(W, 0.62 * H)), bg = land ? "bg-carijalan" : "bg-carijalan-portrait";
    pic(bg); pic("road-berliku-tile"); pic("road-berliku-edge");
    const im = pic(bg), nw = im ? im.naturalWidth : land ? 2400 : 1350, nh = im ? im.naturalHeight : land ? 1350 : 2400, sc = Math.max(W / nw, H / nh), iw = nw * sc, ih = nh * sc, ox = (W - iw) / 2, oy = (H - ih) / 2;
    this.yFar = oy + ih * (land ? 600 / 1350 : 900 / 2400); this.yNear = Math.min(H, oy + ih); this.taper = land ? 0.45 : 0.5;
    this.w0 = lerp5(0.18, 0.13, this.step) * S;
    // the painted stilt house near the left horizon: the real end house must be clearly bigger, and no road heads toward that corner
    this.minHouseW = (land ? 0.1 : 0.24) * iw * 1.15; this.avoid = { x1: Math.max(0.3 * W, ox + iw * (land ? 0.2 : 0.36)), y1: H * (land ? 0.6 : 0.56) };
    const keep = this.net && this.mode !== "look" ? { mode: this.mode, fi: this.fi, f: this.path ? this.d / (this.path.L || 1) : 0, home: this.br ? this.net.forks[this.fi].br.indexOf(this.br) : -1 } : null;
    this.net = generate({ W, H, S, land, step: this.step, yFar: this.yFar, K: (y) => this.K(y), w0: this.w0, minHouseW: this.minHouseW, avoid: this.avoid }, rng(this.seed));
    this.paintRoads(); this.placeSigns();
    if (!keep) { this.mode = "look"; this.timer = 1.5; this.fi = 0; this.br = null; this.flip = false; this.setPath(this.net.stem, 0); this.d = this.path!.L * 0.0 + this.startD(); }
    else { // re-layout mid-round (rotation): same seed, so same network shape; keep progress on the current piece
      this.fi = keep.fi; this.br = keep.home >= 0 ? this.net.forks[this.fi].br[keep.home] : null;
      const pts = this.br ? this.br.pts : this.net.stem; this.setPath(pts, 0); this.d = keep.f * this.path!.L;
    }
  }
  startD() { const p = this.path!; let best = 0, bd = 1e9; for (let d = 0; d <= p.L; d += 2) { const q = p.at(d), e = Math.abs(q.y - D.H * 0.97); if (e < bd) { bd = e; best = d; } } return best; }
  setPath(pts: P[], d0: number) { this.path = new Path(chaikin(pts, pts.length > 2 ? 3 : 0)); this.d = d0; }
  rw(y: number) { return this.w0 * this.K(y); }
  // ---- roads painted once into a cache: all verges first, then all road bodies, so junctions merge cleanly ----
  paintRoads() {
    const n = this.net!, W = D.W, H = D.H, dpr = D.dpr, cv = document.createElement("canvas"); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const c = cv.getContext("2d")!; c.scale(dpr, dpr); c.imageSmoothingQuality = "high";
    const tile = pic("road-berliku-tile"), edge = pic("road-berliku-edge"), lines: P[][] = [];
    const ext = (pts: P[], back: number) => { const a = pts[0], b = pts[1], l = Math.hypot(b.x - a.x, b.y - a.y) || 1; return [{ x: a.x - ((b.x - a.x) / l) * back, y: a.y - ((b.y - a.y) / l) * back }, ...pts.slice(1)]; };
    const st = n.stem; lines.push([{ x: st[0].x, y: H * 1.2 }, ...st.slice(1)]);
    for (const f of n.forks) for (const b of f.br) { const sm = chaikin(b.pts, b.pts.length > 2 ? 3 : 0); lines.push(ext(sm, this.rw(f.y) * 0.5)); }
    if (!tile) { c.strokeStyle = "#E3D3B0"; c.lineCap = c.lineJoin = "round"; for (const l of lines) { c.lineWidth = this.rw(l[l.length - 1].y); c.beginPath(); l.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke(); } this.road = cv; return; }
    const ds = 2.5, all: { x: number; y: number; tx: number; ty: number }[][] = lines.map((rp) => { const o: { x: number; y: number; tx: number; ty: number }[] = []; let carry = 0; for (let i = 1; i < rp.length; i++) { const a = rp[i - 1], b = rp[i], l = Math.hypot(b.x - a.x, b.y - a.y) || 1, tx = (b.x - a.x) / l, ty = (b.y - a.y) / l; let d = carry; while (d < l) { o.push({ x: a.x + tx * d, y: a.y + ty * d, tx, ty }); d += ds; } carry = d - l; } return o; });
    const stamp = (samples: typeof all[0], im: HTMLImageElement, lat: number, wFn: (k: number) => number, aspect: number, alpha: number) => {
      let V = 0; c.globalAlpha = alpha;
      for (const s of samples) {
        const k = this.K(s.y), tw = wFn(k), th = tw * aspect, rows = im.naturalHeight, sh = (ds / th) * rows, sy = (V % 1) * rows; V += ds / th;
        c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(-s.tx, s.ty)); c.translate(lat * k, 0); const dh = ds + 0.9;
        if (sy + sh <= rows) c.drawImage(im, 0, sy, im.naturalWidth, Math.max(0.5, sh), -tw / 2, -ds / 2 - 0.45, tw, dh);
        else { const h1 = rows - sy; c.drawImage(im, 0, sy, im.naturalWidth, h1, -tw / 2, -ds / 2 - 0.45, tw, dh * (h1 / sh)); c.drawImage(im, 0, 0, im.naturalWidth, sh - h1, -tw / 2, -ds / 2 - 0.45 + dh * (h1 / sh), tw, dh * (1 - h1 / sh)); }
        c.restore();
      }
      c.globalAlpha = 1;
    };
    const w0 = this.w0;
    if (edge) for (const sm of all) for (const side of [-1, 1]) stamp(sm, edge, (side * w0) / 2, (k) => w0 * k * 0.45, 4, 0.85);
    for (const sm of all) stamp(sm, tile, 0, (k) => (w0 * k) / ROAD_FRAC, 1, 1);
    // rounded caps at junctions (fill the small wedge where branches leave the fork)
    this.road = cv;
  }
  placeSigns() {
    const n = this.net!, S = this.S; this.signs = [];
    const pts: P[] = []; [n.stem, ...n.forks.flatMap((f) => f.br.map((b) => b.pts))].forEach((l) => { const sm = chaikin(l, l.length > 2 ? 3 : 0); for (let i = 1; i < sm.length; i++) for (let q = 0; q <= 8; q++) pts.push({ x: sm[i - 1].x + (sm[i].x - sm[i - 1].x) * q / 8, y: sm[i - 1].y + (sm[i].y - sm[i - 1].y) * q / 8 }); });
    for (const f of n.forks) { const k = this.K(f.y), w = 0.07 * S * k, off = 0.13 * S * k + this.rw(f.y) * 0.5;
      for (const side of [1, -1]) { const x = f.x + side * off, y = f.y + this.rw(f.y) * 0.3; if (x < w || x > D.W - w) continue;
        if (pts.every((p) => Math.hypot(p.x - x, (p.y - y) * 1.3) > this.rw(p.y) / 2 + w * 0.9)) { this.signs.push({ x, y, w }); break; } } }
  }
  // ---- driving ----
  speed() { const c = this.path!.at(this.d); return 0.12 * this.S * this.K(c.y); }
  tick(dt: number) {
    if (this.wait > 0 || !this.net || !this.path) return;
    this.hintT = Math.max(0, this.hintT - dt);
    const n = this.net, p = this.path;
    if (this.mode === "look") { this.timer -= dt; if (this.timer <= 0) { this.mode = "drive"; vs.start("car", 0.6); } return; }
    if (this.mode === "drive" || this.mode === "back") {
      const dir = this.mode === "back" ? -1 : 1; this.d += dir * this.speed() * dt; vs.engine("car", 1.0, 0.55);
      const stopAt = this.br && this.br.kind && this.mode === "drive" ? p.L - (PROP_W[this.br.kind] * 0.5 + 0.08) * this.S * this.K(p.pts[p.pts.length - 1].y) : p.L;
      if (dir > 0 && this.d >= stopAt) {
        this.d = stopAt;
        if (!this.br) return this.atFork(0);
        if (this.br.kind) { this.mode = "dead"; this.timer = 2.2; vs.stopEngine(0.4); say(LINE[this.br.kind]); return; }
        if (this.fi < n.forks.length - 1) return this.atFork(this.fi + 1);
        this.mode = "home"; vs.stopEngine(0.4); vs.honk("car", 0.55);
        if (this.misses === 0) Diff.roundEnd(this.id, 0); else Diff.miss(this.id); // step down only after 2 rounds in a row with a wrong turn
        this.win(n.house.x, n.house.y - n.houseW * 0.5, "x_cj_home"); return;
      }
      if (dir < 0 && this.d <= 0) { this.d = 0; this.mode = "wait"; this.flip = false; this.hintT = 2; vs.stopEngine(0.4); this.br = null; const f = n.forks[this.fi]; this.setPath([f, f], 0); }
    } else if (this.mode === "dead") { this.timer -= dt; if (this.timer <= 0) { this.mode = "back"; } }
    else if (this.mode === "wait") { this.timer += dt; if (this.timer > 12) { this.timer = 0; say("x_cj_fork"); } }
  }
  atFork(i: number) {
    this.fi = i; this.mode = "wait"; this.timer = 0; vs.stopEngine(0.5); const f = this.net!.forks[i]; this.br = null; this.setPath([f, f], 0);
    if (this.t - this.started > 0) say("x_cj_fork");
  }
  choose(b: Branch) {
    if (this.mode !== "wait") return; this.br = b; this.setPath(b.pts, 0); this.mode = "drive"; sfx.pop(); vs.start("car", 0.5);
    if (!b.home) { this.misses++; }
  }
  zones() { const f = this.net!.forks[this.fi], S = shortSide(), r = Math.max(0.1 * S, MIN * 0.6); return f.br.map((b) => { const a = b.pts[0], q = b.pts[1], l = Math.hypot(q.x - a.x, q.y - a.y) || 1, reach = Math.min(l * 0.7, r * 1.25); return { b, x: a.x + ((q.x - a.x) / l) * reach, y: a.y + ((q.y - a.y) / l) * reach, r }; }); }
  carBox() { const c = this.path!.at(this.d), len = this.carLen(c.y); return { x: c.x, y: c.y - len * 0.3, r: Math.max(len * 0.5, MIN * 0.5) }; }
  carLen(y: number) { const S = this.S, k = this.K(y); return clamp(this.rw(y) * 0.95, 0.1 * S * k, 0.2 * S * k); }
  press(p: Pt) {
    if (this.mode !== "wait") return; const cb = this.carBox();
    this.pressAt = p; this.onCar = Math.hypot(p.x - cb.x, p.y - cb.y) < cb.r; if (this.onCar) return; // touching the car: maybe a drag; if it was only a tap, release() treats it as a tap
    this.tapAt(p); }
  tapAt(p: Pt) {
    const zs = this.zones(); if (!zs.some((z) => Math.hypot(p.x - z.x, p.y - z.y) < z.r)) return; // a tap off all roads does nothing
    const f = this.net!.forks[this.fi], ta = Math.atan2(p.y - f.y, p.x - f.x); let best: { b: Branch; d: number } | null = null; // pick the road pointing most toward the finger
    for (const z of zs) { const q = z.b.pts[1], a = Math.atan2(q.y - f.y, q.x - f.x); let d = Math.abs(a - ta); if (d > Math.PI) d = 2 * Math.PI - d; if (!best || d < best.d) best = { b: z.b, d }; }
    if (best) this.choose(best.b); // a tap off all branches does nothing
  }
  drag2(p: Pt) {
    if (this.mode !== "wait" || !this.onCar || !this.pressAt) return; const dx = p.x - this.pressAt.x, dy = p.y - this.pressAt.y, l = Math.hypot(dx, dy); if (l < 0.05 * shortSide()) return;
    let best: Branch | null = null, bc = 0.6; for (const b of this.net!.forks[this.fi].br) { const a = b.pts[0], q = b.pts[1], m = Math.hypot(q.x - a.x, q.y - a.y) || 1, c = (dx * (q.x - a.x) + dy * (q.y - a.y)) / (l * m); if (c > bc) { bc = c; best = b; } }
    if (best) { this.onCar = false; this.choose(best); }
  }
  release(p: Pt) { const was = this.onCar && this.pressAt && this.mode === "wait"; const at = this.pressAt; this.pressAt = null; this.onCar = false; if (was && at) this.tapAt(at); }
  // ---- drawing ----
  paint() {
    const W = D.W, H = D.H, S = this.S, bg = this.land ? "bg-carijalan" : "bg-carijalan-portrait"; pic(bg); if (!cover(bg)) { g.fillStyle = "#CFE0B0"; g.fillRect(0, 0, W, H); }
    if (!this.net || !this.path) return; const n = this.net;
    if (this.road) g.drawImage(this.road, 0, 0, W, H);
    const haze = (k: number, f: () => void) => { if (k < 0.75) { g.save(); g.filter = "saturate(0.9) brightness(1.05)"; f(); g.restore(); } else f(); };
    const list: { y: number; f: () => void }[] = [];
    const house = pic("berliku-end-house"); if (house) { const w = n.houseW, h = (w * house.naturalHeight) / house.naturalWidth, k = this.K(n.house.y); list.push({ y: n.house.y - 1, f: () => haze(k, () => g.drawImage(house, n.house.x - w / 2, n.house.y - 0.8 * h, w, h)) }); }
    for (const f of n.forks) for (const b of f.br) if (b.kind) { const e = b.pts[b.pts.length - 1], k = this.K(e.y), im = pic(PROP[b.kind]); if (!im) continue; const w = PROP_W[b.kind] * S * k, h = (w * im.naturalHeight) / im.naturalWidth, bot = e.y + 0.02 * S * k; list.push({ y: bot - h * 0.04, f: () => haze(k, () => g.drawImage(im, e.x - w / 2, bot - h, w, h)) }); }
    const sign = pic("fork-sign"); if (sign) for (const s of this.signs) { const h = (s.w * sign.naturalHeight) / sign.naturalWidth; list.push({ y: s.y, f: () => haze(this.K(s.y), () => g.drawImage(sign, s.x - s.w / 2, s.y - h, s.w, h)) }); }
    const c = this.path.at(this.d); if (this.mode !== "wait") { if (c.dx > 0.3) this.flip = this.mode === "back"; else if (c.dx < -0.3) this.flip = this.mode !== "back"; }
    list.push({ y: c.y, f: () => { const len = this.carLen(c.y), u = len / VW.car[0]; shadow(c.x, c.y + u * 1.2, len * 0.95); veh("car", c.x, c.y + u * VW.car[1] * 0.3, u, C.red, { flip: this.flip }); } });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
    // soft arrows over the fork after a dead end (2 s fade in/out); never shows which road is right
    const ar = pic("hint-arrows"); if (ar && this.hintT > 0 && this.mode === "wait") { const f = n.forks[this.fi], k = this.K(f.y), a = Math.sin((1 - this.hintT / 2) * Math.PI), sc = (0.3 * S * k) / 512;
      for (const b of f.br) { const q = b.pts[1], ang = Math.atan2(q.y - f.y, q.x - f.x), rot = ang - (-128 * Math.PI) / 180; g.save(); g.globalAlpha = 0.85 * a; g.translate(f.x + Math.cos(ang) * 0.1 * S * k, f.y - this.rw(f.y) * 0.2 + Math.sin(ang) * 0.1 * S * k); g.rotate(rot); g.drawImage(ar, 133, 168, 123, 142, (-62 * sc), (-71 * sc), 123 * sc, 142 * sc); g.restore(); } }
  }
}
