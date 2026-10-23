import { g, D, C, R, MIN, hit, Pt, sfx, say, box, bubbles, burst, shuffle, ri, COLS, star, txt, rnd } from "./core";
import * as SC from "./scenes";
import { veh, VW, backdrop, road, garage, place, btnBox, shape, cover, coverY, pic, prop, shadow, propFit, roadBand, tarmac, fitPic, tmul } from "./art";
import { Game, Item, mkItem, ease, bobY, wx, rectOf, iconBtn } from "./game";
import { S, word } from "./audio";
import { vs } from "./vsfx";
export const fitU = (k: string, w: number, h: number) => Math.max(2, Math.floor(Math.min(w / VW[k][0], h / VW[k][1])));
const VCOL = [C.red, C.yellow, C.blue, C.green, C.lav, C.orange];

// 1. Beep Beep! ----------------------------------------------------------
export class Beep extends Game {
  id = "beep"; rounds = 3; items: Item[] = [];
  start() {
    const cols = shuffle(VCOL);
    this.items = ["car", "bus", "moto", "fire"].map((k, i) => mkItem({ k, col: k === "fire" ? C.red : cols[i], done: false, dx: 0, glow: 0 }));
    this.prompt();
  }
  prompt() { say("01"); }
  place() {
    const land = D.W > D.H, top = this.back.y + this.back.h + D.U * 4, h = D.H - top - D.U * 4;
    this.items.forEach((it, i) => {
      const cw = land ? D.W / 4 : D.W / 2, ch = land ? h * 0.7 : h / 2;
      const cx = land ? cw * (i + 0.5) : cw * ((i % 2) + 0.5), cy = land ? top + h * 0.5 : top + ch * (Math.floor(i / 2) + 0.5);
      it.w = Math.max(MIN, cw * 0.9); it.h = Math.max(MIN, ch * 0.8); it.x = it.hx = cx; it.y = it.hy = cy;
      it.u = fitU(it.k, it.w * 0.9, it.h * 0.75);
      // vehicles park on the street's ground (never up on the shophouse roofs): portrait = 2 rows on the road, landscape = one row on the ground line
      const st = coverY("bg-taman", land ? 0.8 : 0.79); if (st !== undefined) {
        if (land) { it.h = Math.max(MIN, (D.H - st) * 0.9); it.u = fitU(it.k, it.w * 0.9, Math.min(h * 0.6, (D.H - st) * 1.8)); const base = Math.min(D.H - D.U * 3, st + it.u * VW[it.k][1] * 0.35); it.y = it.hy = base - (VW[it.k][1] * it.u) / 2; }
        else { const rh2 = (D.H - st - D.U * 3) / 2, r = Math.floor(i / 2), base = st + rh2 * (r + 1) - D.U * 2; it.h = Math.max(MIN, rh2 * 0.95); it.u = fitU(it.k, it.w * 0.9, rh2 * 0.85); it.y = it.hy = base - (VW[it.k][1] * it.u) / 2; }
      }
    });
  }
  press(p: Pt) {
    for (const it of this.items) if (hit(p, rectOf(it))) {
      it.wig = 0.5; it.bob = 1;
      if (it.k === "car") { if (!vs.honk("car")) sfx.honk(); it.glow = 1.2; say("02"); }
      if (it.k === "bus") { if (!vs.honk("bus")) sfx.vroom(); say("03"); }
      if (it.k === "moto") { if (!vs.honk("moto")) sfx.ngeeng(); it.dx = 0.001; say("04"); }
      if (it.k === "fire") { if (!vs.honk("fire")) sfx.siren(); it.glow = 1.5; say("05"); }
      if (!["car", "bus", "moto", "fire"].includes(it.k)) vs.honk(it.k);
      if (!it.done) { it.done = true; bubbles(it.x, it.y - it.h * 0.3, 4, C.yellow); }
      if (this.items.every((i) => i.done)) setTimeout(() => this.wait <= 0 && this.win(D.W / 2, D.H / 2), 1500);
      return;
    }
  }
  tick(dt: number) { for (const it of this.items) { ease(it, dt); it.glow = Math.max(0, it.glow - dt); if (it.dx) { it.dx += dt * D.W * 0.35; if (it.dx > D.W) it.dx = -D.W * 0.3; if (it.dx < 0 && it.dx + dt * D.W * 0.35 >= 0) it.dx = 0; } } }
  paint() {
    { const gy = backdrop("plain", 0.55), u = D.U; if (cover("bg-taman")) {} else { SC.terrace(-u * 3, D.W, gy, u * 0.9); SC.lampPost(D.W * 0.33, gy, u); SC.lampPost(D.W * 0.7, gy, u); } }
    for (const it of this.items) {
      const gy = it.y + (it.u * VW[it.k][1]) / 2 + bobY(it);
      R(it.x - it.w * 0.45, gy - D.U, it.w * 0.9, D.U * 3, "rgba(74,74,72,.12)");
      veh(it.k, it.x + wx(it) + (it.dx > 0 ? it.dx : it.dx < 0 ? it.dx : 0), gy, it.u, it.col, { lights: it.glow > 0 });
      if (it.done) star(it.x + it.w * 0.4, it.y - it.h * 0.4, D.U * 3, C.yellow);
    }
  }
}

