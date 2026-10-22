import { sfx, say, unlock, stopVoice, cue } from "./audio";
export const cv = document.getElementById("c") as HTMLCanvasElement;
export const g = cv.getContext("2d")!;
export const D = { W: 0, H: 0, U: 4, t: 0, dpr: 1 };
export const MIN = 64;
export const C = {
  k: "#4A4A48", bg: "#FAF6EE", sky: "#BFDDEB", sky2: "#DCECF2", grass: "#B9D3A8", grass2: "#A6C495", road: "#C9C3B8", line: "#FFFFFF",
  red: "#D98E82", yellow: "#E8C872", blue: "#8FB4D9", green: "#7FB7B0", lav: "#B7A9D6", orange: "#E8AE7E", pink: "#E8B4C4", purple: "#B7A9D6",
  white: "#FFFFFF", win: "#DDEFF5", grey: "#D8D4CC", dark: "#7a7670", cream: "#FAF6EE", brown: "#B08A68", palm: "#8DB07A",
};
export const COLS: Record<string, string> = { red: C.red, yellow: C.yellow, blue: C.blue, green: C.green };

export function R(x: number, y: number, w: number, h: number, c: string) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
/** pixel circle made of u-sized blocks */
export function pcirc(cx: number, cy: number, r: number, c: string, u = D.U) {
  g.fillStyle = c; const n = Math.ceil(r / u);
  for (let j = -n; j < n; j++) for (let i = -n; i < n; i++) {
    const dx = (i + 0.5) * u, dy = (j + 0.5) * u;
    if (dx * dx + dy * dy <= r * r) g.fillRect(Math.round(cx + i * u), Math.round(cy + j * u), u, u);
  }
}
/** pixel triangle, apex up, (x,y) top-left of bounding box */
export function ptri(x: number, y: number, w: number, h: number, c: string, u = D.U) {
  g.fillStyle = c; const rows = Math.max(1, Math.round(h / u));
  for (let r = 0; r < rows; r++) { const ww = Math.max(u, Math.round(((r + 1) / rows) * w / u) * u); g.fillRect(Math.round(x + (w - ww) / 2), Math.round(y + r * u), ww, u); }
}
export function box(x: number, y: number, w: number, h: number, c: string, u = D.U, edge = C.k) {
  R(x, y, w, h, edge); R(x + u, y + u, w - 2 * u, h - 2 * u, c);
  R(x + u, y + u, w - 2 * u, u, "rgba(255,255,255,.35)"); R(x + u, y + h - 2 * u, w - 2 * u, u, "rgba(0,0,0,.15)");
}
export function txt(s: string, x: number, y: number, size: number, c = C.white, align: CanvasTextAlign = "center", outline = true) {
  g.font = `${Math.round(size)}px PS2P, monospace`; g.textAlign = align; g.textBaseline = "middle";
  if (outline) { g.fillStyle = C.k; const o = Math.max(2, size / 8); for (const [a, b] of [[-o, 0], [o, 0], [0, -o], [0, o], [o, o]]) g.fillText(s, x + a, y + b); }
  g.fillStyle = c; g.fillText(s, x, y);
}
export type Rect = { x: number; y: number; w: number; h: number };
export const hit = (p: { x: number; y: number }, r: Rect, pad = 0) => p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad;
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const ri = (a: number, b: number) => Math.floor(rnd(a, b + 1));
export function shuffle<T>(a: T[]): T[] { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export const wig = (w: number) => (w > 0 ? Math.sin(D.t * 18) * w * 8 : 0);

// ---------- particles ----------
type P = { x: number; y: number; vx: number; vy: number; c: string; life: number; s: number; star?: boolean };
const parts: P[] = [];
const PAL = [C.yellow, C.white, C.pink, C.lav, C.yellow];
export function burst(x: number, y: number, n = 14, stars = true) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rnd(60, 180); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, c: PAL[i % PAL.length], life: rnd(1, 1.8), s: D.U * (stars && i % 4 == 0 ? 3 : 2), star: stars && i % 4 == 0 }); }
}
export function rain(n = 6) { for (let i = 0; i < n; i++) parts.push({ x: rnd(0, D.W), y: -10, vx: rnd(-40, 40), vy: rnd(80, 200), c: PAL[ri(0, 7)], life: 4, s: D.U * 2 }); }
export function bubbles(x: number, y: number, n = 3, c = "rgba(255,255,255,.9)") { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-20, 20), y: y + rnd(-20, 20), vx: rnd(-30, 30), vy: rnd(-90, -30), c, life: rnd(0.5, 1), s: D.U * ri(1, 3) }); }
export function stepParts(dt: number) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.vx *= 0.99; if (p.life <= 0 || p.y > D.H + 40) parts.splice(i, 1); }
}
export function drawParts() { for (const p of parts) { if (p.star) star(p.x, p.y, p.s * 1.4, p.c); else R(p.x, p.y, p.s, p.s, p.c); } }
export function star(cx: number, cy: number, r: number, c: string, edge = true) {
  const path = () => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); };
  path(); if (edge) { g.lineWidth = Math.max(3, r / 5); g.strokeStyle = C.k; g.lineJoin = "miter"; g.stroke(); }
  g.fillStyle = c; g.fill();
}

