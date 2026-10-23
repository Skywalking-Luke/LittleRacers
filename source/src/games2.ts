import { g, D, C, R, MIN, hit, Pt, sfx, say, box, bubbles, burst, shuffle, ri, COLS, star, txt, rnd, ptri } from "./core";
import * as SC from "./scenes";
import { veh, VW, backdrop, road, place, btnBox, shape, garage, cover, coverY, pic, prop, propFit, grass, shadow, roadBand, tarmac, fitPic, tmul } from "./art";
import { Game, Item, mkItem, ease, bobY, wx, rectOf, iconBtn } from "./game";
import { S, word } from "./audio";
import { fitU } from "./games1";
const VCOL = [C.red, C.yellow, C.blue, C.green, C.lav, C.orange];

// 7. Count the Cars (Toll Plaza, dusk) ------------------------------------
export class Count extends Game {
  id = "count"; rounds = 4; n = 1; cars: Item[] = []; opts: Item[] = []; tapped = 0; go = 0; u = 4; counting = false;
  start() {
    const rng = [[1, 3], [3, 5], [4, 7], [6, 10]][this.round]; this.n = ri(rng[0], rng[1]);
    this.cars = Array.from({ length: this.n }, (_, i) => mkItem({ col: VCOL[i % VCOL.length], num: 0 }));
    const set = new Set([this.n]); while (set.size < 3) { const v = this.n + ri(-3, 3); if (v >= 1 && v <= 10) set.add(v); }
    this.opts = shuffle([...set]).map((v) => mkItem({ v })); this.tapped = 0; this.go = 0; this.counting = false; this.prompt();
  }
  prompt() { say("23"); }
  place() {
    const land = D.W > D.H, top = this.back.y + this.back.h + D.U * 2, areaH = (land ? D.H : D.H * 0.62) - top;
    const perRow = 5, rows = Math.ceil(this.n / perRow);
    const cw = (land ? D.W * 0.62 : D.W * 0.9) / perRow, ch = Math.min(areaH / 2.4, cw * 0.75);
    this.u = fitU("car", cw * 0.92, ch * 0.9);
    // the queue stands on the toll plaza's painted ground line (never in the sky)
    const glc = coverY("bg-toll", 0.7), base0 = Math.min((glc ?? top + areaH * 0.45 + ch * 0.4) + ch * 0.15, (land ? D.H : D.H - Math.max(MIN * 1.2, Math.min(D.W, D.H) * 0.19) * 1.35) - (rows - 1) * ch * 1.15 - D.U * 3);
    this.cars.forEach((c, i) => { const r = Math.floor(i / perRow), k = i % perRow; c.w = Math.max(MIN, cw); c.h = Math.max(MIN, ch); c.x = c.hx = (land ? D.W * 0.04 : D.W * 0.05) + cw * (k + 0.5); c.y = c.hy = base0 - ch * 0.4 + r * ch * 1.15; });
    const s = Math.max(MIN * 1.2, Math.min(D.W, D.H) * 0.19);
    this.opts.forEach((o, i) => { o.w = o.h = s; if (land) { o.x = o.hx = D.W - s * 0.8; o.y = o.hy = top + (D.H - top) * (i + 0.5) / 3; } else { o.x = o.hx = D.W / 2 + (i - 1) * s * 1.25; o.y = o.hy = D.H - s * 0.75; } });
  }
  press(p: Pt) {
    if (this.counting) return;
    for (const c of this.cars) if (hit(p, rectOf(c))) { if (!c.num) { c.num = ++this.tapped; } c.bob = 1; sfx.beep(); say("n" + c.num); return; }
    for (const o of this.opts) if (hit(p, rectOf(o))) {
      if (o.v === this.n) { o.bob = 1; this.go = 0.01; sfx.ding(); this.win(o.x, o.y, this.n === 5 ? "24" : "x_count_yes", this.n === 5 ? undefined : { n: word("n" + this.n) }, 3.2); }
      else { this.oops(o, "25"); this.countAll(); }
      return;
    }
  }
  async countAll() {
    this.counting = true; this.cars.forEach((c) => (c.num = 0)); this.tapped = 0;
    await new Promise((r) => setTimeout(r, 1500));
    for (const c of this.cars) { c.num = ++this.tapped; c.bob = 1; sfx.beep(); await say("n" + c.num); }
    this.counting = false;
  }
  tick(dt: number) { this.cars.forEach((c) => ease(c, dt)); this.opts.forEach((o) => ease(o, dt)); if (this.go) this.go += dt; }
  paint() {
    const gy = backdrop("dusk", 0.4), u = D.U, paintedToll = cover("bg-toll");
    if (!paintedToll) R(0, gy, D.W, D.H - gy, "#D9CFC0");
    const tx = (D.W > D.H ? D.W * 0.66 : D.W * 0.92);
    if (!paintedToll) SC.tollPlaza(tx, this.cars.length ? this.cars[0].y + this.cars[0].h * 0.4 : gy, u);
    { const by = this.cars.length ? this.cars[0].y + this.cars[0].h * 0.4 : gy; place("toll", tx, by, u); const bar = pic("toll-barrier"); if (bar) { const L = 22 * u, H2 = L * bar.naturalHeight / bar.naturalWidth; g.save(); g.translate(tx - 5 * u, by - 9 * u); g.rotate(-Math.min(1.2, (this.go || 0) * 3)); g.drawImage(bar, -L, -H2 / 2, L, H2); g.restore(); } }
    for (const c of this.cars) {
      const dx = this.go ? Math.pow(this.go, 2) * D.W * 0.25 : 0;
      veh("car", c.x + dx, c.y + c.h * 0.4 + bobY(c), this.u, c.col);
      if (c.num) txt(String(c.num), c.x + dx, c.y - c.h * 0.25 + bobY(c), Math.max(14, this.u * 4), C.white);
    }
    for (const o of this.opts) {
      btnBox(o.x - o.w / 2 + wx(o), o.y - o.h / 2 + bobY(o), o.w, o.h, C.cream);
      txt(String(o.v), o.x + wx(o), o.y - o.h * 0.12 + bobY(o), o.h * 0.38, C.blue);
      const d = Math.max(3, Math.floor(o.w / 18)); for (let i = 0; i < o.v; i++) R(o.x - o.w * 0.4 + (i % 5) * o.w * 0.17 + d, o.y + o.h * 0.18 + Math.floor(i / 5) * d * 2 + bobY(o), d, d, C.k);
    }
  }
}

