import { g, D, C, R, MIN, hit, Rect, Scene, Pt, go, burst, sfx, say, box, star, txt } from "./core";
import { btnBox, homeIcon, speakerIcon, fitPic, pic, cover } from "./art";
import { S, word } from "./audio";
import { vs, kindOf } from "./vsfx";
import { HoldHome } from "./calm";
let homeFn: () => Scene = null as any;
export function setHome(f: () => Scene) { homeFn = f; }
export function goHome() { go(homeFn()); }
/** calm, always-the-same praise: claps (and a gentle cheer outside the family copy), never a spoken "yay" */
export const praise = () => { vs.praise(); };
export type Item = { x: number; y: number; hx: number; hy: number; w: number; h: number; wig: number; bob: number; [k: string]: any };
export const mkItem = (o: any = {}): Item => Object.assign({ x: 0, y: 0, hx: 0, hy: 0, w: 0, h: 0, wig: 0, bob: 0 }, o);
export function ease(it: Item, dt: number, k = 8) { it.x += (it.hx - it.x) * Math.min(1, dt * k); it.y += (it.hy - it.y) * Math.min(1, dt * k); it.wig = Math.max(0, it.wig - dt); it.bob = Math.max(0, it.bob - dt * 2); }
export const bobY = (it: Item) => -Math.sin(Math.min(1, it.bob) * Math.PI) * D.U * 4;
export const wx = (it: Item) => (it.wig > 0 ? Math.sin(D.t * 18) * it.wig * D.U * 3 : 0);
export function rectOf(it: Item): Rect { return { x: it.x - it.w / 2, y: it.y - it.h / 2, w: it.w, h: it.h }; }
export function iconBtn(r: Rect, col: string, draw: () => void, pressed = false) { btnBox(r.x, r.y, r.w, r.h, col, pressed); draw(); }

export abstract class Game implements Scene {
  abstract id: string;
  rounds = 4; round = 0; wait = 0; t = 0; busy = false;
  back: Rect; spk: Rect; hh = new HoldHome(() => goHome()); drag: Item | null = null; offX = 0; offY = 0;
  enter() { this.round = 0; this.wait = 0; this.layoutHud(); this.start(); }
  layoutHud() { const s = Math.max(MIN, Math.round(Math.min(D.W, D.H) * 0.11)), sp = Math.max(MIN, Math.round(Math.min(D.W, D.H) * 0.13)); this.back = this.hh.layout(s); this.hh.pending = false;  this.spk = { x: D.W - sp - D.U * 3, y: D.U * 3, w: sp, h: sp }; }
  layout() { this.layoutHud(); this.place(); }
  abstract start(): void;
  abstract prompt(): void;
  abstract place(): void;
  abstract paint(): void;
  tick(dt: number) {}
  press(p: Pt) {} drag2(p: Pt) {} release(p: Pt) {}
  /** round complete: gentle sparkle + happy line, then next round */
  win(x: number, y: number, line?: string, vars?: any, delay = 2.6) {
    vs.stopEngine(0.6);
    if (this.wait > 0) return; burst(x, y, 8); praise();
    if (line) say(line, vars); this.wait = delay;
  }
  oops(it?: Item, hint?: string, vars?: any) { sfx.boop(); if (it) it.wig = 0.6; if (hint) say(hint, vars); }
  update(dt: number) {
    this.t += dt; this.hh.update(dt); this.tick(dt);
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { this.round++; if (this.round >= this.rounds) go(new Done(this)); else { this.start(); this.place(); } } }
  }
  draw() { this.paint(); this.hud(); if (S.rain) drizzle(); }
  hud() {
    this.hh.draw();
    iconBtn(this.spk, C.yellow, () => speakerIcon(this.spk.x + this.spk.w * 0.12, this.spk.y + this.spk.h * 0.12, this.spk.w * 0.76));
    // progress: soft dots for rounds, not a score
    const r = Math.max(6, D.U * 2.2), gap = r * 3, x0 = D.W / 2 - ((this.rounds - 1) * gap) / 2, y = this.back.y + this.back.h / 2;
    for (let i = 0; i < this.rounds; i++) star(x0 + i * gap, y, r * 1.3, i < this.round || (i == this.round && this.wait > 0) ? C.yellow : "#ECE6DA", true);
  }
  down(p: Pt) {
    if (this.hh.press(p)) return;
    if (hit(p, this.spk, 4)) { sfx.tap(); this.prompt(); return; }
    if (this.wait > 0) return;
    this.press(p);
  }
  move(p: Pt) { this.hh.move(p); if (this.drag) { this.drag.x = p.x - this.offX; this.drag.y = p.y - this.offY; } this.drag2(p); }
  up(p: Pt) { this.hh.release(); this.release(p); this.drag = null; }
  grab(it: Item, p: Pt) { this.drag = it; this.offX = p.x - it.x; this.offY = p.y - it.y; sfx.pop(); const k = kindOf(String((it as any).k || "")) ? String((it as any).k) : ["shape", "carijalan", "colour"].includes(this.id) ? "car" : ""; if (k) vs.honk(k, 0.7); }
}
export function drizzle() { return; /* specks removed (Luke) */ }
function _oldDrizzle() { g.fillStyle = "rgba(255,255,255,.55)"; const u = D.U; for (let i = 0; i < 40; i++) { const x = (i * 97.3 + D.t * 30) % D.W, y = (i * 53.1 + D.t * 140 + i * i) % D.H; g.fillRect(x, y, u / 2 + 1, u * 2); } }