// 2. Car Wash ------------------------------------------------------------
export class Wash extends Game {
  id = "wash"; rounds = 3; phase = 0; mud: boolean[] = []; foam = 0; col = C.blue; drive = 0; u = 4; cx = 0; gy = 0; soap = null as any; hose = null as any; lastRub = 0; taps = 0;
  start() { this.phase = 0; this.mud = Array(24).fill(true); this.foam = 0; this.drive = 0; this.taps = 0; this.col = VCOL[this.round % VCOL.length]; this.prompt(); }
  prompt() { say(["06", "07", "08", "09"][this.phase]); }
  place() {
    this.u = fitU("car", D.W * 0.62, D.H * (pic("wash-bay") && D.W > D.H ? 0.27 : 0.4)); this.cx = D.W / 2;
    const s = Math.max(MIN * 1.3, Math.min(D.W, D.H) * 0.2);
    // car stands on the painted ground (sand line of the dusk scene), kept clear of the soap/hose buttons
    this.gy = Math.min(coverY("bg-dusk", D.W > D.H ? 0.76 : 0.8) ?? D.H * 0.64, D.H - s - D.U * 8);
    if (pic("wash-bay")) this.u = Math.min(this.u, (this.gy - (this.back.y + this.back.h + D.U * 2)) / 19.5);
    this.soap = { x: D.W / 2 - s - D.U * 4, y: D.H - s - D.U * 4, w: s, h: s }; this.hose = { x: D.W / 2 + D.U * 4, y: D.H - s - D.U * 4, w: s, h: s };
  }
  carRect() { const w = 18 * this.u, h = 11 * this.u; return { x: this.cx - w / 2, y: this.gy - h, w, h }; }
  rub(p: Pt) {
    if (this.phase !== 0) return; const r = this.carRect();
    if (!hit(p, r, D.U * 4)) return;
    const i = Math.floor(((p.x - r.x) / r.w) * 6), j = Math.floor(((p.y - r.y) / r.h) * 4);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const ii = i + a, jj = j + b; if (ii >= 0 && ii < 6 && jj >= 0 && jj < 4 && Math.abs(a) + Math.abs(b) < 2) this.mud[jj * 6 + ii] = false; }
    if (this.t - this.lastRub > 0.12) { sfx.rub(); this.lastRub = this.t; bubbles(p.x, p.y, 1, "#c9a27e"); }
    if (this.mud.filter((m) => m).length <= 2) { this.mud.fill(false); this.phase = 1; sfx.ding(); setTimeout(() => this.prompt(), 400); }
  }
  press(p: Pt) {
    if (this.phase === 0) { this.bp = { x: p.x, y: p.y }; this.bt = D.t; this.rub(p); return; }
    const r = this.carRect();
    if (this.phase === 1 && hit(p, this.soap)) { sfx.pop(); this.foam = Math.min(1, this.foam + 0.34); for (let i = 0; i < 3; i++) bubbles(rnd(r.x, r.x + r.w), rnd(r.y, r.y + r.h), 1); if (this.foam >= 1) { this.phase = 2; setTimeout(() => this.prompt(), 500); } }
    else if (this.phase === 2 && hit(p, this.hose)) { sfx.splash(); this.foam = Math.max(0, this.foam - 0.34); for (let i = 0; i < 3; i++) bubbles(rnd(r.x, r.x + r.w), r.y, 1, C.blue); if (this.foam <= 0.01) { this.phase = 3; this.prompt(); burst(this.cx, r.y, 10); setTimeout(() => { this.drive = 0.01; vs.start("car"); vs.engine("car", 6); }, 1600); } }
    else if (this.phase === 1 || this.phase === 2) { const t = this.phase === 1 ? this.soap : this.hose; this.taps++; if (this.taps % 3 === 0) this.prompt(); }
  }
  bp: { x: number; y: number } | null = null; bt = -9;
  drag2(p: Pt) { this.bp = { x: p.x, y: p.y }; this.bt = D.t; this.rub(p); }
  tick(dt: number) { if (this.drive > 0) { this.drive += dt * D.W * 0.3; if (this.drive > D.W * 0.8 && this.wait <= 0) this.win(D.W / 2, D.H * 0.4, "x_praise4"); } }
  paint() {
    { const gy = backdrop("plain", 0.66); if (!cover("bg-dusk")) { SC.rainTree(D.W * 0.12, gy, D.U * 1.1); SC.rainTree(D.W * 0.9, gy, D.U * 0.9); } } const u = this.u, r = this.carRect();
    // wash bay
    { const wb = pic("wash-bay"); if (wb) { const hud = this.back.y + this.back.h + D.U * 2, aw = Math.min(r.w * 1.45, (this.gy - hud) / (wb.naturalHeight / wb.naturalWidth)), ah = aw * wb.naturalHeight / wb.naturalWidth; g.drawImage(wb, this.cx - aw / 2, this.gy + u * 1.2 - ah, aw, ah); } }
    if (!pic("bg-dusk") && !pic("wash-bay")) { R(r.x - 8 * u, this.gy - 18 * u, 2 * u, 18 * u, C.grey); R(r.x + r.w + 6 * u, this.gy - 18 * u, 2 * u, 18 * u, C.grey); R(r.x - 8 * u, this.gy - 19 * u, r.w + 16 * u, 2 * u, C.blue); }
    g.save(); g.translate(this.drive, 0);
    veh("car", this.cx, this.gy, u, this.col);
    this.mud.forEach((m, i) => { if (m) { const ii = i % 6, jj = Math.floor(i / 6); const mx = r.x + ((ii + 0.5) * r.w) / 6, my = r.y + ((jj + 0.5) * r.h) / 4, k = 0.8 + ((i * 37) % 10) / 25; if (pic("mud-splat")) { const mw = (r.w / 7.5) * k; g.drawImage(pic("mud-splat")!, mx - mw / 2, my - mw * 0.4, mw, mw * 0.8); return; } g.fillStyle = (ii + jj) % 2 ? "rgba(168,133,102,.92)" : "rgba(154,122,92,.92)"; g.beginPath(); g.ellipse(mx, my, (r.w / 11) * k, (r.h / 7.5) * k, (i % 5) * 0.6, 0, 7); g.fill(); g.beginPath(); g.arc(mx + (r.w / 12) * k, my - (r.h / 10), r.w / 34, 0, 7); g.fill(); } });
    if (this.foam > 0 && pic("bubbles")) { for (let i = 0; i < 10 * this.foam; i++) { const x = r.x + ((i * 37) % 100) / 100 * r.w, y = r.y + ((i * 61) % 100) / 100 * r.h * 0.8, bs = r.w * (0.16 + (i % 3) * 0.04); g.drawImage(pic("bubbles")!, x - bs / 2, y - bs / 2, bs, bs); } } else if (this.foam > 0) for (let i = 0; i < 30 * this.foam; i++) { const x = r.x + ((i * 37) % 100) / 100 * r.w, y = r.y + ((i * 61) % 100) / 100 * r.h * 0.8; R(x, y, u * 3, u * 3, "rgba(255,255,255,.95)"); }
    if (this.phase === 3) for (let i = 0; i < 4; i++) star(r.x + r.w * (0.15 + i * 0.25), r.y + r.h * (0.2 + (i % 2) * 0.3), u * (2 + Math.sin(D.t * 3 + i)), C.white);
    g.restore();
    if (this.phase === 0) { const s = D.U * 6; R(this.cx - s * 4, this.gy + 3 * D.U, s * 2, s, C.yellow); R(this.cx - s * 4, this.gy + 3 * D.U, s * 2, D.U, C.k); }
    const pulse = (b: any) => (Math.sin(D.t * 3) > 0 ? 0 : D.U);
    const icB = (k: string, b: any) => { if (!pic(k)) return false; const o = pulse(b); shadow(b.x + b.w / 2, b.y + b.h - D.U * 0.5, b.w * 0.8); fitPic(k, b.x, b.y - o, b.w, b.h); return true; };
    if (this.phase === 1 && !icB("icon-soap", this.soap)) iconBtn(this.soap, C.pink, () => { const b = this.soap; box(b.x + b.w * 0.3, b.y + b.h * 0.3 - pulse(b), b.w * 0.4, b.h * 0.55, C.white, D.U); R(b.x + b.w * 0.42, b.y + b.h * 0.15 - pulse(b), b.w * 0.16, b.h * 0.15, C.k); for (let i = 0; i < 3; i++) R(b.x + b.w * (0.2 + i * 0.25), b.y + b.h * 0.12, D.U * 2, D.U * 2, C.white); });
    if (this.phase === 2 && !icB("icon-hose", this.hose)) iconBtn(this.hose, C.blue, () => { const b = this.hose; R(b.x + b.w * 0.2, b.y + b.h * 0.45 - pulse(b), b.w * 0.45, b.h * 0.18, C.green); R(b.x + b.w * 0.6, b.y + b.h * 0.38 - pulse(b), b.w * 0.15, b.h * 0.32, C.k); for (let i = 0; i < 3; i++) R(b.x + b.w * 0.8, b.y + b.h * (0.3 + i * 0.15), D.U * 2, D.U * 2, C.white); });
    { const br = pic("wash-brush"); if (br && this.phase === 0 && this.bp && D.t - this.bt < 0.8) { const h = Math.max(MIN * 1.2, D.H * 0.22), w = h * br.naturalWidth / br.naturalHeight; g.save(); g.globalAlpha = Math.min(1, (0.8 - (D.t - this.bt)) * 4); g.translate(this.bp.x, this.bp.y); g.rotate(-0.35); g.drawImage(br, -w / 2, -h * 0.2, w, h); g.restore(); } }
  }
}