// 8. Road Maze (trace the road) -------------------------------------------
const PATHS = [[[0.08, 0.75], [0.4, 0.75], [0.4, 0.4], [0.85, 0.4]], [[0.08, 0.4], [0.3, 0.4], [0.3, 0.78], [0.62, 0.78], [0.62, 0.45], [0.85, 0.45]], [[0.08, 0.8], [0.25, 0.8], [0.25, 0.45], [0.5, 0.45], [0.5, 0.8], [0.72, 0.8], [0.72, 0.5], [0.87, 0.5]]];
const CELLS = [[[0, 2], [3, 2], [3, 0], [6, 0]], [[0, 0], [2, 0], [2, 2], [4, 2], [4, 1], [6, 1]], [[0, 2], [1, 2], [1, 0], [3, 0], [3, 2], [5, 2], [5, 1], [6, 1]]];
const DEST = ["home", "school", "pasar"];
export class Maze extends Game {
  id = "maze"; rounds = 3; pts: { x: number; y: number }[] = []; segs: number[] = []; len = 0; prog = 0; holding = false; u = 4; arrived = false; tiles = false; T = 0; gx = 0; gy = 0; cells: { c: number; r: number; k: string; rot: number }[] = []; cols = 7; rows = 3;
  start() { this.prog = 0; this.arrived = false; this.prompt(); }
  prompt() { const d = DEST[this.round]; if (d === "pasar") say("26"); else say("x_maze", { p: word("p_" + d) }); }
  place() {
    if (this.placeTiles()) return;
    const land = D.W > D.H; const P = PATHS[this.round];
    this.pts = P.map(([x, y]) => (land ? { x: x * D.W, y: y * D.H } : { x: (1 - y) * D.W * 1.0 + D.W * 0.0, y: x * D.H }));
    if (!land) this.pts = P.map(([x, y]) => ({ x: D.W * (0.15 + (y - 0.35) * 1.4), y: D.H * (0.18 + x * 0.8) }));
    this.segs = []; this.len = 0; for (let i = 1; i < this.pts.length; i++) { const l = Math.hypot(this.pts[i].x - this.pts[i - 1].x, this.pts[i].y - this.pts[i - 1].y); this.segs.push(l); this.len += l; }
    this.u = fitU("car", Math.min(D.W, D.H) * 0.2, Math.min(D.W, D.H) * 0.14);
  }
  at(d: number) { let acc = 0; for (let i = 0; i < this.segs.length; i++) { if (d <= acc + this.segs[i] || i === this.segs.length - 1) { const t = Math.min(1, (d - acc) / this.segs[i]); const a = this.pts[i], b = this.pts[i + 1]; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x }; } acc += this.segs[i]; } return this.pts[0] as any; }
  proj(p: Pt) { let best = 1e9, bd = 0, acc = 0; for (let i = 0; i < this.segs.length; i++) { const a = this.pts[i], b = this.pts[i + 1]; const vx = b.x - a.x, vy = b.y - a.y; let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / (vx * vx + vy * vy); t = Math.max(0, Math.min(1, t)); const dd = Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y); const d = acc + t * this.segs[i]; if (dd < best && Math.abs(d - this.prog) < this.len * 0.25) { best = dd; bd = d; } acc += this.segs[i]; } return { dist: best, d: bd }; }
  press(p: Pt) { const c = this.at(this.prog); if (Math.hypot(p.x - c.x, p.y - c.y) < Math.max(MIN, this.u * 14)) { this.holding = true; sfx.pop(); } else { const pr = this.proj(p); if (pr.dist < MIN) { this.holding = true; } else say("x_maze_trace"); } }
  drag2(p: Pt) { if (!this.holding || this.arrived) return; const pr = this.proj(p); if (pr.dist < Math.max(MIN * 1.5, D.U * 20) && pr.d > this.prog) { this.prog = Math.min(this.len, pr.d); if (Math.random() < 0.1) sfx.rub(); } if (this.prog >= this.len - 2) { this.arrived = true; const e = this.pts[this.pts.length - 1]; this.win(e.x, e.y, "27"); } }
  release() { this.holding = false; }
  paint() {
    if (this.tiles) { this.paintTiles(); return; }
    const kind = DEST[this.round] === "pasar" ? "pasar" : "taman";
    backdrop(kind as any, 0.12); const u = D.U, w = Math.max(MIN, this.u * 16);
    SC.townMap(this.pts, w * 0.5 + u * 2, D.H * 0.14);
    g.lineCap = "round"; g.lineJoin = "round";
    const stroke = (c: string, lw: number, dash: number[] = []) => { g.setLineDash(dash); g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); this.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); g.setLineDash([]); };
    stroke(C.k, w + u * 2); stroke(C.road, w); stroke(C.white, u, [u * 4, u * 4]);
    const e = this.pts[this.pts.length - 1];
    place(DEST[this.round], e.x, e.y + w * 0.2, Math.max(2, Math.floor(this.u * 0.7)));
    // hint footprints ahead
    const ah = this.at(Math.min(this.len, this.prog + this.len * 0.1)); if (!this.holding && !this.arrived) star(ah.x, ah.y, u * (2 + Math.sin(D.t * 3)), C.yellow);
    const c: any = this.at(this.prog); veh("car", c.x, c.y + this.u * 5, this.u, C.red, { flip: c.dx < 0 });
  }
  placeTiles() {
    this.tiles = false; const imS = pic("maze-road-straight"), imC = pic("maze-road-corner"), imE = pic("maze-road-end-cap"); if (!imS || !imC || !imE) return false;
    const land = D.W > D.H, hud = this.back.y + this.back.h + D.U * 2, C0 = land ? 7 : 3, R0 = land ? 3 : 7;
    this.T = Math.floor(Math.min(D.W / C0, (D.H - hud - D.U * 2) / R0)); this.cols = C0; this.rows = R0;
    this.gx = Math.round((D.W - C0 * this.T) / 2); this.gy = Math.round(hud + (D.H - hud - R0 * this.T) / 2);
    const P = CELLS[this.round].map(([c, r]) => (land ? { c, r } : { c: r, r: c })), T = this.T, D4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const cells: { c: number; r: number }[] = []; for (let i = 0; i < P.length; i++) { if (!i) { cells.push(P[0]); continue; } const a = P[i - 1], b = P[i], n = Math.max(Math.abs(b.c - a.c), Math.abs(b.r - a.r)), dc = Math.sign(b.c - a.c), dr = Math.sign(b.r - a.r); for (let k = 1; k <= n; k++) cells.push({ c: a.c + dc * k, r: a.r + dr * k }); }
    const di = (a: { c: number; r: number }, b: { c: number; r: number }) => D4.findIndex(([x, y]) => x === Math.sign(b.c - a.c) && y === Math.sign(b.r - a.r));
    const pts: { x: number; y: number }[] = []; this.cells = [];
    cells.forEach((cl, i) => {
      const cx = this.gx + (cl.c + 0.5) * T, cy = this.gy + (cl.r + 0.5) * T, pv = cells[i - 1], nx = cells[i + 1];
      if (!pv) { this.cells.push({ ...cl, k: "s", rot: 1 - (di(cl, nx) % 2) }); pts.push({ x: cx, y: cy }); return; }
      if (!nx) { const dp = di(cl, pv); this.cells.push({ ...cl, k: "e", rot: (dp + 1) % 4 }); const d = D4[dp]; pts.push({ x: cx - d[0] * T * 0.12, y: cy - d[1] * T * 0.12 }); return; }
      const dp = di(cl, pv), dn = di(cl, nx);
      if (dp % 2 === dn % 2) { this.cells.push({ ...cl, k: "s", rot: 1 - (dp % 2) }); pts.push({ x: cx, y: cy }); return; }
      let rot = 0; for (let r = 0; r < 4; r++) { const o = [(2 + r) % 4, (1 + r) % 4]; if (o.includes(dp) && o.includes(dn)) rot = r; }
      this.cells.push({ ...cl, k: "c", rot });
      const d1 = D4[dp], d2 = D4[dn], ox = cx + (T / 2) * (d1[0] + d2[0]), oy = cy + (T / 2) * (d1[1] + d2[1]);
      for (let k = 0; k <= 6; k++) { const th = (k / 6) * Math.PI / 2; pts.push({ x: ox + (T / 2) * (-d2[0] * Math.cos(th) - d1[0] * Math.sin(th)), y: oy + (T / 2) * (-d2[1] * Math.cos(th) - d1[1] * Math.sin(th)) }); }
    });
    this.pts = pts; this.segs = []; this.len = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); this.segs.push(l); this.len += l; }
    this.u = fitU("car", T * 0.8, T * 0.36); this.tiles = true; return true;
  }
  paintTiles() {
    const T = this.T, u = D.U, gim = pic("maze-grass"), im: Record<string, HTMLImageElement> = { s: pic("maze-road-straight")!, c: pic("maze-road-corner")!, e: pic("maze-road-end-cap")! };
    R(0, 0, D.W, D.H, "#b9cf86");
    const c0 = -Math.ceil(this.gx / T), c1 = Math.ceil((D.W - this.gx) / T), r0 = -Math.ceil(this.gy / T), r1 = Math.ceil((D.H - this.gy) / T);
    if (gim) { const th = Math.ceil(T / 2); for (let r = r0 * 2; r < r1 * 2; r++) for (let c = c0; c < c1; c++) { g.save(); const x = Math.round(this.gx + c * T), y = Math.round(this.gy + (r * T) / 2); g.translate(x, y); if (r & 1) { g.translate(0, th); g.scale(1, -1); } g.drawImage(gim, 0, 0, Math.ceil(T) + 1, th + 1); g.restore(); } }
    const road = new Set(this.cells.map((c) => c.c + "," + c.r)), hs = (c: number, r: number) => { let h = (c * 73856093) ^ (r * 19349663) ^ (this.round * 83492791); h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    const top: { k: string; x: number; y: number; w: number }[] = [];
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) { if (road.has(c + "," + r)) continue; const h = hs(c, r), x = this.gx + (c + 0.5) * T + (hs(r, c) - 0.5) * T * 0.25, y = this.gy + (r + 0.5) * T + (hs(c + 9, r) - 0.5) * T * 0.2; if (h < 0.3) top.push({ k: "maze-tree-top", x, y, w: T * (0.7 + h) }); else if (h < 0.42) top.push({ k: "maze-house-top", x, y, w: T * 0.8 }); }
    for (const cl of this.cells) { const x = Math.round(this.gx + cl.c * T), y = Math.round(this.gy + cl.r * T), w = Math.round(this.gx + (cl.c + 1) * T) - x; g.save(); g.translate(x + w / 2, y + w / 2); g.rotate((cl.rot * Math.PI) / 2); g.drawImage(im[cl.k], -w / 2 - 0.5, -w / 2 - 0.5, w + 1, w + 1); g.restore(); }
    for (const t of top) { shadow(t.x + t.w * 0.08, t.y + t.w * 0.12, t.w * 0.95); const p = pic(t.k); if (p) g.drawImage(p, t.x - t.w / 2, t.y - t.w / 2, t.w, t.w); }
    const e = this.pts[this.pts.length - 1];
    place(DEST[this.round], e.x, e.y + T * 0.3, Math.max(2, this.u * 0.9));
    const ah = this.at(Math.min(this.len, this.prog + this.len * 0.1)); if (!this.holding && !this.arrived) star(ah.x, ah.y, u * (2 + Math.sin(D.t * 3)), C.yellow);
    const c: any = this.at(this.prog); shadow(c.x, c.y + this.u * 5, this.u * 17); veh("car", c.x, c.y + this.u * 5, this.u, C.red, { flip: c.dx < 0 });
  }
}

