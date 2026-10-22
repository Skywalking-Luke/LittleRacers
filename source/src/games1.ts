import { g, D, C, R, MIN, hit, Pt, sfx, say, box, bubbles, burst, shuffle, ri, COLS, star, txt, rnd } from "./core";
import * as SC from "./scenes";
import { veh, VW, backdrop, road, garage, place, btnBox, shape } from "./art";
import { Game, Item, mkItem, ease, bobY, wx, rectOf, iconBtn } from "./game";
import { S, word } from "./audio";
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
    });
  }
  press(p: Pt) {
    for (const it of this.items) if (hit(p, rectOf(it))) {
      it.wig = 0.5; it.bob = 1;
      if (it.k === "car") { sfx.honk(); it.glow = 1.2; say("02"); }
      if (it.k === "bus") { sfx.vroom(); say("03"); }
      if (it.k === "moto") { sfx.ngeeng(); it.dx = 0.001; say("04"); }
      if (it.k === "fire") { sfx.siren(); it.glow = 1.5; say("05"); }
      if (!it.done) { it.done = true; bubbles(it.x, it.y - it.h * 0.3, 4, C.yellow); }
      if (this.items.every((i) => i.done)) setTimeout(() => this.wait <= 0 && this.win(D.W / 2, D.H / 2), 1500);
      return;
    }
  }
  tick(dt: number) { for (const it of this.items) { ease(it, dt); it.glow = Math.max(0, it.glow - dt); if (it.dx) { it.dx += dt * D.W * 0.35; if (it.dx > D.W) it.dx = -D.W * 0.3; if (it.dx < 0 && it.dx + dt * D.W * 0.35 >= 0) it.dx = 0; } } }
  paint() {
    { const gy = backdrop("plain", 0.55), u = D.U; SC.terrace(-u * 3, D.W, gy, u * 0.9); SC.lampPost(D.W * 0.33, gy, u); SC.lampPost(D.W * 0.7, gy, u); }
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
    this.u = fitU("car", D.W * 0.62, D.H * 0.4); this.cx = D.W / 2; this.gy = D.H * 0.64;
    const s = Math.max(MIN * 1.3, Math.min(D.W, D.H) * 0.2);
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
    if (this.phase === 0) { this.rub(p); return; }
    const r = this.carRect();
    if (this.phase === 1 && hit(p, this.soap)) { sfx.pop(); this.foam = Math.min(1, this.foam + 0.34); for (let i = 0; i < 6; i++) bubbles(rnd(r.x, r.x + r.w), rnd(r.y, r.y + r.h), 1); if (this.foam >= 1) { this.phase = 2; setTimeout(() => this.prompt(), 500); } }
    else if (this.phase === 2 && hit(p, this.hose)) { sfx.splash(); this.foam = Math.max(0, this.foam - 0.34); for (let i = 0; i < 8; i++) bubbles(rnd(r.x, r.x + r.w), r.y, 1, C.blue); if (this.foam <= 0.01) { this.phase = 3; this.prompt(); burst(this.cx, r.y, 10); setTimeout(() => { this.drive = 0.01; sfx.vroom(); }, 1600); } }
    else if (this.phase === 1 || this.phase === 2) { const t = this.phase === 1 ? this.soap : this.hose; this.taps++; if (this.taps % 3 === 0) this.prompt(); }
  }
  drag2(p: Pt) { this.rub(p); }
  tick(dt: number) { if (this.drive > 0) { this.drive += dt * D.W * 0.3; if (this.drive > D.W * 0.8 && this.wait <= 0) this.win(D.W / 2, D.H * 0.4, "x_praise4"); } }
  paint() {
    { const gy = backdrop("plain", 0.66); SC.rainTree(D.W * 0.12, gy, D.U * 1.1); SC.rainTree(D.W * 0.9, gy, D.U * 0.9); } const u = this.u, r = this.carRect();
    // wash bay
    R(r.x - 8 * u, this.gy - 18 * u, 2 * u, 18 * u, C.grey); R(r.x + r.w + 6 * u, this.gy - 18 * u, 2 * u, 18 * u, C.grey); R(r.x - 8 * u, this.gy - 19 * u, r.w + 16 * u, 2 * u, C.blue);
    g.save(); g.translate(this.drive, 0);
    veh("car", this.cx, this.gy, u, this.col);
    this.mud.forEach((m, i) => { if (m) { const ii = i % 6, jj = Math.floor(i / 6); const mx = r.x + ((ii + 0.5) * r.w) / 6, my = r.y + ((jj + 0.5) * r.h) / 4, k = 0.8 + ((i * 37) % 10) / 25; g.fillStyle = (ii + jj) % 2 ? "rgba(168,133,102,.92)" : "rgba(154,122,92,.92)"; g.beginPath(); g.ellipse(mx, my, (r.w / 11) * k, (r.h / 7.5) * k, (i % 5) * 0.6, 0, 7); g.fill(); g.beginPath(); g.arc(mx + (r.w / 12) * k, my - (r.h / 10), r.w / 34, 0, 7); g.fill(); } });
    if (this.foam > 0) for (let i = 0; i < 30 * this.foam; i++) { const x = r.x + ((i * 37) % 100) / 100 * r.w, y = r.y + ((i * 61) % 100) / 100 * r.h * 0.8; R(x, y, u * 3, u * 3, "rgba(255,255,255,.95)"); }
    if (this.phase === 3) for (let i = 0; i < 4; i++) star(r.x + r.w * (0.15 + i * 0.25), r.y + r.h * (0.2 + (i % 2) * 0.3), u * (2 + Math.sin(D.t * 3 + i)), C.white);
    g.restore();
    if (this.phase === 0) { const s = D.U * 6; R(this.cx - s * 4, this.gy + 3 * D.U, s * 2, s, C.yellow); R(this.cx - s * 4, this.gy + 3 * D.U, s * 2, D.U, C.k); }
    const pulse = (b: any) => (Math.sin(D.t * 3) > 0 ? 0 : D.U);
    if (this.phase === 1) iconBtn(this.soap, C.pink, () => { const b = this.soap; box(b.x + b.w * 0.3, b.y + b.h * 0.3 - pulse(b), b.w * 0.4, b.h * 0.55, C.white, D.U); R(b.x + b.w * 0.42, b.y + b.h * 0.15 - pulse(b), b.w * 0.16, b.h * 0.15, C.k); for (let i = 0; i < 3; i++) R(b.x + b.w * (0.2 + i * 0.25), b.y + b.h * 0.12, D.U * 2, D.U * 2, C.white); });
    if (this.phase === 2) iconBtn(this.hose, C.blue, () => { const b = this.hose; R(b.x + b.w * 0.2, b.y + b.h * 0.45 - pulse(b), b.w * 0.45, b.h * 0.18, C.green); R(b.x + b.w * 0.6, b.y + b.h * 0.38 - pulse(b), b.w * 0.15, b.h * 0.32, C.k); for (let i = 0; i < 3; i++) R(b.x + b.w * 0.8, b.y + b.h * (0.3 + i * 0.15), D.U * 2, D.U * 2, C.white); });
  }
}