// 3. Peekaboo Garage -----------------------------------------------------
export class Peek extends Game {
  id = "peek"; rounds = 3; items: Item[] = [];
  start() {
    const pool = this.round === 0 ? ["lorry", "taxi", "car"] : shuffle(["lorry", "taxi", "bus", "moto", "van", "car"]).filter((k, i, a) => !(k === "van" && a.indexOf("lorry") < 3 && a.indexOf("lorry") >= 0 && i < 3)).slice(0, 3);
    const cols = shuffle([C.red, C.yellow, C.blue, C.green, C.lav]);
    this.items = shuffle(pool).map((k, i) => mkItem({ k, gcol: cols[i], vcol: k === "taxi" ? C.yellow : cols[(i + 2) % 5], open: 0, opening: false }));
    this.prompt();
  }
  prompt() { say("10"); }
  place() {
    const land = D.W > D.H, n = 3, top = this.back.y + this.back.h + D.U * 6;
    this.items.forEach((it, i) => {
      if (land) { it.w = Math.min(D.W / 3.6, (D.H - top) * 0.75); it.h = it.w * 0.85; it.x = it.hx = D.W * (i + 0.5) / 3; it.y = it.hy = top + (D.H - top) * 0.5; }
      else { it.h = Math.max(MIN, (D.H - top) / 3.6); it.w = Math.min(D.W * 0.7, it.h * 1.4); it.x = it.hx = D.W / 2; it.y = it.hy = top + (D.H - top) * (i + 0.5) / 3; }
      it.u = fitU(it.k, it.w * 0.75, it.h * 0.65);
    });
  }
  press(p: Pt) {
    for (const it of this.items) if (hit(p, rectOf(it))) {
      if (!it.opening) { it.opening = true; sfx.pop(); it.bob = 1; const l = it.k === "lorry" ? "11" : it.k === "taxi" ? "12" : "x_peek"; say(l, l === "x_peek" ? { v: word("v_" + it.k) } : undefined); bubbles(it.x, it.y, 4, C.yellow);
        if (this.items.every((i) => i.opening)) setTimeout(() => this.win(D.W / 2, D.H / 2), 2200); }
      else { it.wig = 0.4; if (!vs.honk(it.k)) sfx.honk(); }
      return;
    }
  }
  tick(dt: number) { for (const it of this.items) { ease(it, dt); if (it.opening) it.open = Math.min(1, it.open + dt * 1.5); } }
  paint() {
    { const gy = backdrop("kampung", 0.5); if (!pic("bg-kampung")) SC.fence(gy, D.U); }
    for (const it of this.items) {
      const x = it.x - it.w / 2, y = it.y - it.h / 2 + it.h * 0.2;
      garage(x, y, it.w, it.h * 0.8, it.gcol, it.open, D.U, 1);
      if (it.open > 0.15) veh(it.k, it.x + wx(it), y + it.h * 0.8 - it.h * 0.02 + bobY(it) * (it.open), it.u, it.vcol);
      garage(x, y, it.w, it.h * 0.8, it.gcol, it.open, D.U, 2);
      if (it.open < 0.2) { const q = D.U * 3; txt("?", it.x, y + it.h * 0.45, Math.max(24, it.h * 0.3), "#8C7B6E"); }
    }
  }
}