// 9. Shape Garage ----------------------------------------------------------
const SH = ["circle", "square", "triangle"];
export class ShapeGarage extends Game {
  id = "shape"; rounds = 4; car: Item = mkItem(); tun: Item[] = []; inT = 0;
  start() { const s = this.round === 0 ? "circle" : SH[ri(0, 2)]; this.car = mkItem({ s, col: VCOL[this.round] }); this.tun = shuffle(SH).map((s, i) => mkItem({ s, col: [C.lav, C.green, C.orange][i] })); this.inT = 0; this.prompt(); }
  prompt() { const s = this.car.s; if (s === "circle") say("28"); else say("x_shape", { s: word("s_" + s) }); }
  place() {
    const land = D.W > D.H, top = this.back.y + this.back.h + D.U * 4;
    const tw = land ? Math.min(D.W / 4, D.H * 0.4) : Math.min(D.W / 3.4, D.H * 0.2);
    this.tun.forEach((t, i) => { t.w = tw; t.h = tw * 0.9; t.x = t.hx = D.W / 2 + (i - 1) * tw * 1.2; t.y = t.hy = top + t.h / 2 + D.U * 6; });
    const c = this.car; c.w = Math.max(MIN * 1.4, tw); c.h = Math.max(MIN, tw * 0.75); c.u = fitU("car", c.w, c.h * 0.65); c.x = c.hx = D.W / 2; c.y = c.hy = land ? D.H - c.h * 0.7 : D.H * 0.72;
  }
  press(p: Pt) { if (hit(p, rectOf(this.car), D.U * 3)) this.grab(this.car, p); }
  release() {
    if (!this.drag) return; const c = this.car; const t = this.tun.find((t) => hit({ x: c.x, y: c.y }, rectOf(t), D.U * 3)); if (!t) return;
    if (t.s === c.s) { c.hx = t.x; c.hy = t.y + t.h * 0.2; this.inT = 0.01; this.win(t.x, t.y, "29"); } else this.oops(c, this.car.s === "circle" ? "28" : "x_shape", this.car.s === "circle" ? undefined : { s: word("s_" + this.car.s) });
  }
  tick(dt: number) { if (this.drag !== this.car) ease(this.car, dt, 5); this.car.wig = Math.max(0, this.car.wig - dt); if (this.inT) this.inT = Math.min(1, this.inT + dt); }
  paint() {
    const hill = pic("shape-hill");
    if (hill) { const t0 = this.tun[0], gb = t0 ? t0.y + t0.h / 2 : D.H * 0.5; backdrop("plain", Math.min(0.62, Math.max(0.3, (gb - D.U * 4) / D.H)), t0 ? gb - (t0.w * 1.18 * hill.naturalHeight) / hill.naturalWidth : 1e9); }
    else { const gy = backdrop("plain", 0.45); const t0 = this.tun[0]; SC.hillside(D.W / 2, t0 ? t0.y - t0.h * 0.75 : gy * 0.5, Math.max(gy, t0 ? t0.y + t0.h / 2 : gy), D.U); } const u = D.U;
    for (const t of this.tun) { const x = t.x - t.w / 2, y = t.y - t.h / 2; if (hill) { const hw = t.w * 1.18, hh = hw * hill.naturalHeight / hill.naturalWidth, gb = t.y + t.h / 2; shadow(t.x, gb, hw * 0.8); g.drawImage(hill, t.x - hw / 2, gb - hh + u, hw, hh); const sg = pic("shape-tunnel-sign"); if (sg) { const sz = Math.min(t.w * 0.55, hh * 0.7), sb = gb + sz * 1.0 + u * 2; shadow(t.x, sb, sz * 0.5); g.drawImage(sg, t.x - sz / 2, sb - sz, sz, sz); shape(t.s, t.x, sb - sz * 0.675, sz * 0.17, t.col, u); } else { const sy = gb - hh * 0.72; box(t.x - hh * 0.12, sy - hh * 0.12, hh * 0.24, hh * 0.24, t.col, u); shape(t.s, t.x, sy, hh * 0.09, C.white, u); } continue; } box(x, y, t.w, t.h, t.col, u); R(x + t.w * 0.15, y + t.h * 0.45, t.w * 0.7, t.h * 0.55 - u, "#5e5a6e"); shape(t.s, t.x, y + t.h * 0.24, t.h * 0.15, C.white, u); }
    const c = this.car; if (this.inT >= 1) return;
    g.save(); if (this.inT) g.globalAlpha = 1 - this.inT;
    const gy = c.y + c.h * 0.35; veh("car", c.x + wx(c), gy, c.u, c.col);
    { const r = c.h * 0.16, rx = c.x + wx(c), rt = gy - c.u * 11; shape(c.s, rx, rt - r * 1.67 + u * 2, r, C.white, u); }
    g.restore();
  }
}

