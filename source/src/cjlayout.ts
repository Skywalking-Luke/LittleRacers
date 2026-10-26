// Cari Jalan road network generator (pure; testable in node). Geometry from art/CARIJALAN-NOTES.md.
export type P = { x: number; y: number };
export type Kind = "cow" | "buffalo" | "barrier" | "leaves";
export type Branch = { pts: P[]; home: boolean; kind?: Kind; head: number };
export type Fork = { x: number; y: number; br: Branch[] };
export type Net = { stem: P[]; forks: Fork[]; house: P; houseW: number; fallback: boolean };
export type Geo = { W: number; H: number; S: number; land: boolean; step: number; yFar: number; K: (y: number) => number; w0: number; minHouseW: number; avoid: { x1: number; y1: number } };
export const PROP_W: Record<Kind, number> = { cow: 0.26, buffalo: 0.26, barrier: 0.2, leaves: 0.2 }; // x S x k
export const PROP_AR: Record<Kind, number> = { cow: 421 / 640, buffalo: 410 / 640, barrier: 423 / 640, leaves: 458 / 640 };
const HOUSE_AR = 682 / 897;
const DEG = Math.PI / 180;
const dir = (a: number) => ({ x: Math.sin(a * DEG), y: -Math.cos(a * DEG) }); // heading in degrees from "up"
function segDist(p: P, a: P, b: P) { const dx = b.x - a.x, dy = b.y - a.y, l = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); }
function segSeg(a: P, b: P, c: P, d: P) { return Math.min(segDist(a, c, d), segDist(b, c, d), segDist(c, a, b), segDist(d, a, b)) * (cross(a, b, c, d) ? 0 : 1); }
function cross(a: P, b: P, c: P, d: P) { const o = (p: P, q: P, r: P) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; }
/** fork plan per step: number of forks and how many are 3-way (dead ends <= 4 so no prop kind repeats) */
export function plan(step: number, land: boolean, r: () => number) {
  if (step <= 1) return { n: 1, three: 0 }; if (step === 2) return { n: 2, three: 0 }; if (step === 3) return { n: 2, three: 1 }; if (step === 4) return { n: 3, three: 1 };
  if (land && r() < 0.5) return { n: 4, three: 0 }; return { n: 3, three: 1 };
}
export function generate(G: Geo, r: () => number, tries = 200): Net {
  for (let t = 0; t < tries; t++) { const n = attempt(G, r); if (n && valid(G, n)) return n; }
  return fallback(G, r);
}
export function attempt(G: Geo, r: () => number, fixed?: number[]): Net | null {
  const { W, H, K } = G, land = G.land, wide = !G.land && W / H > 0.6, rows = G.land ? [0.88, 0.66, 0.55, 0.49] : [0.86, 0.66, 0.53, 0.45], pl = plan(G.step, G.land, r);
  const kinds: Kind[] = (["cow", "buffalo", "barrier", "leaves"] as Kind[]).sort(() => r() - 0.5);
  const threeAt = new Set<number>(); while (threeAt.size < pl.three) threeAt.add(Math.floor(r() * pl.n));
  // the home path zig-zags; it must end toward the centre/right, never toward the painted stilt house (upper left)
  let side = r() < 0.5 ? -1 : 1; if (pl.n % 2 === 1 && side < 0 && r() < 0.8) side = 1;
  const forks: Fork[] = []; const x0 = W * (G.land ? 0.5 : wide ? 0.54 : 0.56); let F: P = { x: x0, y: H * rows[0] }; const stem = [{ x: x0, y: H * 1.05 }, { x: x0, y: H * 0.97 }, F]; const sk = 1 - (G.step - 1) * 0.045, LS = G.land ? G.S : G.S * 0.72, hw = G.land ? 0 : 8;
  let ki = 0, house: P = F;
  for (let i = 0; i < pl.n; i++) {
    const s = i % 2 === 0 ? side : -side, three = threeAt.has(i), last = i === pl.n - 1, k = K(F.y), fork: Fork = { x: F.x, y: F.y, br: [] };
    const hHead = land ? (three ? s * (66 - hw) : s * (60 - hw + r() * 12)) : wide ? (three ? s * 58 : s * (50 + r() * 12)) : three ? s * 50 : s < 0 ? s * (28 + r() * 10) : s * (35 + r() * 20), L1 = (land || wide ? G.S * (0.24 + r() * 0.06) : Math.min(H * (0.1 + r() * 0.05), G.S * 0.3)) * k * sk;
    const d1 = dir(hHead), mid = { x: F.x + d1.x * L1, y: F.y + d1.y * L1 };
    let next: P;
    if (!last) { next = land || wide ? { x: mid.x + s * W * 0.01, y: mid.y - H * (0.03 + r() * 0.03) * k } : { x: mid.x + s * W * 0.015, y: H * rows[i + 1] }; if (!(land || wide) && next.y > mid.y - H * 0.03) return null; }
    else { next = { x: mid.x + s * W * 0.03 * (fixed ? 0 : r()), y: Math.max(G.yFar + H * 0.01, mid.y - H * 0.2 * k) }; house = next; }
    fork.br.push({ pts: [F, mid, next], home: true, head: hHead });
    const deadHeads = three ? [0, -s * (land ? 62 - hw : wide ? 58 : 50)] : [-s * (land ? 58 - hw + r() * 14 : wide ? 50 + r() * 12 : 35 + r() * 20)];
    for (const h of deadHeads) { const L = Math.max(H * (0.1 + r() * 0.06), G.S * (0.3 + r() * 0.06)) * k * (h === 0 ? 0.85 : 1), d = dir(h); fork.br.push({ pts: [F, { x: F.x + d.x * L, y: F.y + d.y * L }], home: false, kind: kinds[ki++ % 4], head: h }); }
    fork.br.sort((a, b) => a.head - b.head); forks.push(fork); F = next;
  }
  const houseW = Math.max(0.38 * G.S * K(house.y), G.minHouseW);
  return { stem, forks, house, houseW, fallback: !!fixed };
}
export function segments(n: Net) {
  const segs: { a: P; b: P; id: number }[] = []; let id = 0;
  const add = (pts: P[]) => { for (let i = 1; i < pts.length; i++) segs.push({ a: pts[i - 1], b: pts[i], id: id++ }); };
  add(n.stem); n.forks.forEach((f) => f.br.forEach((b) => add(b.pts))); return segs;
}
export function propRect(G: Geo, kind: Kind, e: P) { const k = G.K(e.y), w = PROP_W[kind] * G.S * k, h = w * PROP_AR[kind]; return { x0: e.x - w / 2, x1: e.x + w / 2, y0: e.y + 0.02 * G.S * k - h, y1: e.y + 0.02 * G.S * k }; }
export function houseRect(G: Geo, n: Net) { const w = n.houseW, h = w * HOUSE_AR; return { x0: n.house.x - w / 2, x1: n.house.x + w / 2, y0: n.house.y - 0.8 * h, y1: n.house.y + 0.2 * h }; }
const near = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y) < 1;
export function valid(G: Geo, n: Net, why: string[] = []): boolean {
  const { W, H, S, K } = G, rw = (y: number) => G.w0 * K(y), segs = segments(n);
  const inAvoid = (x: number, y: number) => x < G.avoid.x1 && y < G.avoid.y1;
  for (const s of segs) for (const p of [s.a, s.b]) { if (p.y > H) continue; if (p.x < 0.08 * W || p.x > 0.92 * W) { why.push("x-range"); return false; } if (p.y < G.yFar - 0.001) { why.push("above yFar"); return false; } if (inAvoid(p.x, p.y)) { why.push("toward stilt house"); return false; } }
  // roads keep a corridor between them, except right at a fork where they legitimately meet
  const nodes = n.forks.map((f) => ({ x: f.x, y: f.y })), clr = (_q: P) => false, both = (p: P, q: P) => nodes.some((F) => { const R = rw(F.y) * 1.8 + 0.04 * S; return Math.hypot(p.x - F.x, p.y - F.y) < R && Math.hypot(q.x - F.x, q.y - F.y) < R; });
  const samp = (s: { a: P; b: P }) => { const o: P[] = [], m = Math.max(2, Math.ceil(Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) / (0.03 * S))); for (let q = 0; q <= m; q++) { const p = { x: s.a.x + (s.b.x - s.a.x) * q / m, y: s.a.y + (s.b.y - s.a.y) * q / m }; if (p.y <= H && !clr(p)) o.push(p); } return o; };
  const SP = segs.map(samp);
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    const A = segs[i], B = segs[j]; if (near(A.a, B.a) || near(A.a, B.b) || near(A.b, B.a) || near(A.b, B.b)) continue;
    for (const p of SP[i]) for (const q of SP[j]) if (!both(p, q) && Math.hypot(p.x - q.x, p.y - q.y) < (rw(p.y) + rw(q.y)) / 2 + 0.04 * S) { why.push("segments too close"); return false; }
    if (cross(A.a, A.b, B.a, B.b)) { why.push("roads cross"); return false; }
  }
  // props + house: clear of every other road, inside the screen, not in the stilt-house corner, not overlapping each other
  const rects: { x0: number; x1: number; y0: number; y1: number; own: P }[] = [];
  n.forks.forEach((f) => f.br.forEach((b) => { if (b.kind) { const e = b.pts[b.pts.length - 1]; rects.push({ ...propRect(G, b.kind, e), own: e }); } }));
  const lastHome = n.forks[n.forks.length - 1].br.find((b) => b.home)!.pts;
  const hr = houseRect(G, n); rects.push({ ...hr, own: n.house });
  for (const R of rects) {
    if (R.x0 < 2 || R.x1 > W - 2) { why.push("prop off-screen"); return false; }
    if (inAvoid(R.x0, R.y1) && R !== rects[rects.length - 1]) { why.push("prop in stilt-house corner"); return false; }
    const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2, hw = (R.x1 - R.x0) / 2, hh = (R.y1 - R.y0) / 2, k = K(R.own.y);
    for (const s of segs) {
      if (near(s.b, R.own) || near(s.a, R.own)) continue;
      if (R.own === n.house && lastHome.some((q) => near(q, s.a) && lastHome.some((q2) => near(q2, s.b)))) continue; // the house's own approach road
      const ym = (s.a.y + s.b.y) / 2;
      // sample the segment against the (padded) rect
      for (const q of SP[segs.indexOf(s)]) { const pad = rw(q.y) / 2 + 0.01 * S;
        if (Math.abs(q.x - cx) < hw + pad && Math.abs(q.y - cy) < hh + pad) { why.push("prop on another road"); return false; }
        if (R.own !== n.house && Math.hypot(q.x - R.own.x, q.y - R.own.y) < 0.13 * S * k + rw(q.y) / 2) { why.push("end not clear"); return false; } }
    }
  }
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i], b = rects[j]; if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) { why.push("props overlap"); return false; } }
  // house: clearly bigger than, and nearer than, the painted stilt house
  if (hr.x0 < G.avoid.x1 && hr.y1 < G.avoid.y1) { why.push("house in corner"); return false; }
  return true;
}
/** hand-made fallback: a 2-way fork per row with fixed headings, home toward the centre/right */
function fallback(G: Geo, r: () => number): Net {
  for (let t = 0; t < 200; t++) { const n = attempt({ ...G }, r, [1]); if (n && valid(G, n)) return n; }
  const g2 = { ...G, step: Math.max(1, G.step - 1) }; if (G.step > 1) return fallback(g2, r);
  return attempt(G, r, [1])!;
}