// 3. Peekaboo Garage -----------------------------------------------------
export class Peek extends Game {
  id = "peek"; rounds = 3; items: Item[] = [];
  start() {
    const pool = this.round === 0 ? ["lorry", "taxi", "car"] : shuffle(["lorry", "taxi", "bus", "moto", "van", "car"]).slice(0, 3);
    const cols = shuffle([C.red, C.yellow, C.blue, C.green, C.lav]);
    this.items = shuffle(pool).map((k, i) => mkItem({ k, gcol: cols[i], vcol: k === "taxi" ? C.red : cols[(i + 2) % 5], open: 0, opening: false }));
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
      else { it.wig = 0.4; sfx.honk(); }
      return;
    }
  }
  tick(dt: number) { for (const it of this.items) { ease(it, dt); if (it.opening) it.open = Math.min(1, it.open + dt * 1.5); } }
  paint() {
    { const gy = backdrop("kampung", 0.5); SC.fence(gy, D.U); }
    for (const it of this.items) {
      const x = it.x - it.w / 2, y = it.y - it.h / 2 + it.h * 0.2;
      garage(x, y, it.w, it.h * 0.8, it.gcol, it.open);
      if (it.open > 0.3) veh(it.k, it.x + wx(it), y + it.h * 0.8 + bobY(it) * (it.open), it.u, it.vcol);
      if (it.open < 0.2) { const q = D.U * 3; txt("?", it.x, y + it.h * 0.45, Math.max(24, it.h * 0.3), C.white); }
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
    R(0, 0, D.W, D.H, C.road); SC.carparkTop(); const u = D.U;
    for (let x = 0; x < D.W; x += u * 12) R(x, D.H * 0.55, u * 6, u, C.white);
    for (const s of this.spots) {
      const x = s.x - s.w / 2, y = s.y - s.h / 2;
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
  press(p: Pt) { if (hit(p, this.pedal, D.U * 3)) { this.hold = true; sfx.tap(); if (this.state === 2 && !this.warned) { this.warned = true; say("17"); } } }
  release() { this.hold = false; }
  tick(dt: number) {
    if (this.wait > 0) return;
    this.st += dt; const dur = [5, 2, 3.5][this.state];
    if (this.st > dur) { this.st = 0; this.state = (this.state + 1) % 3; this.warned = false; sfx.beep(); this.prompt(); }
    const sp = this.state === 0 ? 0.07 : this.state === 1 ? 0.03 : 0;
    if (this.hold) this.carX += sp * dt;
    if (this.carX >= 0.86) this.win(D.W * 0.86, D.H * 0.5, "19");
  }
  paint() {
    const gy = backdrop("kampung", 0.55), u = D.U, rh = D.H * 0.2;
    place("school", D.W * 0.78, gy, u * 0.8);
    road(gy + u * 4, rh, this.carX * D.W * 2); SC.zebra(D.W * 0.66, gy + u * 4, rh, u);
    // light
    const lx = D.W * 0.5, lw = Math.max(40, u * 12), lh = lw * 2.6, ly = gy - lh - u * 10;
    R(lx - u, ly + lh, u * 2, gy + u * 4 - ly - lh, C.k); box(lx - lw / 2, ly, lw, lh, C.k, u, C.k);
    const cols = [[C.red, "#8a6862"], [C.yellow, "#8f8364"], [C.green, "#5d7f7b"]];
    const on = [2, 1, 0][this.state];
    for (let i = 0; i < 3; i++) pcircS(lx, ly + lh * (0.18 + i * 0.32), lw * 0.3, i === 0 ? (on === 0 ? "#E07A6E" : "#7c6460") : i === 1 ? (on === 1 ? C.yellow : "#8a815f") : on === 2 ? "#8CD3A0" : "#5d7a6e");
    R(D.W * 0.88, gy + u * 4, u, rh, C.white); for (let i = 0; i < 4; i++) R(D.W * 0.88 + u, gy + u * 4 + i * rh / 4, u * 3, rh / 8, i % 2 ? C.k : C.white);
    veh("car", this.carX * D.W, gy + u * 4 + rh * 0.65, this.u, C.blue);
    const pr = this.pedal, pressed = this.hold;
    iconBtn(pr, this.state === 2 ? "#E6D9D2" : C.green, () => { const cx = pr.x + pr.w / 2 + (pressed ? u : 0), cy = pr.y + pr.h / 2 + (pressed ? u : 0); for (let i = 0; i < 3; i++) R(cx - pr.w * 0.2 + i * pr.w * 0.14, cy - pr.h * 0.2 + i * u * 0, pr.w * 0.1, pr.h * 0.4, C.white); R(cx - pr.w * 0.2, cy + pr.h * 0.2, pr.w * 0.4, u * 2, C.white); }, pressed);
  }
}
function pcircS(x: number, y: number, r: number, c: string) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

// 6. Build My Car ---------------------------------------------------------
export class Build extends Game {
  id = "build"; rounds = 3; stage = 0; wheels = 0; piece: Item = mkItem(); u = 4; cx = 0; gy = 0; drive = 0; goBtn: any; col = C.red;
  start() { this.stage = 0; this.wheels = 0; this.drive = 0; this.col = [C.red, C.blue, C.yellow][this.round % 3]; this.prompt(); }
  prompt() { say(this.stage === 0 ? "20" : this.stage === 1 ? (this.wheels === 0 ? "21" : "n" + (this.wheels + 1)) : this.stage === 2 ? "x_build_roof" : "22"); }
  place() {
    const land = D.W > D.H; this.u = fitU("build", D.W * (land ? 0.5 : 0.8), D.H * 0.3);
    this.cx = land ? D.W * 0.4 : D.W / 2; this.gy = land ? D.H * 0.62 : D.H * 0.5;
    const s = Math.max(MIN * 1.3, Math.min(D.W, D.H) * 0.22);
    const p = this.piece; p.w = p.h = s; p.hx = land ? D.W - s * 0.9 : D.W / 2; p.hy = land ? D.H * 0.5 : D.H - s * 0.8; p.x = p.hx; p.y = p.hy;
    this.goBtn = { x: p.hx - s / 2, y: p.hy - s / 2, w: s, h: s };
  }
  press(p: Pt) {
    if (this.stage === 3) { if (hit(p, this.goBtn) && !this.drive) { this.drive = 0.01; sfx.vroom(); } return; }
    if (hit(p, rectOf(this.piece), D.U * 3)) this.grab(this.piece, p);
  }
  release() {
    if (!this.drag) return; const p = this.piece, u = this.u;
    const r = { x: this.cx - 12 * u, y: this.gy - 12 * u, w: 24 * u, h: 12 * u };
    if (hit(p, r, u * 6)) {
      sfx.pop(); burst(p.x, p.y, 6);
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
      const pu = Math.max(2, Math.floor(s / 30));
      if (this.stage === 0) veh("build", p.x + wx(p), p.y + s * 0.15, pu, this.col, { body: true });
      if (this.stage === 1) { shape("circle", p.x + wx(p), p.y, s * 0.25, C.k, pu); shape("circle", p.x + wx(p), p.y, s * 0.12, C.grey, pu); }
      if (this.stage === 2) veh("build", p.x + wx(p), p.y + s * 0.3, pu, this.col, { roof: true });
    } else if (!this.drive) {
      const b = this.goBtn; iconBtn(b, C.green, () => { ptri(b.x + b.w * 0.3, b.y + b.h * 0.2, b.w * 0.4, b.h * 0.6, C.white); });
    }
  }
}
import { ptri } from "./core";