// 10. Letter Road ----------------------------------------------------------
const WORDS = { en: [["CAR", "car"], ["BUS", "bus"], ["VAN", "van"]], bm: [["BAS", "bus"], ["VAN", "van"], ["LORI", "lorry"]] } as any;
/** painted wooden letter tile (warm glow when it is the one to find / found), else the code box */
function lTile(x: number, y: number, w: number, h: number, col: string, u: number) { const im = pic("letter-tile"); if (!im) { box(x, y, w, h, col, u); return; } if (col === C.yellow) { const gl = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, w * 0.8); gl.addColorStop(0, "rgba(255,226,140,.8)"); gl.addColorStop(1, "rgba(255,226,140,0)"); g.fillStyle = gl; g.fillRect(x - w * 0.3, y - h * 0.3, w * 1.6, h * 1.6); } g.drawImage(im, x, y, w, h); }
export class LetterRoad extends Game {
  id = "letter"; rounds = 3; w = "CAR"; vk = "car"; got = 0; lane = 1; carL = 1; wave: { l: string; lane: number; x: number; hit?: boolean; age?: number }[] = []; u = 4; scroll = 0; lanesY: number[] = []; lh = 0; art = false; sx = 1.15; yR = 0; rs = 1; lhs: number[] = [0, 0, 0]; bgg = { top: 0, h: 0, w: 0, x: 0 };
  start() { const W = WORDS[S.lang][this.round]; this.w = W[0]; this.vk = W[1]; this.got = 0; this.lane = this.carL = 1; this.newWave(); this.prompt(); }
  prompt() { const spelled = this.w.split("").join(", "); if ((S.lang === "en" && this.w === "CAR") || (S.lang === "bm" && this.w === "BAS")) say("30"); else say("x_letter_ask", { w: spelled, W: word("v_" + this.vk) }); }
  newWave() { if (this.art || this.geo()) this.art = true; const right = ri(0, 2), want = this.w[this.got]; const pool = "ABCDEFGKLMNOPRSTUV".split("").filter((c) => c !== want); this.wave = [0, 1, 2].map((l) => ({ l: l === right ? want : pool[ri(0, pool.length - 1)], lane: l, x: this.sx, age: 0 })); if (Math.random() < 0.4) this.wave.splice(this.wave.findIndex((w) => w.lane !== right), 1); }
  geo() { const im = pic("bg-padi-letter"), rd = pic("letter-road"); if (!im || !rd) return false; const land = D.W > D.H, z = land ? 1.35 : 1.15, sc = Math.max(D.W / im.naturalWidth, (D.H * z) / im.naturalHeight), h = im.naturalHeight * sc, w = im.naturalWidth * sc; this.bgg = { top: D.H - h, h, w, x: (D.W - w) / 2 }; this.yR = this.bgg.top + 0.665 * h; this.rs = (D.H - this.yR) / rd.naturalHeight; const sx = this.rs; this.lanesY = [92, 241, 410].map((c) => this.yR + c * sx); this.lhs = [140, 159, 179].map((b) => b * sx); this.lh = (this.lhs[0] + this.lhs[1] + this.lhs[2]) / 3; this.u = fitU("car", Math.max(D.W * 0.18, Math.min(D.W * 0.28, this.lhs[2] * 1.3)), this.lhs[2] * 0.7); this.sx = Math.min(1.15, 1 - this.bwOf(2) / 2 / D.W - 0.02); return true; }
  bwOf(l: number) { return Math.max(this.lhs[l] * 0.92, Math.min(this.lhs[l] * 1.5, D.W * 0.3)); }
  lsc(l: number) { return [0.78, 0.89, 1][Math.max(0, Math.min(2, Math.round(l)))]; }
  place() {
    this.art = this.geo(); if (this.art) return;
    const top = this.back.y + this.back.h + D.H * 0.14, bot = D.H - D.U * 4; this.lh = (bot - top) / 3; this.lanesY = [0, 1, 2].map((i) => top + this.lh * (i + 0.5)); this.u = fitU("car", D.W * 0.18, this.lh * 0.7); }
  press(p: Pt) { if (this.art) { if (p.y < this.yR) return; const i = p.y < this.yR + this.rs * 162 ? 0 : p.y < this.yR + this.rs * 321 ? 1 : 2; if (i !== this.lane) sfx.tap(); this.lane = i; return; } for (let i = 0; i < 3; i++) if (Math.abs(p.y - this.lanesY[i]) < this.lh / 2) { this.lane = i; sfx.tap(); } }
  drag2(p: Pt) { this.press(p); }
  tick(dt: number) {
    if (this.wait > 0) return;
    this.carL += (this.lane - this.carL) * Math.min(1, dt * 5); this.scroll += dt * D.W * 0.18;
    const carX = 0.2;
    for (const w of this.wave) {
      w.x -= dt * 0.12; w.age = (w.age || 0) + dt;
      if (!w.hit && w.x < carX + 0.04 && w.x > carX - 0.04 && Math.round(this.carL) === w.lane) {
        w.hit = true;
        if (w.l === this.w[this.got]) { this.got++; sfx.ding(); burst(carX * D.W, this.lanesY[w.lane], 8); say(w.l === "B" ? "31" : "x_letter_one", w.l === "B" ? undefined : { L: w.l }); w.x = -1; if (this.got >= this.w.length) { this.win(D.W / 2, D.H * 0.2, "32", undefined, 3.2); return; } }
        else { sfx.boop(); }
      }
    }
    if (this.wave.every((w) => w.x < -0.1)) this.newWave();
  }
  paintArt() {
    const u = D.U, G = this.bgg, bg = pic("bg-padi-letter")!, rd = pic("letter-road")!;
    R(0, 0, D.W, D.H, "#f4ead6"); g.drawImage(bg, G.x, G.top, G.w, G.h);
    const tw = Math.ceil(rd.naturalWidth * this.rs), off = this.scroll % tw; for (let x = -off; x < D.W; x += tw - 1) g.drawImage(rd, Math.round(x), this.yR, tw, D.H - this.yR + 1);
    const bs = Math.min(this.lhs[1] * 0.8, (D.W * 0.5) / this.w.length), by = this.back.y + this.back.h + D.H * 0.07, wx0 = D.W / 2 - ((this.w.length + 1.3) * bs * 1.1) / 2 + bs * 1.43;
    { const cx = wx0 - bs * 1.43; lTile(cx, by - bs / 2, bs, bs, C.cream, u); veh(this.vk, cx + bs / 2, by + bs * 0.32, fitU(this.vk, bs * 0.82, bs * 0.6), C.yellow); }
    for (let i = 0; i < this.w.length; i++) { lTile(wx0 + i * bs * 1.1, by - bs / 2, bs, bs, i < this.got ? C.yellow : C.cream, u); if (i < this.got) txt(this.w[i], wx0 + i * bs * 1.1 + bs / 2, by, bs * 0.55, C.k, "center", false); else if (i === this.got) txt(this.w[i], wx0 + i * bs * 1.1 + bs / 2, by, bs * 0.55, "#d8d0c4", "center", false); }
    const base = (l: number) => { const a = Math.max(0, Math.min(2, Math.floor(l))), b = Math.min(2, a + 1), f = l - a, y = (i: number) => this.lanesY[i] + this.lhs[i] * 0.3; return y(a) + (y(b) - y(a)) * f; };
    const bd = pic("letter-sign-board");
    for (const w of this.wave) if (w.x > -0.1 && !w.hit) { const x = w.x * D.W, bsl = this.lanesY[w.lane] + this.lhs[w.lane] * 0.3, s = this.bwOf(w.lane); if (!bd) continue; g.save(); g.globalAlpha = Math.min(1, (w.age || 0) * 4); const bh = s * bd.naturalHeight / bd.naturalWidth, top = bsl - bh; shadow(x, bsl, s * 0.7); g.drawImage(bd, x - s / 2, top, s, bh); if (w.l === this.w[this.got]) { g.save(); g.globalAlpha = 0.65; g.fillStyle = C.yellow; g.fillRect(x - s * 0.43, top + bh * 0.07, s * 0.86, bh * 0.58); g.restore(); } txt(w.l, x, top + bh * 0.36, bh * 0.42, C.k, "center", false); g.restore(); }
    const cb = base(this.carL), cu = this.u * (0.78 + 0.22 * (this.carL / 2)); shadow(0.2 * D.W, cb, cu * 17); veh("car", 0.2 * D.W, cb, cu, C.red);
  }
  paint() {
    if (this.art) { this.paintArt(); return; }
    const u = D.U, top = this.lanesY[0] - this.lh / 2; { const hz = Math.max(D.H * 0.12, top * 0.32); backdrop("plain", hz / D.H); if (!cover("bg-padi")) { SC.padi(hz, top, u); SC.padi(top + this.lh * 3, D.H + u, u); SC.palm(D.W * 0.04, hz + u * 2, u * 0.6); SC.palm(D.W * 0.9, hz + u * 2, u * 0.6); } }
    if (!tarmac(0, top, D.W, this.lh * 3)) R(0, top, D.W, this.lh * 3, C.road); for (let i = 1; i < 3; i++) { const y = top + this.lh * i; for (let x = -(this.scroll % (u * 20)); x < D.W; x += u * 20) R(x, y - u / 2, u * 10, u, C.white); }
    // word slots + picture
    const bs = Math.min(this.lh * 0.7, (D.W * 0.5) / this.w.length), by = this.back.y + this.back.h + D.H * 0.07;
    const wx0 = D.W / 2 - (this.w.length * bs * 1.1) / 2;
    veh(this.vk, wx0 - bs * 1.2, by + bs * 0.4, fitU(this.vk, bs * 1.6, bs * 0.9), C.yellow);
    for (let i = 0; i < this.w.length; i++) { lTile(wx0 + i * bs * 1.1, by - bs / 2, bs, bs, i < this.got ? C.yellow : C.cream, u); if (i < this.got) txt(this.w[i], wx0 + i * bs * 1.1 + bs / 2, by, bs * 0.55, C.k, "center", false); else if (i === this.got) txt(this.w[i], wx0 + i * bs * 1.1 + bs / 2, by, bs * 0.55, "#d8d0c4", "center", false); }
    for (const w of this.wave) if (w.x > -0.1 && !w.hit) { const x = w.x * D.W, y = this.lanesY[w.lane], s = this.lh * 0.66, bd = pic("letter-sign-board");
      if (bd) { const bw = s * 1.4, bh = bw * bd.naturalHeight / bd.naturalWidth, base = y + u * 2, top = base - bh; shadow(x, base, bw * 0.7); g.drawImage(bd, x - bw / 2, top, bw, bh); if (w.l === this.w[this.got]) { g.save(); g.globalAlpha = 0.65; g.fillStyle = C.yellow; g.fillRect(x - bw * 0.43, top + bh * 0.07, bw * 0.86, bh * 0.58); g.restore(); } txt(w.l, x, top + bh * 0.36, bh * 0.42, C.k, "center", false); continue; }
      R(x - s / 2 - u, y - s / 2 - u * 3, u * 2, s + u * 3, C.k); R(x + s / 2 - u, y - s / 2 - u * 3, u * 2, s + u * 3, C.k); lTile(x - s / 2, y - s / 2 - u * 4, s, s * 0.8, w.l === this.w[this.got] ? C.yellow : C.cream, u); txt(w.l, x, y - u * 4 + s * 0.05, s * 0.45, C.k, "center", false); }
    const cy = top + this.lh * (this.carL + 0.5); veh("car", 0.2 * D.W, cy + this.u * 5, this.u, C.red);
  }
}