// 4. Colour Parking --------------------------------------------------------
const CNAMES = ["red", "yellow", "blue", "green"];
export class ColourPark extends Game {
  id = "colour"; rounds = 4; order: string[] = []; spots: Item[] = []; car: Item = mkItem(); parked: string[] = [];
  enter() { this.order = shuffle(CNAMES); this.order.splice(this.order.indexOf("red"), 1); this.order.unshift("red"); super.enter(); }
  start() {
    const want = this.order[this.round];
    const others = shuffle(CNAMES.filter((c) => c !== want)).slice(0, 2);
    this.spots = shuffle([want, ...others]).map((c) => mkItem({ c, full: false }));
    this.car = mkItem({ c: want }); this.prompt();
  }
  prompt() { const c = this.car.c; if (c === "red") say("13"); else say("x_col_ask", { c: word("c_" + c) }); }
  place() {
    const land = D.W > D.H, top = this.back.y + this.back.h + D.U * 4;
    const sw = land ? Math.min(D.W / 4.2, D.H * 0.4) : Math.min(D.W / 3.4, D.H * 0.22), sh = sw * 1.1;
    this.spots.forEach((s, i) => { s.w = sw; s.h = sh; s.x = s.hx = D.W / 2 + (i - 1) * sw * 1.15; s.y = s.hy = top + sh / 2 + D.U * 4; });
    const cy = land ? D.H - sh * 0.55 - D.U * 4 : D.H * 0.72;
    this.car.w = Math.max(MIN * 1.4, sw * 0.95); this.car.h = Math.max(MIN, sw * 0.6); this.car.u = fitU("car", this.car.w, this.car.h);
    this.car.x = this.car.hx = D.W / 2; this.car.y = this.car.hy = cy;
  }
  press(p: Pt) { if (hit(p, rectOf(this.car), D.U * 3)) this.grab(this.car, p); }
  release(p: Pt) {
    if (!this.drag) return; const car = this.car;
    const s = this.spots.find((s) => hit({ x: car.x, y: car.y }, rectOf(s), D.U * 2));
    if (!s) return;
    if (s.c === car.c) { car.hx = s.x; car.hy = s.y; s.full = true; this.win(s.x, s.y, "x_col_yes", { c: word("c_" + car.c) }); if (car.c === "red") { this.wait = 0; this.win(s.x, s.y, "14"); } }
    else { this.oops(car, car.c === "yellow" ? "15" : "x_col_hint", car.c === "yellow" ? undefined : { c: word("c_" + car.c) }); }
  }
  tick(dt: number) { if (this.drag !== this.car) ease(this.car, dt, 5); this.car.wig = Math.max(0, this.car.wig - dt); }
  paint() {
    const u = D.U; if (!cover("bg-carpark")) { R(0, 0, D.W, D.H, C.road); SC.carparkTop(); for (let x = 0; x < D.W; x += u * 12) R(x, D.H * 0.55, u * 6, u, C.white); }
    for (const s of this.spots) {
      const x = s.x - s.w / 2, y = s.y - s.h / 2, bay = pic("parking-bay");
      if (bay) { const bw = Math.min(s.w, s.h * 0.667), bx = s.x - bw / 2, tk = bayTint(bay, s.c); g.drawImage(tk, bx, y, bw, s.h); veh("car", s.x, y + s.h * 0.7, fitU("car", bw * 0.8, s.h * 0.4), COLS[s.c], { ghost: true }); continue; }
      R(x, y, s.w, s.h, COLS[s.c]); R(x + u * 2, y + u * 2, s.w - 4 * u, s.h - 4 * u, "rgba(255,255,255,.35)");
      R(x - u, y - u, u * 2, s.h + 2 * u, C.white); R(x + s.w - u, y - u, u * 2, s.h + 2 * u, C.white);
      veh("car", s.x, s.y + s.h * 0.25, fitU("car", s.w * 0.7, s.h * 0.5), COLS[s.c], { ghost: true });
    }
    const c = this.car; veh("car", c.x + wx(c), c.y + (11 * c.u) / 2, c.u, COLS[c.c]);
  }
}