// ---------- scenes ----------
export interface Scene {
  enter?(): void; layout?(): void; update?(dt: number): void; draw(): void;
  down?(p: Pt): void; move?(p: Pt): void; up?(p: Pt): void; leave?(): void;
}
export type Pt = { x: number; y: number; id: number };
export let scene: Scene;
export function go(s: Scene) { if (scene && scene.leave) scene.leave(); stopVoice(); scene = s; if (s.enter) s.enter(); if (s.layout) s.layout(); }

export function resize() {
  D.dpr = Math.min(2, window.devicePixelRatio || 1);
  D.W = window.innerWidth; D.H = window.innerHeight;
  cv.width = Math.round(D.W * D.dpr); cv.height = Math.round(D.H * D.dpr);
  cv.style.width = D.W + "px"; cv.style.height = D.H + "px";
  g.setTransform(D.dpr, 0, 0, D.dpr, 0, 0); g.imageSmoothingEnabled = false;
  D.U = Math.max(3, Math.floor(Math.min(D.W, D.H) / 110));
  if (scene && scene.layout) scene.layout();
}
let active = -1;
function pt(e: PointerEvent): Pt { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId }; }
cv.addEventListener("pointerdown", (e) => {
  e.preventDefault(); unlock();
  if (active !== -1 && active !== e.pointerId) return; // one finger at a time
  active = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  scene.down && scene.down(pt(e));
});
cv.addEventListener("pointermove", (e) => { if (e.pointerId === active) { e.preventDefault(); scene.move && scene.move(pt(e)); } });
const end = (e: PointerEvent) => { if (e.pointerId === active) { active = -1; scene.up && scene.up(pt(e)); } };
cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault());

let last = performance.now();
export function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; D.t += dt;
  if (scene.update) scene.update(dt);
  stepParts(dt);
  g.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
  scene.draw(); drawParts(); drawCue(now);
  requestAnimationFrame(loop);
}
export function fullscreen() {
  const d: any = document.documentElement;
  if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen().then(() => { try { (screen.orientation as any).unlock && (screen.orientation as any).unlock(); } catch (e) {} }).catch(() => {});
}
export { sfx, say };
export const cur = () => scene;

// family mode: silent "look here" cue for lines Luke hasn't recorded (gentle pulsing heart, top centre)
function drawCue(now: number) {
  if (now > cue.until) return;
  const p = (now - cue.start) / (cue.until - cue.start), a = Math.sin(Math.PI * Math.min(1, p)), k = Math.max(3, Math.min(D.W, D.H) / 90) * (1 + 0.12 * Math.sin(now / 160));
  const cx = D.W / 2, cy = Math.max(k * 12, D.H * 0.15);
  g.save(); g.globalAlpha = 0.85 * a;
  g.fillStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.arc(cx, cy + k * 0.5, k * 5.5, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#E07A8A";
  for (const [x, y, w] of [[-2, 0, 2], [1, 0, 2], [-3, 1, 7], [-3, 2, 7], [-2, 3, 5], [-1, 4, 3], [0, 5, 1]]) g.fillRect(cx + (x - 0.5) * k, cy + (y - 2.5) * k, w * k, k);
  g.restore();
}