// 11. Big Little Race ------------------------------------------------------
const SETS = [["moto", "car", "bus"], ["moto", "van", "lorry"], ["car", "lorry", "bus"]];
const SCALE: Record<string, number> = { moto: 0.55, car: 0.8, van: 0.95, lorry: 1.1, bus: 1.25 };
export class Race extends Game {
  id = "race"; rounds = 3; vs: Item[] = []; slots: Item[] = []; filled = 0; racing = 0; base = 4;
  ln: { c: number; h: number; t: number; s: number }[] = []; kerb = 0; lanesTop = 0; art = false;
  start() { this.vs = shuffle(SETS[this.round].map((k, i) => mkItem({ k, rank: i, col: VCOL[(i + this.round) % 6], slot: -1 }))); this.filled = 0; this.racing = 0; this.prompt(); }
  prompt() { say(this.racing ? "35" : "33"); }
  // Sylphy's lane backgrounds, bottom-aligned so all three lane bands always stay on screen
  laneBg() { const land = D.W > D.H, k = land ? "bg-race-lanes" : "bg-race-lanes-portrait", im = pic(k); if (!im) return null; const sc = Math.max(D.W / im.naturalWidth, D.H / im.naturalHeight), h = im.naturalHeight * sc, w = im.naturalWidth * sc, top = D.H - h; return { im, x: (D.W - w) / 2, top, w, h, y: (f: number) => top + f * h }; }
  laneU(v: Item, i: number) { return this.base * SCALE[v.k] * this.ln[i].s; }
  laneHy(v: Item, i: number) { const l = this.ln[i]; return l.c + l.h * 0.3 - (VW[v.k][1] * this.laneU(v, i)) / 2; }
  place() {
    const land = D.W > D.H, top = this.back.y + this.back.h + D.U * 4, lb = this.laneBg();
    this.base = Math.max(2, Math.floor(Math.min(D.W * (land ? 0.3 : 0.6), D.H * 0.3) / 28)); this.art = !!lb;
    if (lb) {
      const F = land ? [0.657, 0.757, 0.871, 1.0] : [0.49, 0.639, 0.809, 1.0], C0 = land ? [0.707, 0.814, 0.936] : [0.565, 0.724, 0.904];
      this.ln = [0, 1, 2].map((i) => ({ c: lb.y(C0[i]), h: lb.y(F[i + 1]) - lb.y(F[i]), t: lb.y(F[i]), s: [0.78, 0.89, 1][i] }));
      this.kerb = lb.y(F[0]) - D.U * 0.5; this.lanesTop = lb.y(F[0]);
      this.slots = [0, 1, 2].map((i) => mkItem({ x: land ? D.W * 0.2 : D.W * 0.5, y: this.ln[i].c, w: land ? D.W * 0.34 : D.W * 0.8, h: this.ln[i].h }));
      const avail = land ? D.W * 0.4 : D.W * 0.94, nn = Math.max(1, this.vs.length), wsum = (b: number) => this.vs.reduce((a, v) => a + VW[v.k][0] * b * SCALE[v.k], 0) + (nn - 1) * D.U * 2;
      while (this.base > 2 && wsum(this.base) > avail) this.base--;
      const gap = nn > 1 ? Math.min((avail - wsum(this.base) + (nn - 1) * D.U * 2) / (nn - 1), D.W * 0.08) : 0; let cxr = land ? D.W * 0.42 : D.W * 0.03 + (avail - wsum(this.base) - (nn - 1) * (gap - D.U * 2)) / 2; const wx0: number[] = [];
      this.vs.forEach((v) => { const w = VW[v.k][0] * this.base * SCALE[v.k]; wx0.push(cxr + w / 2); cxr += w + gap; });
      this.vs.forEach((v, i) => { v.u = this.base * SCALE[v.k]; v.w = Math.max(MIN, VW[v.k][0] * v.u); v.h = Math.max(MIN, VW[v.k][1] * v.u); if (v.slot < 0) { v.hx = wx0[i]; v.hy = this.kerb - (VW[v.k][1] * v.u) / 2; } else { v.u = this.laneU(v, v.slot); v.hx = this.slots[v.slot].x; v.hy = this.laneHy(v, v.slot); } v.x = v.hx; v.y = v.hy; });
      return;
    }
    this.slots = [0, 1, 2].map((i) => mkItem({ x: land ? D.W * 0.2 : D.W * 0.5, y: top + (D.H * (land ? 0.55 : 0.48) - top) * ((i + 0.5) / 3) + D.U * 4, w: land ? D.W * 0.34 : D.W * 0.8, h: (D.H * (land ? 0.55 : 0.48) - top) / 3 }));
    this.vs.forEach((v, i) => { v.u = Math.max(2, Math.round(this.base * SCALE[v.k])); v.w = Math.max(MIN, VW[v.k][0] * v.u); v.h = Math.max(MIN, VW[v.k][1] * v.u); if (v.slot < 0) { v.hx = land ? D.W * (0.5 + i * 0.17) : D.W * (0.2 + i * 0.3); v.hy = land ? D.H * 0.78 : D.H * 0.8; } else { v.hx = this.slots[v.slot].x; v.hy = this.slots[v.slot].y; } v.x = v.hx; v.y = v.hy; });
    if (!land) this.slots.forEach((s, i) => (s.y = top + (D.H * 0.62 - top) * ((i + 0.5) / 3)));
    this.vs.forEach((v) => { if (v.slot >= 0) { v.hx = v.x = this.slots[v.slot].x; v.hy = v.y = this.slots[v.slot].y; } });
  }
  press(p: Pt) { if (this.racing) return; for (const v of this.vs) if (v.slot < 0 && hit(p, rectOf(v), D.U * 2)) { this.grab(v, p); return; } }
  release() {
    const v = this.drag; if (!v) return;
    if (v.rank === this.filled) {
      const onLane = this.art ? v.y + (VW[v.k][1] * v.u) / 2 > this.lanesTop + this.ln[0].h * 0.5 : v.y < D.H * 0.66;
      if (onLane || this.slots.some((s) => hit({ x: v.x, y: v.y }, rectOf(s)))) { v.slot = this.filled; const s = this.slots[this.filled++]; v.hx = s.x; if (this.art) { v.u = this.laneU(v, v.slot); v.hy = this.laneHy(v, v.slot); } else v.hy = s.y; sfx.pop(); say(["x_praise1", "x_praise3", "34"][this.filled - 1]); if (this.filled === 3) setTimeout(() => { this.racing = 0.01; say("35"); sfx.vroom(); }, 2000); }
    }
    else this.oops(v, "x_race_hint");
  }
  tick(dt: number) { this.vs.forEach((v) => { if (this.drag !== v) ease(v, dt, 5); else v.wig = 0; }); if (this.racing) { this.racing += dt; this.vs.forEach((v) => (v.hx = v.x = this.slots[v.slot].x + Math.pow(this.racing, 2) * D.W * 0.08 * (1.2 - v.rank * 0.15))); if (this.racing > 3.2) this.win(D.W / 2, D.H / 2); } }
  paint() {
    const lb = this.laneBg(), u = D.U;
    if (lb && this.art) {
      backdrop("plain", 0.5); g.drawImage(lb.im, lb.x, lb.top, lb.w, lb.h);
      const t = this.lanesTop, len = D.H - t, fx = D.W * 0.85, th = Math.min(len * 0.25, D.W * 0.06), fl = pic("finish-line");
      if (fl) { g.save(); g.beginPath(); g.rect(fx, t, th, len); g.clip(); g.translate(fx + th / 2, t + len / 2); g.rotate(Math.PI / 2); g.drawImage(fl, -len / 2 - 1, -th / 2, len + 2, th); g.restore(); }
      prop("race-flag", fx + th + u * 5, this.kerb + u * 2, Math.min(D.H * 0.22, len * 0.9));
      for (let i = 0; i < 3; i++) { const vs = this.vs.find((v) => v.slot === i); if (!vs && !this.racing) { const want = SETS[this.round][i], l = this.ln[i]; veh(want, this.slots[i].x, l.c + l.h * 0.3, this.base * SCALE[want] * l.s, C.k, { ghost: true }); } }
      for (const v of [...this.vs].sort((a, b) => a.y + (VW[a.k][1] * a.u) / 2 - (b.y + (VW[b.k][1] * b.u) / 2))) veh(v.k, v.x + wx(v), v.y + (VW[v.k][1] * v.u) / 2, v.u, v.col);
      return;
    }
    { const gy = backdrop("plain", 0.6); if (!cover("bg-race")) SC.raceCrowd(this.slots.length ? Math.min(gy, this.slots[0].y - this.slots[0].h / 2) : gy, D.U); }
    for (let i = 0; i < 3; i++) { const s = this.slots[i]; if (!tarmac(0, s.y - s.h / 2 + u, D.W, s.h - u * 2)) R(0, s.y - s.h / 2 + u, D.W, s.h - u * 2, C.road); R(s.x - s.w / 2, s.y + s.h / 2 - u * 3, u, u * 2, C.white); const vs = this.vs.find((v) => v.slot === i); if (!vs && !this.racing) { const want = SETS[this.round][i]; veh(want, s.x, s.y + s.h * 0.4, Math.max(2, Math.round(this.base * SCALE[want])), C.k, { ghost: true }); } }
    prop("race-flag", D.W * 0.85 + u * 4, this.slots[0].y - this.slots[0].h / 2 + u, this.slots[0].h * 0.9);
    for (let y = 0; y < 6; y++) R(D.W * 0.85, this.slots[0].y - this.slots[0].h / 2 + y * this.slots[0].h * 0.5, u * 3, this.slots[0].h * 0.25, y % 2 ? C.white : C.k);
    for (const v of this.vs) veh(v.k, v.x + wx(v), v.y + (VW[v.k][1] * v.u) / 2, v.u, v.col);
  }
}