// 5. Traffic Light ---------------------------------------------------------
export class Light extends Game {
  id = "light"; rounds = 3; state = 0; st = 0; carX = 0; hold = false; pedal: any; warned = false; stopped = false; u = 4;
  start() { this.carX = 0.08; this.state = 0; this.st = 0; this.warned = false; this.prompt(); }
  prompt() { say(this.state === 0 ? "16" : this.state === 1 ? "18" : "17"); }
  place() { const s = Math.max(MIN * 1.5, Math.min(D.W, D.H) * 0.24); this.pedal = { x: D.W - s - D.U * 5, y: D.H - s - D.U * 5, w: s, h: s }; this.u = fitU("car", D.W * 0.2, D.H * 0.14); }
  press(p: Pt) { if (hit(p, this.pedal, D.U * 3)) { this.hold = true; sfx.tap(); if (this.state !== 2) { vs.start("car"); vs.engine("car", 30); } if (this.state === 2 && !this.warned) { this.warned = true; say("17"); } } }
  release() { this.hold = false; vs.stopEngine(0.5); }
  tick(dt: number) {
    if (this.wait > 0) return;
    this.st += dt; const dur = [5, 2, 3.5][this.state];
    if (this.st > dur) { this.st = 0; this.state = (this.state + 1) % 3; this.warned = false; sfx.beep(); if (this.state === 2) vs.stopEngine(0.4); this.prompt(); }
    const sp = this.state === 0 ? 0.07 : this.state === 1 ? 0.03 : 0;
    if (this.hold) this.carX += sp * dt;
    if (this.carX >= 0.86) this.win(D.W * 0.86, D.H * 0.5, "19");
  }
  paint() {
    const u = D.U, land = D.W > D.H; backdrop("kampung", 0.55);
    // everything stands on the painted verge line; the road is Sylphy's road-strip, the crossing her zebra-side
    const hz = coverY("bg-kampung", 0.72) ?? D.H * 0.55, hud = this.back.y + this.back.h + u * 3, rh = Math.max(u * 14, D.H * (land ? 0.2 : 0.13)), rt = hz + u, vg = rt + u * 0.5;
    const ph = Math.max(u * 30, Math.min(vg - hud, D.H * (land ? 0.5 : 0.34))), tl = pic("traffic-light-pole");
    if (pic("road-strip")) roadBand(rt, rh); else road(rt, rh, this.carX * D.W * 2);
    const zw = rh * 1.5; if (pic("zebra-side")) { const im = pic("zebra-side")!; g.save(); g.beginPath(); g.rect(D.W * 0.66 - zw / 2, rt, zw, rh); g.clip(); g.drawImage(im, im.naturalWidth * 0.3, 0, im.naturalWidth * 0.4, im.naturalHeight, D.W * 0.66 - zw / 2, rt, zw, rh); g.restore(); } else SC.zebra(D.W * 0.66, rt, rh, u);
    // school beside the road, standing on the verge
    { const sw = Math.min(D.W * (land ? 0.3 : 0.36), ph * 1.5); if (!propFit("school-kampung", D.W * (land ? 0.72 : 0.79), vg, sw, sw, { sh: true })) place("school", D.W * 0.78, vg, u * 0.8); }
    // light: one painted pole (housing + pole + base), base on the verge; lit lamp + glow drawn on top
    const lx = D.W * 0.5, on = [2, 1, 0][this.state];
    if (tl) { const tw = ph * tl.naturalWidth / tl.naturalHeight; prop("traffic-light-pole", lx, vg, ph); const k = ["lamp-red", "lamp-amber", "lamp-green"][on], cy = vg - ph + ph * LAMPY[on], rr = tw * 0.27, lp = pic(k), gc = ["224,122,110", "246,200,80", "120,200,140"][on];
      const gr = g.createRadialGradient(lx, cy, rr * 0.5, lx, cy, rr * 2.6); gr.addColorStop(0, `rgba(${gc},.55)`); gr.addColorStop(1, `rgba(${gc},0)`); g.fillStyle = gr; g.beginPath(); g.arc(lx, cy, rr * 2.6, 0, 7); g.fill();
      if (lp) g.drawImage(lp, lx - rr, cy - rr, rr * 2, rr * 2); }
    else { const lw = Math.max(40, u * 12), lh = lw * 2.6, ly = vg - lh - u * 10; R(lx - u, ly + lh, u * 2, vg - ly - lh, C.k); box(lx - lw / 2, ly, lw, lh, C.k, u, C.k);
      for (let i = 0; i < 3; i++) pcircS(lx, ly + lh * (0.18 + i * 0.32), lw * 0.3, i === 0 ? (on === 0 ? "#E07A6E" : "#7c6460") : i === 1 ? (on === 1 ? C.yellow : "#8a815f") : on === 2 ? "#8CD3A0" : "#5d7a6e"); }
    // finish line: flat chequered strip painted across the road
    { const fim = pic("finish-line"), fx = D.W * 0.88; if (fim) { const th = rh / 4; g.save(); g.beginPath(); g.rect(fx, rt, th, rh); g.clip(); g.translate(fx + th / 2, rt + rh / 2); g.rotate(Math.PI / 2); g.drawImage(fim, -rh / 2 - 1, -th / 2, rh + 2, th); g.restore(); } }
    if (!pic("finish-line")) { const fx = D.W * 0.88, ck = rh / 6; for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) R(fx + j * ck, rt + i * ck, ck, ck, (i + j) % 2 ? C.k : C.white); }
    veh("car", this.carX * D.W, rt + rh * 0.7, this.u, C.blue);
    const pr = this.pedal, pressed = this.hold;
    if (pic("icon-pedal")) { const o = pressed ? u : 0; g.save(); g.globalAlpha = this.state === 2 ? 0.55 : 1; shadow(pr.x + pr.w / 2, pr.y + pr.h - u * 0.5 + o, pr.w * 0.8); fitPic("icon-pedal", pr.x, pr.y + o, pr.w, pr.h); g.restore(); } else
    iconBtn(pr, this.state === 2 ? "#E6D9D2" : C.green, () => { const cx = pr.x + pr.w / 2 + (pressed ? u : 0), cy = pr.y + pr.h / 2 + (pressed ? u : 0); if (fitPic("icon-play", cx - pr.w * 0.3, cy - pr.h * 0.3, pr.w * 0.6, pr.h * 0.6)) return; for (let i = 0; i < 3; i++) R(cx - pr.w * 0.2 + i * pr.w * 0.14, cy - pr.h * 0.2 + i * u * 0, pr.w * 0.1, pr.h * 0.4, C.white); R(cx - pr.w * 0.2, cy + pr.h * 0.2, pr.w * 0.4, u * 2, C.white); }, pressed);
  }
}
function pcircS(x: number, y: number, r: number, c: string) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