class Done implements Scene {
  again: Rect; home: Rect; t = 0; hh = new HoldHome(() => goHome());
  constructor(public game: Game) {}
  enter() { praise(); say("x_done"); burst(D.W / 2, D.H * 0.35, 8); }
  layout() { const s = Math.max(MIN * 1.4, Math.min(D.W, D.H) * 0.17); this.hh.layout(Math.max(MIN, Math.round(Math.min(D.W, D.H) * 0.11))); this.hh.pending = false; this.again = { x: D.W / 2 - s / 2, y: D.H * 0.64, w: s, h: s }; this.home = this.again; }
  update(dt: number) { this.t += dt; this.hh.update(dt); }
  draw() {
    R(0, 0, D.W, D.H, C.bg); const s = Math.min(D.W, D.H);
    // painted kampung backdrop (portrait or landscape by orientation) with a soft cream card behind the stars and buttons so they read on the road
    { const bk = D.H > D.W ? "bg-done-portrait" : "bg-done"; pic(bk); if (cover(bk)) { const A = this.again, pad = s * 0.07, cy = D.H * 0.33 - s * 0.24, cx = Math.min(A.x, D.W / 2 - s * 0.4) - pad, cw = D.W - 2 * cx; g.save(); g.globalAlpha = 0.8; g.fillStyle = "#FAF6EE"; g.beginPath(); (g as any).roundRect(cx, cy, cw, A.y + A.h + pad - cy, s * 0.08); g.fill(); g.restore(); } }
    const b = Math.sin(Math.min(1, this.t * 1.5) * Math.PI) * D.U * 4;
    { const tr = this.game.id === "race" ? pic("trophy") : null; if (tr) { const k = Math.min(1, this.t * 1.2), e = 1 - Math.pow(1 - k, 3), h = s * 0.34 * (0.85 + 0.15 * e), w = h * tr.naturalWidth / tr.naturalHeight; g.save(); g.globalAlpha = e; g.drawImage(tr, D.W / 2 - w / 2, D.H * 0.33 - h * 0.6 - b * 0.5, w, h); g.restore(); } else star(D.W / 2, D.H * 0.33 - b, s * 0.16, C.yellow); }
    for (const sx of [-0.26, 0.26]) { const r = s * 0.08 * (1 + 0.06 * Math.sin(this.t * 2 + sx * 9)); if (!fitPic("star", D.W / 2 + sx * s - r * 1.15, D.H * 0.38 - r * 1.15, r * 2.3, r * 2.3)) star(D.W / 2 + sx * s, D.H * 0.38, r, sx < 0 ? C.pink : C.lav); }
    const a = this.again, h = this.home;
    iconBtn(a, C.green, () => { // replay arrow
      if (fitPic("icon-replay", a.x + a.w * 0.12, a.y + a.h * 0.12, a.w * 0.76, a.h * 0.76)) return;
      const u = Math.max(3, a.w / 14), cx = a.x + a.w / 2, cy = a.y + a.h / 2, r = a.w * 0.26;
      g.lineCap = "round"; g.strokeStyle = C.k; g.lineWidth = u * 2.6; g.beginPath(); g.arc(cx, cy, r, 0.5, 0.5 + Math.PI * 1.6); g.stroke(); g.strokeStyle = C.white; g.lineWidth = u * 1.6; g.stroke();
      const ex = cx + Math.cos(0.5 + Math.PI * 1.6) * r, ey = cy + Math.sin(0.5 + Math.PI * 1.6) * r; g.fillStyle = C.white; g.strokeStyle = C.k; g.lineWidth = u * 0.5; g.beginPath(); g.moveTo(ex + u * 2.4, ey); g.lineTo(ex - u * 1.6, ey - u * 2.2); g.lineTo(ex - u * 1.2, ey + u * 2.4); g.closePath(); g.fill(); g.stroke();
    });
    this.hh.draw(); { const m = word("x_done"), s2 = Math.min(D.W, D.H); txt(m, D.W / 2, D.H * 0.56, Math.min(s2 * 0.045, D.W / (m.length * 0.6)), "#4A4A48", "center", false); }
    if (S.rain) drizzle();
  }
  down(p: Pt) {
    if (this.hh.press(p)) return;
    if (hit(p, this.again)) { sfx.tap(); go(this.game); }
  }
  move(p: Pt) { this.hh.move(p); }
  up() { this.hh.release(); }
}