// 12. Helper Trucks --------------------------------------------------------
const HELP = { fire: ["36", "fire"], amb: ["37", "amb"], tow: ["38", "tow"] } as any;
export class Helper extends Game {
  id = "help"; rounds = 3; seq: string[] = []; need = "fire"; opts: Item[] = []; sent: Item | null = null; st = 0;
  enter() { this.seq = shuffle(["fire", "amb", "tow"]); super.enter(); }
  start() { this.need = this.seq[this.round]; this.opts = shuffle(["fire", "amb", "tow"]).map((k) => mkItem({ k })); this.sent = null; this.st = 0; this.prompt(); }
  prompt() { say(HELP[this.need][0]); }
  place() {
    const land = D.W > D.H, hud = this.back.y + this.back.h + D.U * 2;
    // landscape: the three buttons stack down the right edge so the scene (house, kid, road) keeps the whole ground line clear
    const s = land ? Math.min((D.H - hud - D.U * 3) / 3.3, D.W / 6) : Math.min(D.W / 3.3, D.H * 0.18);
    this.opts.forEach((o, i) => { o.w = o.h = Math.max(MIN, s);
      if (land) { o.x = o.hx = D.W - s * 0.6 - D.U * 4; o.y = o.hy = hud + s * 0.55 + i * s * 1.1; } else { o.x = o.hx = D.W / 2 + (i - 1) * s * 1.18; o.y = o.hy = D.H - s * 0.6 - D.U * 3; }
      o.u = fitU(o.k, s * 0.85, s * 0.6); });
  }
  press(p: Pt) {
    if (this.sent) return;
    for (const o of this.opts) if (hit(p, rectOf(o))) {
      if (o.k === this.need) { this.sent = o; sfx.siren(); say("x_help_yes", { v: word("v_" + o.k) }); setTimeout(() => this.win(D.W / 2, D.H * 0.35, this.round === this.rounds - 1 ? "39" : "x_safe"), 2200); }
      else { this.oops(o); say("v_" + o.k); setTimeout(() => this.prompt(), 1100); }
      return;
    }
  }
  tick(dt: number) { this.opts.forEach((o) => ease(o, dt)); if (this.sent) { this.st = Math.min(1, this.st + dt * 0.6); } }
  paint() {
    backdrop("plain", 0.55); const painted = cover("bg-helper"), land = D.W > D.H, u = D.U, gy = painted ? (coverY("bg-helper", 0.725) as number) : D.H * 0.55, gr = painted ? (coverY("bg-helper", land ? 0.85 : 0.82) as number) : D.H * 0.62; // gy = grass line (house, kid), gr = road line (trucks, broken car)
    if (!painted) { SC.shophouses(D.W * 0.02, D.W * 0.42, gy, u * 0.9); SC.tree(D.W * 0.9, gy, u); } const sx = D.W * (land ? 0.5 : 0.62), pu = Math.max(2, Math.floor(Math.min(D.W, D.H) / 70));
    const fixed = this.sent && this.st > 0.8;
    if (this.need === "fire") { // small cartoon flame on a house, put out with water
      const hs = pic("house-small"), fs = pic("fire-small");
      if (hs) prop("house-small", sx, gy, 26 * pu, { gr: true }); else place("home", sx, gy, pu);
      if (hs && fs) { if (!fixed) { const fl = 1 + Math.sin(D.t * 2.2) * 0.04; prop("fire-small", sx + 3 * pu, gy - 19 * pu, 11 * pu * fl); } }
      else if (!fixed) { const fx = sx + 6.5 * pu, fy = gy - 13 * pu; for (let i = 0; i < 4; i++) { const t = (D.t * 0.25 + i / 4) % 1; g.fillStyle = `rgba(150,146,140,${0.55 * (1 - t)})`; g.beginPath(); g.arc(fx + Math.sin(t * 5 + i) * pu * 1.5, fy - t * 12 * pu, pu * (1.6 + t * 2.4), 0, 7); g.fill(); } }
      if (this.sent && this.st > 0.6) for (let i = 0; i < 6; i++) R(sx - 6 * pu + i * 3 * pu, gy - 34 * pu + ((D.t * 50 + i * 13) % (14 * pu)), pu, pu * 2, C.blue);
      if (fixed) star(sx + 5 * pu, gy - 28 * pu, pu * 2, C.yellow);
    }
    if (this.need === "amb" && pic("sore-knee-kid")) { { grass(sx, gy, 14 * pu); shadow(sx, gy, 12 * pu); prop("sore-knee-kid", sx, gy, 22 * pu); } if (fixed) star(sx + 4 * pu, gy - 12 * pu, pu * 2, C.yellow); }
    else if (this.need === "amb") { // child with a sore knee (plaster only); after check-up, a star sticker and a smile
      R(sx - 4 * pu, gy - 10 * pu, 8 * pu, 7 * pu, C.lav); R(sx - 3 * pu, gy - 3 * pu, 2 * pu, 3 * pu, "#e9c39b"); R(sx + 1 * pu, gy - 3 * pu, 2 * pu, 3 * pu, "#e9c39b"); R(sx + 1 * pu, gy - 2 * pu, 2 * pu, pu, C.white);
      R(sx - 3.5 * pu, gy - 18 * pu, 7 * pu, 7 * pu, "#e9c39b"); R(sx - 3.5 * pu, gy - 19 * pu, 7 * pu, 2 * pu, C.k); R(sx - 2 * pu, gy - 15 * pu, pu, pu, C.k); R(sx + 1 * pu, gy - 15 * pu, pu, pu, C.k);
      if (fixed) { R(sx - 2 * pu, gy - 13 * pu, 4 * pu, pu, C.k); star(sx - 1 * pu, gy - 7 * pu, pu * 2, C.yellow); const w = Math.sin(D.t * 3) > 0 ? 2 : 0; R(sx + 4 * pu, gy - (14 + w) * pu, 2 * pu, 5 * pu, "#e9c39b"); } else R(sx - 1 * pu, gy - 13 * pu, 2 * pu, pu, C.k);
    }
    if (this.need === "tow") { // broken-down car: bonnet up, little warning triangle; then towed away
      const off = fixed ? (this.st - 0.8) * D.W : 0;
      if (pic("broken-car")) { shadow(sx + off, gr, 17 * pu); prop("broken-car", sx + off, gr, 15 * pu); } else veh("car", sx + off, gr, pu, C.blue);
      if (!fixed && !pic("broken-car")) { R(sx + 5 * pu, gy - 12 * pu, 4 * pu, pu, C.k); R(sx + 8 * pu, gy - 12 * pu, pu, 4 * pu, C.k); ptri(sx - 20 * pu, gy - 6 * pu, 6 * pu, 6 * pu, C.orange, pu); }
    }
    for (const o of this.opts) {
      if (o === this.sent) { const tx = sx - (VW[o.k][0] * o.u) * 0.9, x = o.hx + (tx - o.hx) * this.st, y = o.hy + (gr - o.hy) * this.st; veh(o.k, x, y, o.u, o.k === "fire" ? C.red : o.k === "tow" ? C.yellow : C.white, { lights: true }); continue; }
      btnBox(o.x - o.w / 2 + wx(o), o.y - o.h / 2, o.w, o.h, C.cream);
      veh(o.k, o.x + wx(o), o.y + o.h * 0.32, o.u, o.k === "fire" ? C.red : o.k === "tow" ? C.yellow : C.white);
    }
  }
}

