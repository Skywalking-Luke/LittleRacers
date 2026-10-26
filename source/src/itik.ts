// Itik Lalu (ducks crossing): a car waits at the zebra crossing while a duck family (and a hen) waddles across.
// Tap an animal and it does a little hop and hurries for 2 s. When everyone is across, the car toots politely and drives on. Ages 2-3.
// No fail state: the animals always reach the other side on their own; taps only help.
import { g, D, C, MIN, Pt, sfx, say } from "./core";
import { veh, VW, pic, cover, shadow, backdrop } from "./art";
import { Game } from "./game";
import { vs } from "./vsfx";
import { Diff, lerp5, shortSide } from "./trace";
import { RM } from "./calm";

type Kind = "duck" | "duckling" | "hen";
type Ani = { k: Kind; p: number; fast: number; hop: number; tapped: boolean; ph: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const SIZE: Record<Kind, number> = { duck: 1, duckling: 0.55, hen: 0.95 }; // x duck height (ITIK-NOTES)
const ART: Record<Kind, string> = { duck: "duck-walk", duckling: "duckling-walk", hen: "hen-walk" }; // + "-1" / "-2"
const BASE: Record<Kind, number> = { duck: 547 / 571, duckling: 315 / 330, hen: 526 / 550 }; // foot baseline / height
export class Itik extends Game {
  id = "itik"; rounds = 3;
  step = 1; anis: Ani[] = []; T = 14; tw = 80; carX = 0; carGo = -1; tooted = false; anyTap = false;
  rt = 0; nearY = 0; farY = 0; x0 = 0; x1 = 0; u = 3; lastSay = -9;
  start() {
    this.step = Diff.step(this.id); this.T = lerp5(14, 8, this.step); this.carGo = -1; this.tooted = false; this.anyTap = false;
    const n = Math.round(lerp5(3, 6, this.step)), kinds: Kind[] = ["duck"];
    for (let i = 1; i < n; i++) kinds.push(i === n - 1 && n >= 4 ? "hen" : "duckling");
    if (n === 3) kinds[2] = "hen";
    this.anis = kinds.map((k, i) => ({ k, p: -0.22 - i * 0.24, fast: 0, hop: 0, tapped: false, ph: i * 1.7 }));
    this.place(); this.carX = this.carWait(); this.prompt();
  }
  prompt() { say("x_itik"); }
  // Geometry from ITIK-NOTES.md, in fractions of the painted background (cover-cropped), so it tracks the art.
  bg = "bg-itik"; land = true; sc = 1; ox = 0; oy = 0; iw = 0; ih = 0; yH = 0; yN = 1; duckH = 40; carW = 100;
  Y(f: number) { return this.oy + f * this.ih; }
  X(f: number) { return this.ox + f * this.iw; }
  carLen() { return this.carW; }
  carWait() { return this.X(this.land ? 0.39 : 0.32) - this.carW / 2; }
  place() {
    const W = D.W, H = D.H, S = shortSide(); this.land = W > H; this.bg = this.land ? "bg-itik" : "bg-itik-portrait";
    const im = pic(this.bg), nw = im ? im.naturalWidth : this.land ? 2400 : 1350, nh = im ? im.naturalHeight : this.land ? 1350 : 2400;
    this.sc = Math.max(W / nw, H / nh); this.iw = nw * this.sc; this.ih = nh * this.sc; this.ox = (W - this.iw) / 2; this.oy = (H - this.ih) / 2;
    this.yH = this.Y(this.land ? -0.33 : 0.251); this.yN = this.Y(this.land ? 0.79 : 0.58);
    this.farY = this.Y(this.land ? 0.6 : 0.43); this.nearY = this.Y(this.land ? 0.87 : 0.66);
    this.rt = this.Y(this.land ? 0.655 : 0.465);
    this.duckH = this.ih * (this.land ? 0.12 : 0.09);
    this.x0 = this.X(0.47); this.x1 = this.X(0.53);
    this.carW = Math.min((this.land ? 0.16 : 0.32) * this.iw * this.K(this.carGy()), this.X(this.land ? 0.39 : 0.32) - D.W * 0.07); // stays fully on a narrow phone
    this.tw = lerp5(0.2, 0.12, this.step) * S;
    if (this.carGo < 0) this.carX = this.carWait();
  }
  carGy() { return this.Y(this.land ? 0.735 : 0.545); }
  /** ground point of an animal: queue on the near verge (p<0), along the zebra (0..1) to the far verge, then strolling right (p>1) */
  pos(a: Ani) {
    const Q = this.iw * 0.5;
    if (a.p < 0) return { x: this.x0 + a.p * Q * 0.7, y: this.nearY };
    if (a.p <= 1) { const e = a.p; return { x: this.x0 + (this.x1 - this.x0) * e, y: this.nearY + (this.farY - this.nearY) * e }; }
    return { x: this.x1 + (a.p - 1) * Q, y: this.farY };
  }
  K(y: number) { return (y - this.yH) / (this.yN - this.yH || 1); }
  hgt(a: Ani, y: number) { return this.duckH * SIZE[a.k] * this.K(y); }
  tick(dt: number) {
    if (this.wait > 0) return;
    const base = 1 / this.T;
    for (const a of this.anis) {
      a.fast = Math.max(0, a.fast - dt); a.hop = Math.max(0, a.hop - dt * 2.2);
      const along = a.p > 1.25 ? 0.25 : 1; // slow to a gentle stroll once safely across
      a.p += base * dt * (a.fast > 0 ? 2.2 : 1) * (a.p < 0 ? 1.4 : 1) * along;
    }
    if (this.carGo < 0 && this.anis.every((a) => a.p >= 1.06)) {
      this.carGo = 0; vs.honk("car", 0.5); say("x_itik_go");
      if (this.anyTap) Diff.roundEnd(this.id, 0); else Diff.miss(this.id);
    }
    if (this.carGo >= 0) {
      this.carGo += dt;
      if (this.carGo > 1.6) { if (this.carGo - dt <= 1.6) { vs.start("car", 0.8); vs.engine("car", 4, 0.7); } this.carX += D.W * 0.45 * dt * Math.min(1, (this.carGo - 1.6) * 1.5); }
      if (this.carX - this.carLen() / 2 > D.W) { vs.stopEngine(0.5); this.win(D.W * 0.5, this.rt); }
    }
  }
  press(p: Pt) {
    let best: Ani | null = null, bd = 1e9;
    for (const a of this.anis) { if (a.p >= 1) continue; const q = this.pos(a), k = this.K(q.y), h = this.hgt(a, q.y), cx = q.x, cy = q.y - h * 0.5;
      const half = Math.max(this.tw, MIN) / 2; if (Math.abs(p.x - cx) <= half && Math.abs(p.y - cy) <= half) { const d = Math.hypot(p.x - cx, p.y - cy); if (d < bd) { bd = d; best = a; } } }
    if (!best) return; // a tap that misses does nothing
    best.fast = 2; best.hop = 1; best.tapped = true; this.anyTap = true; sfx.pop();
  }
  drawAni(a: Ani) {
    const q = this.pos(a), k = this.K(q.y), h = this.hgt(a, q.y), walking = a.p < 1.4 || Math.sin(this.t) > 0;
    const frame = walking && !RM() ? (Math.floor((this.t + a.ph) * (a.fast > 0 ? 5.7 : 2.85)) % 2) + 1 : 1; // ~0.35 s per pose
    const hp = RM() ? 0 : Math.sin(Math.min(1, a.hop) * Math.PI), lift = hp * h * 0.2; // hop: sprite lifts, shadow stays at the feet
    const key = ART[a.k] + "-" + frame, im = pic(key), w = im ? (h * im.naturalWidth) / im.naturalHeight : h;
    shadow(q.x, q.y, w * 0.8 * (1 - 0.1 * hp));
    g.save(); if (k < 0.9) g.filter = "saturate(0.85) brightness(1.04)"; // far things a touch paler
    if (im) g.drawImage(im, q.x - w / 2, q.y - BASE[a.k] * h - lift, w, h);
    else { g.translate(0, -lift); placeholderBird(a.k, q.x, q.y, h, frame); }
    g.restore();
  }
  paint() {
    pic(this.bg); if (!cover(this.bg)) { backdrop("kampung", 0.55); g.fillStyle = C.road; g.fillRect(0, this.rt, D.W, this.Y(this.land ? 0.79 : 0.58) - this.rt); }
    const L = Math.max(D.W, D.H), list: { y: number; f: () => void }[] = [];
    // tufts on the verge corners, away from the crossing path (bottom edge = ground, no shadow)
    for (const [fx, y] of [[0.06, this.Y(this.land ? 0.62 : 0.45)], [0.94, this.Y(this.land ? 0.63 : 0.45)], [0.07, this.Y(this.land ? 0.95 : 0.93)], [0.93, this.Y(this.land ? 0.94 : 0.95)]] as [number, number][]) {
      const x = this.X(fx), h = 0.07 * L * this.K(y) * 0.675; // 0.07 L wide; tuft is 400x270
      list.push({ y, f: () => { const t = pic("grass-tuft"); if (t) g.drawImage(t, x - h / 0.675 / 2, y - h, h / 0.675, h); else tuft(x, y, h); } });
    }
    for (const a of this.anis) list.push({ y: this.pos(a).y, f: () => this.drawAni(a) });
    const cg = this.carGy(); list.push({ y: cg, f: () => { shadow(this.carX, cg, this.carW * 0.95); veh("car", this.carX, cg, this.carW / VW.car[0], C.red); } });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
  }
}
/** code-drawn stand-in (side view, facing right) until Sylphy's painted poses land */
function placeholderBird(k: Kind, x: number, gy: number, h: number, frame: number) {
  const body = k === "duckling" ? "#F6D365" : k === "hen" ? "#C98A5B" : "#F4F1EA", beak = "#E9A04A", s = h;
  const ln = Math.max(1.2, s * 0.03); g.lineWidth = ln; g.strokeStyle = "#5b4a3a";
  // feet (alternate per frame)
  g.fillStyle = beak; const f = frame === 1 ? 1 : -1; g.fillRect(x - s * 0.12 + f * s * 0.04, gy - s * 0.1, s * 0.05, s * 0.1); g.fillRect(x + s * 0.04 - f * s * 0.04, gy - s * 0.1, s * 0.05, s * 0.1);
  g.fillStyle = body; g.beginPath(); g.ellipse(x - s * 0.04, gy - s * 0.33, s * 0.32, s * 0.24, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(x + s * 0.2, gy - s * 0.66, s * 0.17, 0, 7); g.fill(); g.stroke();
  if (k === "hen") { g.fillStyle = "#D9534F"; g.beginPath(); g.arc(x + s * 0.2, gy - s * 0.84, s * 0.06, 0, 7); g.fill(); }
  g.fillStyle = beak; g.beginPath(); g.moveTo(x + s * 0.34, gy - s * 0.7); g.lineTo(x + s * 0.48, gy - s * 0.64); g.lineTo(x + s * 0.34, gy - s * 0.6); g.fill();
  g.fillStyle = "#2b2b2b"; g.beginPath(); g.arc(x + s * 0.25, gy - s * 0.7, s * 0.03, 0, 7); g.fill();
}
function tuft(x: number, gy: number, h: number) { g.strokeStyle = "#7aa35a"; g.lineWidth = Math.max(1, h * 0.08); g.lineCap = "round"; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * h * 0.12, gy); g.lineTo(x + i * h * 0.22, gy - h * (0.7 + 0.3 * (i % 2 === 0 ? 1 : 0))); g.stroke(); } }
