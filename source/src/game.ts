import { g, D, C, R, MIN, hit, Rect, Scene, Pt, go, burst, sfx, say, box, star, txt } from "./core";
import { btnBox, homeIcon, speakerIcon } from "./art";
import { S } from "./audio";
let homeFn: () => Scene = null as any;
export function setHome(f: () => Scene) { homeFn = f; }
export function goHome() { go(homeFn()); }
const PRAISE = ["x_praise1", "x_praise2", "x_praise3", "x_praise4"];
export const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
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
  back: Rect; spk: Rect; drag: Item | null = null; offX = 0; offY = 0;
  enter() { this.round = 0; this.wait = 0; this.layoutHud(); this.start(); }
  layoutHud() { const s = Math.max(MIN, Math.round(Math.min(D.W, D.H) * 0.13)); this.back = { x: D.U * 3, y: D.U * 3, w: s, h: s }; this.spk = { x: D.W - s - D.U * 3, y: D.U * 3, w: s, h: s }; }
  layout() { this.layoutHud(); this.place(); }
  abstract start(): void;
  abstract prompt(): void;
  abstract place(): void;
  abstract paint(): void;
  tick(dt: number) {}
  press(p: Pt) {} drag2(p: Pt) {} release(p: Pt) {}
  /** round complete: gentle sparkle + happy line, then next round */
  win(x: number, y: number, line?: string, vars?: any, delay = 2.6) {
    if (this.wait > 0) return; sfx.cheer(); burst(x, y);
    say(line || praise(), vars); this.wait = delay;
  }
  oops(it?: Item, hint?: string, vars?: any) { sfx.boop(); if (it) it.wig = 0.6; if (hint) say(hint, vars); }
  update(dt: number) {
    this.t += dt; this.tick(dt);
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0) { this.round++; if (this.round >= this.rounds) go(new Done(this)); else { this.start(); this.place(); } } }
  }
  draw() { this.paint(); this.hud(); if (S.rain) drizzle(); }
  hud() {
    iconBtn(this.back, C.cream, () => homeIcon(this.back.x + this.back.w * 0.12, this.back.y + this.back.h * 0.1, this.back.w * 0.76));
    iconBtn(this.spk, C.yellow, () => speakerIcon(this.spk.x + this.spk.w * 0.12, this.spk.y + this.spk.h * 0.12, this.spk.w * 0.76));
    // progress: soft dots for rounds, not a score
    const r = Math.max(6, D.U * 2.2), gap = r * 3, x0 = D.W / 2 - ((this.rounds - 1) * gap) / 2, y = this.back.y + this.back.h / 2;
    for (let i = 0; i < this.rounds; i++) star(x0 + i * gap, y, r * 1.3, i < this.round || (i == this.round && this.wait > 0) ? C.yellow : "#ECE6DA", true);
  }
  down(p: Pt) {
    if (hit(p, this.back, 4)) { sfx.tap(); goHome(); return; }
    if (hit(p, this.spk, 4)) { sfx.tap(); this.prompt(); return; }
    if (this.wait > 0) return;
    this.press(p);
  }
  move(p: Pt) { if (this.drag) { this.drag.x = p.x - this.offX; this.drag.y = p.y - this.offY; } this.drag2(p); }
  up(p: Pt) { this.release(p); this.drag = null; }
  grab(it: Item, p: Pt) { this.drag = it; this.offX = p.x - it.x; this.offY = p.y - it.y; sfx.pop(); }
}
export function drizzle() { g.fillStyle = "rgba(255,255,255,.55)"; const u = D.U; for (let i = 0; i < 40; i++) { const x = (i * 97.3 + D.t * 30) % D.W, y = (i * 53.1 + D.t * 140 + i * i) % D.H; g.fillRect(x, y, u / 2 + 1, u * 2); } }

class Done implements Scene {
  again: Rect; home: Rect; t = 0;
  constructor(public game: Game) {}
  enter() { sfx.applause(); say("x_done"); burst(D.W / 2, D.H * 0.35, 20); }
  layout() { const s = Math.max(MIN * 1.4, Math.min(D.W, D.H) * 0.22); this.again = { x: D.W / 2 - s - D.U * 4, y: D.H * 0.62, w: s, h: s }; this.home = { x: D.W / 2 + D.U * 4, y: D.H * 0.62, w: s, h: s }; }
  update(dt: number) { this.t += dt; }
  draw() {
    R(0, 0, D.W, D.H, C.bg); const s = Math.min(D.W, D.H);
    const b = Math.sin(Math.min(1, this.t * 1.5) * Math.PI) * D.U * 4;
    star(D.W / 2, D.H * 0.33 - b, s * 0.16, C.yellow);
    star(D.W / 2 - s * 0.26, D.H * 0.38, s * 0.08, C.pink); star(D.W / 2 + s * 0.26, D.H * 0.38, s * 0.08, C.lav);
    const a = this.again, h = this.home;
    iconBtn(a, C.green, () => { // replay arrow
      const u = Math.max(3, a.w / 14), cx = a.x + a.w / 2, cy = a.y + a.h / 2;
      for (let i = 0; i < 28; i++) { const t = i / 28 * Math.PI * 1.6 + 0.5; R(cx + Math.cos(t) * a.w * 0.26 - u, cy + Math.sin(t) * a.w * 0.26 - u, u * 2, u * 2, C.white); }
      R(cx + a.w * 0.12, cy - a.w * 0.3, u * 4, u * 2, C.white); R(cx + a.w * 0.2, cy - a.w * 0.3, u * 2, u * 4, C.white);
    });
    iconBtn(h, C.cream, () => homeIcon(h.x + h.w * 0.12, h.y + h.h * 0.1, h.w * 0.76));
    if (S.rain) drizzle();
  }
  down(p: Pt) {
    if (hit(p, this.again)) { sfx.tap(); go(this.game); }
    else if (hit(p, this.home)) { sfx.tap(); goHome(); }
  }
}