// 13. Balik Kampung Road Trip -----------------------------------------------
const ROUTES = [["petrol", "atuk"], ["petrol", "durian", "atuk"], ["petrol", "durian", "atuk"]];
const EXTRA = [["durian"], ["school"], ["school", "pasar"]];
export class Kampung extends Game {
  id = "kampung"; rounds = 3; route: string[] = []; tok = 0; places: Item[] = []; step = 0; showing = true; car = { x: 0, y: 0, tx: 0, ty: 0 }; showI = -1; pu = 3; signAt = { x: 0, y: 0 }; signS = 1; start0 = { x: 0, y: 0 }; farB = 0; nearB = 0; cam = 0; camMax = 0; follow = false;
  start() {
    this.route = ROUTES[this.round]; this.step = 0; this.showing = true; this.showI = -1;
    this.places = shuffle([...this.route, ...EXTRA[this.round]]).map((k) => mkItem({ k, done: false }));
    this.show();
  }
  async show() {
    this.showing = true; const r = ++this.tok; this.showI = -1;
    await say("40");
    for (let i = 0; i < this.route.length; i++) {
      if (this.tok !== r) return; this.showI = this.places.findIndex((p) => p.k === this.route[i]); this.places[this.showI].bob = 1;
      const k = this.route[i];
      if (i === 0 && k === "petrol") await say("41", undefined, false); else if (k === "durian") await say("42", undefined, false); else await say("x_kp_then", { p: word("p_" + k) }, false);
    }
    if (this.tok !== r) return; this.showI = -1; this.showing = false; say("x_kp_go");
  }
  prompt() { if (this.showing || this.step === 0) this.show(); else say("x_kp_next"); }
  place() {
    // OLD mechanic back: the stops are dispersed over the painted ground, a winding road between them. Depth: far = higher, ~0.7 size, paler; near = lower, full size.
    // Portrait: zig-zag from the horizon down to the sand. Landscape: a staggered far/near row (long road follows the car on short phones). No overlaps, nothing in the sky.
    const land = D.W > D.H, n = this.places.length, u = D.U, hud = this.back.y + this.back.h + u * 2, yAt = kYAt();
    this.farB = yAt(0.765); this.nearB = D.H - u * 2; const Z = this.nearB - this.farB;
    const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const depth = (i: number) => (land ? [0.95, 0.12, 0.8, 0.05, 0.9][i % 5] : n > 1 ? i / (n - 1) : 1);
    const sc = (t: number) => 0.7 + 0.3 * t;
    type P = { x: number; base: number; s: number; w: number; h: number };
    const mk = (pu: number, i: number, x: number): P => { const t = depth(i), s = sc(t); return { x, base: this.farB + t * Z, s, w: Math.max(MIN, 32 * pu * s), h: Math.max(MIN, 26 * pu * s) }; };
    const rc = (p: P) => ({ x: p.x - p.w / 2, y: p.base - p.h, w: p.w, h: p.h });
    const clash = (a: P, b: P) => { const A = rc(a), B = rc(b), m = u; return A.x < B.x + B.w + m && B.x < A.x + A.w + m && A.y < B.y + B.h + m && B.y < A.y + A.h + m; };
    const lay = (pu: number): P[] => {
      const out: P[] = [];
      for (let i = 0; i < n; i++) {
        if (!land) { out.push(mk(pu, i, D.W * (i % 2 ? 0.67 : 0.36))); continue; }
        let p = mk(pu, i, 0); p.x = i ? out[i - 1].x + p.w * 0.25 : D.W * 0.24 + p.w / 2;
        while (out.some((q) => clash(p, q)) && p.x < D.W * 6) p.x += 2;
        out.push(p);
      }
      return out;
    };
    const ok = (L: P[], lim: number) => L.every((p, i) => p.x - p.w / 2 >= D.W * 0.01 && p.x + p.w / 2 <= lim && p.base - p.h >= hud && L.every((q, j) => j <= i || !clash(p, q)));
    let pu = 2, L = lay(2); this.follow = false; this.camMax = 0;
    for (let c = 12; c >= 2; c--) { const t = lay(c); if (ok(t, D.W * 0.985)) { pu = c; L = t; break; } }
    // short landscape phones whose stops would shrink below portrait size: keep portrait-sized stops on a longer road and let the view follow the car (off for reduced motion)
    if (land && D.H < 600 && !rm && pu < 3) { pu = 3; L = lay(3); const right = Math.max(...L.map((p) => p.x + p.w / 2)); this.camMax = Math.max(0, right + D.W * 0.03 - D.W); this.follow = this.camMax > 0; }
    if (!this.follow) this.cam = 0;
    this.pu = pu;
    this.places.forEach((p, i) => { const q = L[i]; p.w = q.w; p.h = q.h; p.x = p.hx = q.x; p.y = p.hy = q.base - q.h * 0.45; });
    const sg = sc(0);
    this.signAt = land ? { x: D.W * 0.1, y: this.farB + u } : { x: D.W * 0.9, y: this.farB };
    this.signS = sg;
    const cs = land ? { x: D.W * 0.1, y: this.nearB } : { x: D.W * 0.12, y: this.farB };
    this.start0 = cs;
    if (this.step === 0 || !this.car.x) { this.car.x = this.car.tx = cs.x; this.car.y = this.car.ty = cs.y; }
    else { const last = this.places.find((q) => q.k === this.route[this.step - 1]); if (last) { this.car.x = this.car.tx = last.x - last.w * 0.45; this.car.y = this.car.ty = last.y + last.h * 0.45; } }
  }
  press(q: Pt) {
    if (this.showing) return; const p = { ...q, x: q.x + this.cam };
    for (const pl of this.places) if (hit(p, rectOf(pl))) {
      if (pl.k === this.route[this.step]) { pl.done = true; pl.bob = 1; this.car.tx = pl.x - pl.w * 0.45; this.car.ty = pl.y + pl.h * 0.45; sfx.ding(); this.step++;
        if (this.step >= this.route.length) this.win(pl.x, pl.y - pl.h / 2, "43", undefined, 3.4); else say("x_kp_next"); }
      else if (!pl.done) { this.oops(pl); const nx = this.places.find((q) => q.k === this.route[this.step]); if (nx) nx.bob = 1; say(this.step === 0 ? "41" : "x_kp_then", this.step === 0 ? undefined : { p: word("p_" + this.route[this.step]) }); }
      return;
    }
  }
  tick(dt: number) { this.places.forEach((p) => ease(p, dt)); const c = this.car; c.x += (c.tx - c.x) * Math.min(1, dt * 1.5); c.y += (c.ty - c.y) * Math.min(1, dt * 1.5);
    // camera lags gently behind the car: heavy easing + low max speed, no snaps
    if (this.follow) { const t = Math.min(this.camMax, Math.max(0, c.x - D.W * 0.45)); let v = (t - this.cam) * Math.min(1, dt * 0.7); const mx = D.W * 0.18 * dt; v = Math.max(-mx, Math.min(mx, v)); this.cam += v; } }
  paint() {
    const u = D.U, yAt = kYAt(), zb = zoomBg("bg-kampung"); if (!zb) backdrop("kampung", 0.62);
    const gT = yAt(0.735), carS = (y: number) => 0.7 + 0.3 * Math.max(0, Math.min(1, (y - this.farB) / Math.max(1, this.nearB - this.farB)));
    g.save(); g.translate(-this.cam, 0);
    // a few trees stand behind the far line (tree.png / palm.png planted with shadow + grass), only in gaps between stops
    { const ww = D.W + this.camMax, th = u * 1.3 * 21 * 0.7; let k = 0;
      for (let x = D.W * 0.5; x < ww; x += D.W * 0.31, k++) { if (this.places.some((p) => Math.abs(p.x - x) < p.w * 0.9 + th * 0.4) || Math.abs(x - this.signAt.x) < th) continue; if (k % 2) SC.palm(x, gT, u * 1.1 * 0.8); else SC.tree(x, gT, u * 1.3 * 0.8); } }
    // winding dirt road: start -> each stop in order along the ground, narrower and paler toward the horizon
    { const land = D.W > D.H, nodes = [{ x: this.start0.x, y: this.start0.y }, ...this.places.slice().sort((a, b) => (land ? a.x - b.x : (a.y - b.y))).map((p) => ({ x: p.x, y: p.y + p.h * 0.45 }))];
      g.lineCap = "round"; for (let pass = 0; pass < 2; pass++) for (let i = 1; i < nodes.length; i++) { const a = nodes[i - 1], b = nodes[i], s = carS((a.y + b.y) / 2), w = Math.max(MIN * 0.3, this.pu * 5.5 * s);
        g.strokeStyle = pass ? "rgba(228,210,176,.95)" : "rgba(196,168,126,.35)"; g.lineWidth = pass ? w : w * 1.25; g.beginPath(); g.moveTo(a.x, a.y);
        if (land) g.bezierCurveTo((a.x + b.x) / 2, a.y, (a.x + b.x) / 2, b.y, b.x, b.y); else g.bezierCurveTo(a.x, (a.y + b.y) / 2, b.x, (a.y + b.y) / 2, b.x, b.y); g.stroke(); } }
    // everything is painted far -> near so nearer props overlap farther ones
    type Dr = { y: number; f: () => void };
    const list: Dr[] = [];
    for (let i = 0; i < this.places.length; i++) {
      const p = this.places[i], hl = this.showI === i, base = p.y + p.h * 0.45, t = Math.max(0, Math.min(1, (base - this.farB) / Math.max(1, this.nearB - this.farB))), s = 0.7 + 0.3 * t;
      list.push({ y: base, f: () => {
        if (hl) { g.fillStyle = "rgba(255,240,180,.8)"; g.beginPath(); g.arc(p.x, p.y, p.w * 0.6, 0, 7); g.fill(); }
        g.save(); g.globalAlpha = 0.8 + 0.2 * t; place(p.k, p.x + wx(p), base + bobY(p), this.pu * s); g.restore(); // far = slightly paler
        if (p.done) star(p.x + p.w * 0.45, base - p.h * 0.95, u * 3, C.yellow); } });
    }
    list.push({ y: this.car.y, f: () => veh("car", this.car.x, this.car.y, Math.max(1.4, this.pu * carS(this.car.y)), C.red, { flip: this.car.tx < this.car.x - 2 }) });
    // signpost stands on the ground beside the car start, clear of the stops and their highlight
    list.push({ y: this.signAt.y, f: () => SC.kampungSign(this.signAt.x, this.signAt.y, D.U * 0.8, "KAMPUNG →") });
    list.sort((a, b) => a.y - b.y).forEach((d) => d.f());
    g.restore();
  }
}

/** y on screen at fraction f of bg-kampung's height; the Kampung view zooms the painted ground in (bottom-aligned) so the stops get real depth */
function kYAt(): (f: number) => number {
  const im = pic("bg-kampung"), z = D.W > D.H ? 1.45 : 2.0;
  if (!im) return (f) => D.H * (0.55 + (f - 0.7) * 1.5);
  const s = Math.max(D.W / im.naturalWidth, (D.H * z) / im.naturalHeight), h = im.naturalHeight * s, top = D.H - h; return (f) => top + f * h;
}
function zoomBg(k: string) { const im = pic(k); if (!im) return false; const z = D.W > D.H ? 1.45 : 2.0, s = Math.max(D.W / im.naturalWidth, (D.H * z) / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; g.drawImage(im, (D.W - w) / 2, D.H - h, w, h); return true; }

function pcircF(x: number, y: number, r: number, c: string) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function face2(x: number, y: number, u: number) { R(x - u * 0.6, y - u * 0.3, u * 0.4, u * 0.4, C.k); R(x + u * 0.2, y - u * 0.3, u * 0.4, u * 0.4, C.k); }