const LAMPY = [0.094, 0.209, 0.32]; // lamp centres as a fraction of the painted traffic-light height (measured)
// 6. Build My Car ---------------------------------------------------------
export class Build extends Game {
  id = "build"; rounds = 3; stage = 0; wheels = 0; piece: Item = mkItem(); u = 4; cx = 0; gy = 0; drive = 0; goBtn: any; col = C.red;
  start() { this.stage = 0; this.wheels = 0; this.drive = 0; this.col = [C.red, C.blue, C.yellow][this.round % 3]; this.prompt(); }
  prompt() { say(this.stage === 0 ? "20" : this.stage === 1 ? (this.wheels === 0 ? "21" : "n" + (this.wheels + 1)) : this.stage === 2 ? "x_build_roof" : "22"); }
  place() {
    const land = D.W > D.H; this.u = fitU("build", D.W * (land ? 0.5 : 0.8), D.H * 0.3);
    this.cx = land ? D.W * 0.4 : D.W / 2; this.gy = coverY("bg-workshop", 0.76) ?? (land ? D.H * 0.62 : D.H * 0.5); // car stands on the painted workshop floor
    const s = Math.max(MIN * 1.3, Math.min(D.W, D.H) * 0.22);
    const p = this.piece; p.w = p.h = s; p.hx = land ? D.W - s * 0.9 : D.W / 2; p.hy = land ? D.H * 0.5 : D.H - s * 0.8; p.x = p.hx; p.y = p.hy;
    this.goBtn = { x: p.hx - s / 2, y: p.hy - s / 2, w: s, h: s };
  }
  press(p: Pt) {
    if (this.stage === 3) { if (hit(p, this.goBtn) && !this.drive) { this.drive = 0.01; vs.start("car"); vs.engine("car", 6); } return; }
    if (hit(p, rectOf(this.piece), D.U * 3)) this.grab(this.piece, p);
  }
  release() {
    if (!this.drag) return; const p = this.piece, u = this.u;
    const r = { x: this.cx - 12 * u, y: this.gy - 12 * u, w: 24 * u, h: 12 * u };
    if (hit(p, r, u * 6)) {
      sfx.pop(); burst(p.x, p.y, 3);
      if (this.stage === 0) { this.stage = 1; }
      else if (this.stage === 1) { this.wheels++; say("n" + this.wheels); if (this.wheels === 4) { this.stage = 2; setTimeout(() => this.prompt(), 900); } }
      else if (this.stage === 2) { this.stage = 3; setTimeout(() => this.prompt(), 300); }
      if (this.stage === 1 && this.wheels === 0) this.prompt();
      p.x = p.hx; p.y = p.hy + D.H * 0.2;
    } else this.oops(p);
  }
  tick(dt: number) { if (this.drag !== this.piece) ease(this.piece, dt, 6); else this.piece.wig = 0; if (this.drive > 0) { this.drive += dt * D.W * 0.3; if (this.drive > D.W * 0.7) this.win(D.W / 2, D.H / 2); } }
  paint() {
    const gy0 = SC.workshop(this.gy + D.H * 0.02), u = this.u;
    g.save(); g.translate(this.drive, 0);
    veh("build", this.cx, this.gy, u, this.col, { ghost: true, body: true, roof: true, wheels: 4 });
    veh("build", this.cx, this.gy, u, this.col, { body: this.stage >= 1, wheels: this.wheels, roof: this.stage >= 3 });
    g.restore();
    const p = this.piece, s = p.w;
    if (this.stage < 3) {
      btnBox(p.x - s / 2 + wx(p), p.y - s / 2, s, s, C.cream);
      const pu = Math.max(2, s / 25);
      if (this.stage === 0) veh("build", p.x + wx(p), p.y + s * 0.15, pu, this.col, { body: true });
      if (this.stage === 1 && !wheelIcon(p.x + wx(p), p.y, s * 0.36)) { shape("circle", p.x + wx(p), p.y, s * 0.25, C.k, pu); shape("circle", p.x + wx(p), p.y, s * 0.12, C.grey, pu); }
      if (this.stage === 2) veh("build", p.x + wx(p), p.y + s * 0.55, pu, this.col, { roof: true });
    } else if (!this.drive) {
      const b = this.goBtn; iconBtn(b, C.green, () => { if (fitPic("icon-play", b.x + b.w * 0.12, b.y + b.h * 0.12, b.w * 0.76, b.h * 0.76)) return; ptri(b.x + b.w * 0.3, b.y + b.h * 0.2, b.w * 0.4, b.h * 0.6, C.white); });
    }
  }
}
import { ptri } from "./core";
import { wheelIcon } from "./art";

const BAYC: Record<string, HTMLCanvasElement> = {};
function bayTint(bay: HTMLImageElement, c: string) {
  if (BAYC[c]) return BAYC[c];
  const tk = document.createElement("canvas"); tk.width = 200; tk.height = 300; const tc = tk.getContext("2d")!;
  tc.drawImage(bay, 0, 0, 200, 300); tc.globalCompositeOperation = "multiply"; tc.fillStyle = COLS[c]; tc.fillRect(10, 10, 180, 280); tc.globalCompositeOperation = "destination-in"; tc.drawImage(bay, 0, 0, 200, 300);
  return (BAYC[c] = tk);
}
