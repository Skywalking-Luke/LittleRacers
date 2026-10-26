// Parking Pandai (smart parking): drag the car into the empty bay between parked cars, then let go.
// Near the bay it is pulled in, straightens and settles with a little bounce. Otherwise it rolls gently back to the start line
// with a calm hint. Ages 4-5. No timer, no fail state.
import { g, D, C, MIN, Pt, say } from "./core";
import { pic, cover, shadow } from "./art";
import { Game } from "./game";
import { vs } from "./vsfx";
import { Diff, lerp5, shortSide } from "./trace";
import { RM } from "./calm";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const COLS = ["#5B8DD6", "#F2C14E", "#B8A1D9", "#7FBF8E"];
const PARKED = ["park-car-blue", "park-car-yellow", "park-car-lilac", "park-car-green"];
const GROUND = 551 / 588; // park-car tyre ground line / height (shadow baked below it)
type Mode = "idle" | "drag" | "back" | "in" | "done";

// Geometry follows PARKING-NOTES.md: one vanishing point at x = W/2; a ground point at front-line offset X is drawn at W/2 + X*k(y).
export class Parking extends Game {
  id = "parking"; rounds = 3; coalesce = true;
  step = 1; misses = 0; n = 2; empty = 0; mode: Mode = "idle";
  yH = 0; yBack = 0; yFront = 0; rowY = 0; startY = 0; startX = 0; carW = 100; bayW = 100; cones: number[] = [];
  x = 0; y = 0; ox = 0; oy = 0; fx = 0; fy = 0; tilt = 0; anim = 0; bounce = 0; lastSay = -9; bg = "bg-parking";
  start() {
    this.step = Diff.step(this.id); this.misses = 0;
    this.n = Math.round(lerp5(2, 6, this.step)); if (D.H > D.W) this.n = Math.min(4, this.n); // portrait: at most 4 parked cars
    this.empty = 1 + Math.floor(Math.random() * Math.max(1, this.n - 1)); if (this.n === 2) this.empty = 1;
    this.mode = "idle"; this.place(); this.x = this.startX; this.y = this.startY; this.tilt = 0; this.prompt();
  }
  prompt() { say("x_parking"); }
  place() {
    const W = D.W, H = D.H, land = W > H; this.bg = land ? "bg-parking" : "bg-parking-portrait";
    const im = pic(this.bg), nw = im ? im.naturalWidth : land ? 2400 : 1350, nh = im ? im.naturalHeight : land ? 1350 : 2400;
    const sc = Math.max(W / nw, H / nh), ih = nh * sc, oy = (H - ih) / 2, Y = (f: number) => oy + f * ih;
    this.yH = Y(land ? 0.3 : 0.2); this.yBack = Y(land ? 0.64 : 0.52); this.yFront = Y(land ? 0.9 : 0.78);
    this.rowY = this.yBack + 0.72 * (this.yFront - this.yBack);
    this.startY = Math.min(this.yH + 1.1 * (this.yFront - this.yH), H - Math.min(W, H) * 0.03);
    this.carW = W * (land ? 0.19 : 0.21);
    const mult = Math.max(lerp5(2.0, 1.25, this.step), this.step <= 2 ? 1.4 : 0); // easy steps never below 1.4x
    const kf = land ? 1 : this.K(this.rowY); // portrait: fit the row where the cars stand; bay fronts may run a little off-screen (notes allow)
    for (let i = 0; i < 40 && (this.n + 1) * mult * this.carW * kf > W * 0.94; i++) this.carW *= 0.96; // smaller car so the row fits
    this.bayW = mult * this.carW;
    const ex = this.bayX(this.empty), side = ex > 0 ? -1 : ex < 0 ? 1 : Math.random() < 0.5 ? -1 : 1;
    this.startX = clamp(ex + side * Math.max(this.bayW * 1.3, W * 0.25), -W * 0.36, W * 0.36);
    if (Math.abs(this.startX - ex) < this.bayW) this.startX = clamp(ex - side * Math.max(this.bayW * 1.3, W * 0.25), -W * 0.36, W * 0.36);
    // cones from step 3: on bay corners at the front line, never on the empty bay's own lines
    this.cones = []; const nc = this.step >= 3 ? this.step - 2 : 0, lines: number[] = [];
    for (let j = 0; j <= this.n + 1; j++) if (j !== this.empty && j !== this.empty + 1) lines.push(j);
    for (let i = 0; i < nc && lines.length; i++) this.cones.push(lines.splice(i % 2 ? lines.length - 1 : 0, 1)[0]);
    if (this.mode === "idle" || this.mode === "back") { this.x = this.startX; this.y = this.startY; }
    if (this.mode === "done" || this.mode === "in") { this.x = this.bayX(this.empty); this.y = this.rowY; }
  }
  /** bay centre / divider offsets in front-line px from screen centre */
  bayX(i: number) { return (i - this.n / 2) * this.bayW; }
  divX(j: number) { return (j - (this.n + 1) / 2) * this.bayW; }
  K(y: number) { return (y - this.yH) / (this.yFront - this.yH || 1); }
  sx(X: number, y: number) { return D.W / 2 + X * this.K(y); }
  carRect() { const k = this.K(this.y), w = this.carW * k, h = w * 0.7, t = Math.max(0.1 * shortSide(), MIN, w), cx = this.sx(this.x, this.y); return { x: cx - t / 2, y: this.y - h / 2 - t / 2, w: t, h: t }; }
  press(p: Pt) {
    if (this.mode !== "idle" && this.mode !== "back") return;
    const r = this.carRect(), pad = shortSide() * 0.03;
    if (p.x < r.x - pad || p.x > r.x + r.w + pad || p.y < r.y - pad || p.y > r.y + r.h + pad) { if (this.t - this.lastSay > 5) { this.lastSay = this.t; say("x_parking"); } return; }
    this.mode = "drag"; this.ox = p.x - this.sx(this.x, this.y); this.oy = p.y - this.y; vs.honk("car", 0.5);
  }
  drag2(p: Pt) {
    if (this.mode !== "drag") return;
    const ny = clamp(p.y - this.oy, this.yBack + (this.rowY - this.yBack) * 0.4, D.H - shortSide() * 0.02), k = this.K(ny);
    const sxp = clamp(p.x - this.ox, this.carW * k * 0.4, D.W - this.carW * k * 0.4), nx = (sxp - D.W / 2) / k;
    this.tilt = clamp(this.tilt + (sxp - this.sx(this.x, this.y)) * 0.004, -0.14, 0.14); this.x = nx; this.y = ny;
    vs.engine("car", 1.0, 0.7);
  }
  release() {
    if (this.mode !== "drag") return;
    const S = shortSide(), d = Math.hypot(this.sx(this.x, this.y) - this.sx(this.bayX(this.empty), this.rowY), (this.y - this.rowY) * 1.2), snap = lerp5(0.15, 0.05, this.step) * S;
    vs.stopEngine(0.4);
    if (d <= snap) { this.mode = "in"; this.fx = this.x; this.fy = this.y; this.anim = 0; return; }
    this.misses++; Diff.miss(this.id); say("x_parking_hint");
    this.mode = "back"; this.fx = this.x; this.fy = this.y; this.anim = RM() ? 1 : 0;
  }
  tick(dt: number) {
    this.tilt *= Math.pow(this.mode === "drag" ? 0.02 : 0.0005, dt); // straightens out
    this.bounce = Math.max(0, this.bounce - dt * 1.6);
    if (this.mode === "in") {
      this.anim = Math.min(1, this.anim + dt / (RM() ? 0.01 : 0.55)); const e = 1 - Math.pow(1 - this.anim, 3);
      this.x = this.fx + (this.bayX(this.empty) - this.fx) * e; this.y = this.fy + (this.rowY - this.fy) * e;
      if (this.anim >= 1) { this.mode = "done"; this.bounce = RM() ? 0 : 1; Diff.roundEnd(this.id, this.misses); this.win(this.sx(this.x, this.y), this.rowY - this.carW * this.K(this.rowY)); }
    } else if (this.mode === "back") {
      this.anim = Math.min(1, this.anim + dt / 1.1); const e = this.anim * this.anim * (3 - 2 * this.anim);
      this.x = this.fx + (this.startX - this.fx) * e; this.y = this.fy + (this.startY - this.fy) * e;
      if (this.anim >= 1) this.mode = "idle";
    }
  }
  paint() {
    const W = D.W, H = D.H, S = shortSide(), L = Math.max(W, H);
    pic(this.bg); if (!cover(this.bg)) { g.fillStyle = "#EFE6D6"; g.fillRect(0, 0, W, H); g.fillStyle = "#B3ACA2"; g.fillRect(0, this.yBack - S * 0.08, W, H); }
    const kb = this.K(this.yBack), P = (X: number, y: number, k: number) => [W / 2 + X * k, y] as const;
    // empty bay: soft glow on the ground
    if (this.mode !== "done") { const a = this.divX(this.empty), b = this.divX(this.empty + 1); g.save(); g.globalAlpha = 0.22 + (RM() ? 0 : 0.1 * Math.sin(this.t * 2.5)); g.fillStyle = "#FFF6D8"; g.beginPath(); g.moveTo(...P(a, this.yFront, 1)); g.lineTo(...P(b, this.yFront, 1)); g.lineTo(...P(b, this.yBack, kb)); g.lineTo(...P(a, this.yBack, kb)); g.fill(); g.restore(); }
    // bay lines drawn in code (dividers + back line), cream at 0.75
    g.save(); g.strokeStyle = "rgba(250,247,238,0.75)"; g.lineCap = "round";
    for (let j = 0; j <= this.n + 1; j++) { const X = this.divX(j); g.lineWidth = Math.max(2, 0.008 * W); g.beginPath(); g.moveTo(...P(X, this.yFront, 1)); g.lineTo(...P(X, this.yBack, kb)); g.stroke(); }
    g.lineWidth = Math.max(2, 0.008 * W * kb); g.beginPath(); g.moveTo(...P(this.divX(0), this.yBack, kb)); g.lineTo(...P(this.divX(this.n + 1), this.yBack, kb)); g.stroke(); g.restore();
    // standing things sorted by ground y: parked cars, cones, player car
    const list: { y: number; f: () => void }[] = []; let ci = 0;
    for (let i = 0; i <= this.n; i++) if (i !== this.empty) { const col = ci++ % COLS.length, X = this.bayX(i); list.push({ y: this.rowY, f: () => rearCar(this.sx(X, this.rowY), this.rowY, this.carW * this.K(this.rowY), COLS[col], PARKED[col]) }); }
    for (const j of this.cones) { const x = this.sx(this.divX(j), this.yFront), w = 0.045 * L; list.push({ y: this.yFront, f: () => { const key = w < 70 ? "cone-s" : w < 110 ? "cone-m" : "cone-l", im = pic(key); if (im) { const h = (w * im.naturalHeight) / im.naturalWidth; g.drawImage(im, x - w / 2, this.yFront - 0.94 * h, w, h); } else cone(x, this.yFront, w * 1.2); } }); }
    list.push({ y: this.y + 0.01, f: () => {
      const k = this.K(this.y), w = this.carW * k, cx = this.sx(this.x, this.y), sq = this.bounce > 0 ? Math.sin(this.bounce * Math.PI * 3) * this.bounce * 0.05 : 0;
      if (this.mode === "idle" && !RM()) { const r = this.carRect(); g.save(); g.globalAlpha = 0.3 + 0.2 * Math.sin(this.t * 3); g.strokeStyle = "#fff"; g.lineWidth = Math.max(3, S * 0.01); g.beginPath(); g.arc(cx, this.y - w * 0.36, r.w * 0.62, 0, 7); g.stroke(); g.restore(); }
      g.save(); g.translate(cx, this.y); g.rotate(this.tilt); g.scale(1, 1 - sq); g.translate(-cx, -this.y);
      rearCar(cx, this.y, w, C.red, pic("park-car-player") ? "park-car-player" : "park-car-red"); g.restore(); } });
    list.sort((a, b) => a.y - b.y).forEach((o) => o.f());
  }
}
/** car seen from the back, standing on gy (placeholder drawing until Sylphy's painted rear views land) */
function rearCar(x: number, gy: number, w: number, col: string, art: string, sleepy = true) {
  const im = pic(art); if (im) { const h = (w * im.naturalHeight) / im.naturalWidth; g.drawImage(im, x - w / 2, gy - GROUND * h, w, h); return; } // shadow baked in
  const h = w * 0.72; shadow(x, gy, w * 1.05);
  g.fillStyle = "#3a3a3a"; g.fillRect(x - w * 0.42, gy - h * 0.2, w * 0.16, h * 0.2); g.fillRect(x + w * 0.26, gy - h * 0.2, w * 0.16, h * 0.2);
  g.fillStyle = col; g.strokeStyle = "#4a3b33"; g.lineWidth = Math.max(1.2, w * 0.02);
  g.beginPath(); (g as any).roundRect(x - w * 0.5, gy - h * 0.62, w, h * 0.48, w * 0.1); g.fill(); g.stroke();
  g.beginPath(); (g as any).roundRect(x - w * 0.34, gy - h * 0.98, w * 0.68, h * 0.42, w * 0.12); g.fill(); g.stroke();
  g.fillStyle = "#CFE6F2"; g.beginPath(); (g as any).roundRect(x - w * 0.27, gy - h * 0.92, w * 0.54, h * 0.28, w * 0.07); g.fill();
  g.fillStyle = sleepy ? "#E9B9A8" : "#F26B5B"; g.fillRect(x - w * 0.44, gy - h * 0.5, w * 0.13, h * 0.1); g.fillRect(x + w * 0.31, gy - h * 0.5, w * 0.13, h * 0.1);
  g.fillStyle = "#F6F1E4"; g.fillRect(x - w * 0.12, gy - h * 0.34, w * 0.24, h * 0.09);
}
function cone(x: number, gy: number, h: number) { shadow(x, gy, h * 0.7); g.fillStyle = "#EE8A4E"; g.beginPath(); g.moveTo(x - h * 0.3, gy); g.lineTo(x - h * 0.08, gy - h); g.lineTo(x + h * 0.08, gy - h); g.lineTo(x + h * 0.3, gy); g.fill(); g.fillStyle = "#F6F1E4"; g.fillRect(x - h * 0.18, gy - h * 0.55, h * 0.36, h * 0.12); g.fillStyle = "#c96a3a"; g.fillRect(x - h * 0.36, gy - h * 0.06, h * 0.72, h * 0.06); }
