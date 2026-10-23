// Jalan Berliku (wiggly road): drag the car along a winding sandy road to the house, collecting 5 stars. Ages 3-5.
import { g, D, C, MIN, Pt, sfx, say, burst } from "./core";
import { veh, VW, pic, cover, coverY, shadow, prop } from "./art";
import { Game } from "./game";
import { vs } from "./vsfx";
import { Tracer, Diff, lerp5, shortSide, P2 } from "./trace";
import { RM } from "./calm";

const ROAD_FRAC = 372 / 512; // the road body is the middle 72.7 % of the tile
type Obj = { gy: number; fn: () => void };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export class Berliku extends Game {
  id = "berliku"; rounds = 3; coalesce = true;
  tr = new Tracer(); step = 1; misses = 0; seed = 1; road: HTMLCanvasElement | null = null; objs: Obj[] = []; yFar = 0; yNear = 0; taper = 0.6; w0 = 60; snap0 = 40;
  stars: { x: number; y: number; w: number; pop: number }[] = []; flip = false; honkT = 0; hintT = 0; carU = 3; ex = 0; ey = 0; lastSay = -9; land = false; built = false;
  constructor() {
    super();
    const t = this.tr;
    t.tol = (d) => { const k = this.K(t.at(d).y); return (this.w0 * k) / 2 + this.snap0 * k; };
    t.onGrab = () => { if (this.honkT <= 0) { vs.honk("car", 0.55); this.honkT = 4; } };
    t.onLost = () => vs.stopEngine(0.35);
    t.onMiss = () => { this.misses++; Diff.miss(this.id); vs.stopEngine(0.2); say("x_berliku_hint"); };
    t.onMark = (i) => { const s = this.stars[i]; if (s) { s.pop = 1; burst(s.x, s.y - s.w * 0.4, 4); } sfx.ding(); };
    t.onDone = () => { Diff.roundEnd(this.id, this.misses); vs.stopEngine(0.4); vs.honk("car", 0.7); this.win(this.ex, this.ey - this.carU * 6); };
  }
  K(y: number) { return this.taper + (1 - this.taper) * clamp((y - this.yFar) / (this.yNear - this.yFar || 1), 0, 1); }
  start() { this.step = Diff.step(this.id); this.misses = 0; this.seed = (Math.random() * 1e6) | 0; this.built = false; this.build(); this.tr.reset(); this.honkT = 0; this.prompt(); }
  prompt() { say("x_berliku"); }
  place() { this.build(); }
  build() {
    const W = D.W, H = D.H, S = shortSide(), land = (this.land = W > H), bg = land ? "bg-berliku-landscape" : "bg-berliku";
    pic(bg); pic("road-berliku-tile"); pic("road-berliku-edge");
    const hy = coverY(bg, land ? 0.405 : 0.34) ?? H * 0.4;
    this.yNear = H * 0.9; this.yFar = Math.max(hy + (H - hy) * 0.2, this.back.y + this.back.h + S * 0.1); this.taper = land ? 0.7 : 0.58;
    const step = this.step; this.w0 = lerp5(0.22, 0.09, step) * S; this.snap0 = lerp5(0.18, 0.06, step) * S;
    const A: P2 = land ? { x: W * 0.3, y: this.yNear } : { x: W * 0.56, y: this.yNear }, B: P2 = land ? { x: W * 0.7, y: this.yFar } : { x: W * 0.5, y: this.yFar };
    const La = Math.hypot(B.x - A.x, B.y - A.y), ux = (B.x - A.x) / La, uy = (B.y - A.y) / La, nx = -uy, ny = ux;
    const n = Math.round(lerp5(3, 7, step)), rnd = rng(this.seed), sign = rnd() < 0.5 ? -1 : 1, slope = (land ? 1.0 : 1.2) * (1 + (step - 1) * 0.1);
    let amp = (slope * La) / (Math.PI * n), pts: P2[] = [];
    for (let tries = 0; tries < 10; tries++) {
      pts = []; let ok = true;
      for (let i = 0; i <= 260; i++) {
        const s = i / 260, env = clamp(Math.min(s / 0.14, (1 - s) / 0.14), 0, 1), e2 = env * env * (3 - 2 * env), lat = sign * amp * e2 * Math.sin(Math.PI * n * s);
        const x = A.x + (B.x - A.x) * s + nx * lat, y = A.y + (B.y - A.y) * s + ny * lat, hw = (this.w0 * this.K(y)) / 2 + 10;
        if (x < hw || x > W - hw || y < hy + 4 || y > H * 0.97) ok = false; pts.push({ x, y });
      }
      if (ok) break; amp *= 0.85;
    }
    // keep the car's progress when the screen is re-laid out
    const old = this.tr.len, f = old > 0 ? this.tr.prog / old : 0, fs = old > 0 ? this.tr.shown / old : 0, fg = old > 0 ? this.tr.good / old : 0;
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const marks = [0.14, 0.32, 0.5, 0.68, 0.86].map((q) => q * L); this.tr.setPath(pts, marks);
    if (this.built) { this.tr.prog = f * L; this.tr.shown = fs * L; this.tr.good = fg * L; this.tr.got = marks.map((m) => this.tr.good >= m - 1); }
    this.built = true;
    this.tr.grabR = Math.max(MIN * 0.75, S * 0.085); this.tr.reach = S * 0.4;
    this.ex = B.x; this.ey = B.y;
    // ---- road painted once into a cache ----
    const dpr = D.dpr, cv = document.createElement("canvas"); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); const c = cv.getContext("2d")!; c.scale(dpr, dpr); c.imageSmoothingQuality = "high";
    const ext: P2 = { x: A.x - ux * Math.hypot(W, H) * 0.3, y: A.y - uy * Math.hypot(W, H) * 0.3 };
    const rp = [ext, ...pts]; this.paintRoad(c, rp);
    this.road = cv;
    this.scatter(pts, A, rnd, hy);
  }
  /** stamp the vertical road tile (and the verge strip) along the centreline, tapering with depth */
  paintRoad(c: CanvasRenderingContext2D, rp: P2[]) {
    const tile = pic("road-berliku-tile"), edge = pic("road-berliku-edge"); if (!tile) return;
    const ds = 2.5, samples: { x: number; y: number; tx: number; ty: number }[] = []; let carry = 0;
    for (let i = 1; i < rp.length; i++) { const a = rp[i - 1], b = rp[i], l = Math.hypot(b.x - a.x, b.y - a.y), tx = (b.x - a.x) / l, ty = (b.y - a.y) / l; let d = carry; while (d < l) { samples.push({ x: a.x + tx * d, y: a.y + ty * d, tx, ty }); d += ds; } carry = d - l; }
    const stamp = (im: HTMLImageElement, lat: number, wFn: (k: number) => number, aspect: number, alpha: number) => {
      let V = 0; c.globalAlpha = alpha;
      for (const s of samples) {
        const k = this.K(s.y), tw = wFn(k), th = tw * aspect, rows = im.naturalHeight, sh = (ds / th) * rows, sy = (V % 1) * rows; V += ds / th;
        c.save(); c.translate(s.x, s.y); c.rotate(Math.atan2(-s.tx, s.ty)); c.translate(lat * k, 0);
        const dh = ds + 0.9;
        if (sy + sh <= rows) c.drawImage(im, 0, sy, im.naturalWidth, Math.max(0.5, sh), -tw / 2, -ds / 2 - 0.45, tw, dh);
        else { const h1 = rows - sy; c.drawImage(im, 0, sy, im.naturalWidth, h1, -tw / 2, -ds / 2 - 0.45, tw, dh * (h1 / sh)); c.drawImage(im, 0, 0, im.naturalWidth, sh - h1, -tw / 2, -ds / 2 - 0.45 + dh * (h1 / sh), tw, dh * (1 - h1 / sh)); }
        c.restore();
      }
      c.globalAlpha = 1;
    };
    const roadW = this.w0;
    if (edge) { for (const side of [-1, 1]) stamp(edge, (side * roadW) / 2, (k) => roadW * k * 0.45, 4, 0.85); }
    stamp(tile, 0, (k) => (roadW * k) / ROAD_FRAC, 1, 1);
  }
  scatter(pts: P2[], A: P2, rnd: () => number, hy: number) {
    const W = D.W, H = D.H, S = shortSide(), objs: Obj[] = [], land = this.land; this.stars = [];
    const near = (x: number, y: number) => { let best = 1e9; for (let i = 0; i < pts.length; i += 2) { const dd = Math.hypot(pts[i].x - x, pts[i].y - y * 1); if (dd < best) best = dd; } return best; };
    const P = (k: string, cx: number, gy: number, w: number) => { const im = pic(k); if (!im) return; const kk = this.K(gy); objs.push({ gy, fn: () => { if (kk < 0.75) g.globalAlpha = 0.9; prop(k, cx, gy, w / (im.naturalWidth / im.naturalHeight)); g.globalAlpha = 1; } }); };
    // end house on its sand apron at the far end of the road
    const hk = this.K(this.ey), hw = (land ? 0.62 * 0.62 : 0.62) * S * hk, house = pic("berliku-end-house");
    const rects: { x0: number; y0: number; x1: number; y1: number }[] = [];
    if (house) { const h = hw * house.naturalHeight / house.naturalWidth; const top = this.ey - 0.8 * h; objs.push({ gy: this.ey - 1, fn: () => { g.globalAlpha = hk < 0.75 ? 0.92 : 1; g.drawImage(house, this.ex - hw / 2, top, hw, h); g.globalAlpha = 1; } }); rects.push({ x0: this.ex - hw / 2 - 6, y0: top - 4, x1: this.ex + hw / 2 + 6, y1: top + h + 4 }); }
    // start garage beside the road start, apron touching the first stretch
    const garage = pic("berliku-start-garage"), gw = (land ? 0.34 : 0.4) * S;
    if (garage) { const gh = gw * garage.naturalHeight / garage.naturalWidth, rw = this.w0, gx = Math.max(gw / 2 + 6, A.x - rw / 2 - gw * 0.36), top = A.y - 0.9 * gh; objs.push({ gy: top + 0.81 * gh, fn: () => g.drawImage(garage, gx - gw / 2, top, gw, gh) }); rects.push({ x0: gx - gw / 2 - 4, y0: top, x1: gx + gw / 2 + 4, y1: top + gh + 4 }); }
    // stars on the road centreline (flat shadow is part of the art; contact point (128,232) of 256)
    this.tr.marks.forEach((m) => { const p = this.tr.at(m), k = this.K(p.y), rw = this.w0 * k, w = Math.min(0.13 * S * k, 1.25 * rw); this.stars.push({ x: p.x, y: p.y, w, pop: 0 }); });
    this.stars.forEach((s, i) => objs.push({ gy: s.y, fn: () => { const im = pic("star-road"); if (!im || this.tr.got[i] && s.pop <= 0) return; const e = s.pop > 0 ? 1 - Math.pow(1 - Math.min(1, 1 - s.pop), 2) : 0, sc = 1 + e * 0.35, w = s.w * sc; g.save(); g.globalAlpha = s.pop > 0 ? clamp(s.pop * 1.4, 0, 1) : 1; g.drawImage(im, s.x - w * 0.5, s.y - w * (232 / 256) - (RM() ? 0 : Math.sin(D.t * 2 + i) * 0), w, w); g.restore(); } }));
    // roadside props: away from the road corridor, never on the stars, standing on the ground with shadows
    const kinds: [string, number][] = [["berliku-bush", 0.15], ["berliku-flower-patch", 0.14], ["berliku-rock", 0.1], ["berliku-bush", 0.15], ["berliku-flower-patch", 0.14], ["berliku-rock", 0.1], ["berliku-bush", 0.15], ["berliku-flower-patch", 0.14], ["tree", 0.3], ["palm", 0.3], ["berliku-fence", 0.3]];
    const placed: { x: number; y: number; r: number }[] = [], top0 = this.back.y + this.back.h;
    for (const [k, rw] of kinds) {
      const im = pic(k); if (!im) continue;
      for (let t = 0; t < 70; t++) {
        const edgeKind = k === "tree" || k === "palm"; const x = edgeKind ? (rnd() < 0.5 ? W * (0.04 + rnd() * 0.1) : W * (0.86 + rnd() * 0.1)) : W * (0.05 + rnd() * 0.9);
        const y = edgeKind ? hy + (H - hy) * (0.12 + rnd() * 0.35) : hy + (H - hy) * (0.06 + rnd() * 0.9);
        const kk = this.K(y), w = rw * S * kk, h = w * im.naturalHeight / im.naturalWidth;
        if (y > H * 0.985 || y - h < top0 || x - w / 2 < 2 || x + w / 2 > W - 2) continue;
        if (near(x, y) < (this.w0 * kk) / 2 + w * 0.55 + 8) continue;
        if (near(x, y - h * 0.4) < (this.w0 * kk) / 2 + w * 0.4) continue;
        if (rects.some((r) => x + w / 2 > r.x0 && x - w / 2 < r.x1 && y > r.y0 && y - h < r.y1)) continue;
        if (placed.some((q) => Math.hypot(q.x - x, (q.y - y) * 1.6) < q.r + w * 0.6)) continue;
        placed.push({ x, y, r: w * 0.6 }); P(k, x, y, w); break;
      }
    }
    objs.sort((a, b) => a.gy - b.gy); this.objs = objs;
  }
  tick(dt: number) {
    const t = this.tr; this.honkT = Math.max(0, this.honkT - dt); t.update(dt); for (const s of this.stars) if (s.pop > 0) s.pop = Math.max(0, s.pop - dt * 1.8);
    if (t.state === "drag" && Math.abs(t.prog - t.shown) > 0.6) vs.engine("car", 1.0, 0.8);
    this.hintT += dt;
  }
  press(p: Pt) { if (!this.tr.down(p) && this.t - this.lastSay > 5) { this.lastSay = this.t; say("x_berliku"); } }
  drag2(p: Pt) { this.tr.move(p); }
  release() { this.tr.up(); }
  paint() {
    const bg = D.W > D.H ? "bg-berliku-landscape" : "bg-berliku"; pic(bg); if (!cover(bg)) { g.fillStyle = "#CFE0B0"; g.fillRect(0, 0, D.W, D.H); }
    if (this.road) g.drawImage(this.road, 0, 0, D.W, D.H);
    const t = this.tr, c = t.at(t.shown); if (c.dx > 0.3) this.flip = false; else if (c.dx < -0.3) this.flip = true;
    const k = this.K(c.y), S = shortSide(), rw = this.w0 * k, len = clamp(rw * 0.95, S * 0.1 * k, S * 0.2 * k), u = len / VW.car[0]; this.carU = u;
    let done = false; const car = () => {
      shadow(c.x, c.y + u * 1.2, len * 0.95);
      if (t.state === "idle" && t.shown < 4 && !RM()) { const a = 0.35 + 0.25 * Math.sin(this.hintT * 3); g.save(); g.globalAlpha = a; g.strokeStyle = "#FFFFFF"; g.lineWidth = Math.max(3, S * 0.012); g.beginPath(); g.arc(c.x, c.y - u * 3, S * 0.085 + Math.sin(this.hintT * 3) * S * 0.006, 0, 7); g.stroke(); g.restore(); }
      veh("car", c.x, c.y + u * VW.car[1] * 0.3, u, C.red, { flip: this.flip });
    };
    for (const o of this.objs) { if (!done && o.gy > c.y) { car(); done = true; } o.fn(); } if (!done) car();
  }
}
