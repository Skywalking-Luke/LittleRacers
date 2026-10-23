import { sfx, say, unlock, stopVoice, cue } from "./audio";
import { vs } from "./vsfx";
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

// ---------- storybook sketch helpers (seeded jitter: stable, no flicker) ----------
let S0 = 1;
export const rand = () => { S0 = (S0 * 16807) % 2147483647; return S0 / 2147483647; };
export function seed(a: number, b = 0, c = 0) { S0 = (Math.abs(((Math.round(a) * 73856093) ^ (Math.round(b) * 19349663) ^ (Math.round(c) * 83492791)) | 0) % 2147483646) + 1; }
type Pts = [number, number][];
export function smooth(pts: Pts) {
  const n = pts.length; g.beginPath(); g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
  g.closePath();
}
function seg(pts: Pts, a: [number, number], b: [number, number], k: number) { for (let i = 0; i < k; i++) pts.push([a[0] + ((b[0] - a[0]) * i) / k, a[1] + ((b[1] - a[1]) * i) / k]); }
export function rrPts(x: number, y: number, w: number, h: number, r: number): Pts {
  r = Math.max(0.5, Math.min(r, w / 2, h / 2)); const pts: Pts = [];
  const cs: [number, number, number][] = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (let c = 0; c < 4; c++) { const [cx, cy, a0] = cs[c]; for (let i = 0; i <= 2; i++) { const a = a0 + (i * Math.PI) / 4; pts.push([cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 1.08]); }
    const [nx, ny, na] = cs[(c + 1) % 4], e1: [number, number] = [cx + Math.cos(a0 + Math.PI / 2) * r, cy + Math.sin(a0 + Math.PI / 2) * r], e2: [number, number] = [nx + Math.cos(na) * r, ny + Math.sin(na) * r];
    const L = Math.hypot(e2[0] - e1[0], e2[1] - e1[1]); if (L > r * 0.5) { const k = Math.max(1, Math.min(4, Math.round(L / Math.max(8, r * 2)))); seg(pts, e1, e2, k); pts.push(e2); } }
  return pts;
}
export function elPts(cx: number, cy: number, rx: number, ry: number, n = 16): Pts { const p: Pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; p.push([cx + Math.cos(a) * rx * 1.04, cy + Math.sin(a) * ry * 1.04]); } return p; }
export function polyPts(v: Pts, k = 2): Pts { const p: Pts = []; for (let i = 0; i < v.length; i++) seg(p, v[i], v[(i + 1) % v.length], k); return p; }
const hexRe = /^#([0-9a-f]{6})$/i;
export function mix(c: string, t: string, f: number) { const a = hexRe.exec(c), b = hexRe.exec(t); if (!a || !b) return c; const x = parseInt(a[1], 16), y = parseInt(b[1], 16); const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - f) + ((y >> s) & 255) * f); return "#" + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1); }
export function grad(c: string, y0: number, y1: number): string | CanvasGradient { if (!hexRe.test(c) || y1 - y0 < 6) return c; const gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, mix(c, "#FFFFFF", 0.32)); gr.addColorStop(0.55, c); gr.addColorStop(1, mix(c, "#5a4a40", 0.12)); return gr; }
/** fill a shape softly and outline it with 2 seeded, wobbly pencil passes */
export function sk(pts: Pts, fill: string | null, lw = D.U * 0.7, ink = C.k, gradient = true) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  if (fill) { g.fillStyle = gradient ? grad(fill, y0, y1) : fill; smooth(pts); g.fill(); }
  if (lw > 0) {
    seed(x1 - x0, y1 - y0, pts.length); g.strokeStyle = ink; g.lineJoin = "round"; g.lineCap = "round"; const j = Math.max(0.8, lw * 0.75), a0 = g.globalAlpha;
    for (let p = 0; p < 2; p++) { const jj = j * (p ? 1.5 : 1), q: Pts = pts.map(([x, y]) => [x + (rand() - 0.5) * jj, y + (rand() - 0.5) * jj]); g.lineWidth = p ? lw * 0.5 : lw; g.globalAlpha = a0 * (p ? 0.45 : 0.9); smooth(q); g.stroke(); }
    g.globalAlpha = a0;
  }
}
/** wobbly open pencil line through points */
export function skLine(pts: Pts, lw = D.U * 0.7, ink = C.k) {
  seed(pts.length, pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]); g.strokeStyle = ink; g.lineCap = "round"; g.lineJoin = "round"; const a0 = g.globalAlpha;
  for (let p = 0; p < 2; p++) { const jj = Math.max(0.6, lw * 0.6) * (p ? 1.5 : 1); g.lineWidth = p ? lw * 0.5 : lw; g.globalAlpha = a0 * (p ? 0.45 : 0.9); g.beginPath();
    pts.forEach(([x, y], i) => { const X = x + (rand() - 0.5) * jj, Y = y + (rand() - 0.5) * jj; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); }
  g.globalAlpha = a0;
}
export function heart(cx: number, cy: number, s: number, c: string) {
  g.fillStyle = c; g.beginPath(); g.moveTo(cx, cy + s * 0.9); g.bezierCurveTo(cx - s * 1.3, cy, cx - s * 0.9, cy - s * 1.0, cx, cy - s * 0.35); g.bezierCurveTo(cx + s * 0.9, cy - s * 1.0, cx + s * 1.3, cy, cx, cy + s * 0.9); g.fill();
  g.strokeStyle = C.k; g.globalAlpha *= 0.6; g.lineWidth = Math.max(1, s * 0.12); g.stroke(); g.globalAlpha /= 0.6;
}

/** soft rounded rectangle fill (full-screen fills stay square) */
export function R(x: number, y: number, w: number, h: number, c: string) {
  g.fillStyle = c; if (w <= 0 || h <= 0) return; const m = Math.min(w, h);
  if (w >= D.W * 0.9 || h >= D.H * 0.9 || m < 2 || !(g as any).roundRect) { g.fillRect(x, y, w, h); return; }
  g.beginPath(); (g as any).roundRect(x, y, w, h, Math.min(m * 0.35, D.U * 3)); g.fill();
}
/** soft circle; ink-coloured circles (outline underlays) get a wobbly pencil edge */
export function pcirc(cx: number, cy: number, r: number, c: string, u = D.U) {
  if (r <= 0) return;
  if (c === C.k && r > u * 2) { sk(elPts(cx, cy, r - u * 0.35, r - u * 0.35, Math.max(10, Math.min(22, Math.round(r / u) * 2))), c, Math.max(1.2, u * 0.7)); return; }
  g.fillStyle = c; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
}
/** soft triangle, apex up, (x,y) top-left of bounding box */
export function ptri(x: number, y: number, w: number, h: number, c: string, u = D.U) {
  const pts = polyPts([[x + w / 2, y], [x + w, y + h], [x, y + h]], 2);
  if (c === C.k) sk(pts, c, Math.max(1.2, u * 0.7)); else { g.fillStyle = grad(c, y, y + h); smooth(pts); g.fill(); }
}
export function box(x: number, y: number, w: number, h: number, c: string, u = D.U, edge = C.k) {
  sk(rrPts(x, y, w, h, Math.min(w, h) * 0.2), c, Math.max(1.5, u * 0.7), edge);
}
export function txt(s: string, x: number, y: number, size: number, c = C.white, align: CanvasTextAlign = "center", outline = true) {
  size *= 1.25; g.font = `600 ${Math.round(size)}px Fredoka, "Baloo 2", "Trebuchet MS", sans-serif`; g.textAlign = align; g.textBaseline = "middle";
  if (outline) { g.strokeStyle = C.k; g.lineJoin = "round"; g.lineWidth = Math.max(3, size / 5); g.strokeText(s, x, y); }
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
  if (parts.length > 24) return; // calm: no sparkle pile-ups from fast tapping
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rnd(60, 180); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, c: PAL[i % PAL.length], life: rnd(1, 1.8), s: D.U * (stars && i % 4 == 0 ? 3 : 2), star: stars && i % 4 == 0 }); }
}
export function rain(n = 6) { for (let i = 0; i < n; i++) parts.push({ x: rnd(0, D.W), y: -10, vx: rnd(-40, 40), vy: rnd(80, 200), c: PAL[ri(0, 7)], life: 4, s: D.U * 2 }); }
export function bubbles(x: number, y: number, n = 3, c = "rgba(255,255,255,.9)") { for (let i = 0; i < n; i++) parts.push({ x: x + rnd(-20, 20), y: y + rnd(-20, 20), vx: rnd(-30, 30), vy: rnd(-90, -30), c, life: rnd(0.5, 1), s: D.U * ri(1, 3) }); }
export function stepParts(dt: number) {
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt; p.vx *= 0.99; if (p.life <= 0 || p.y > D.H + 40) parts.splice(i, 1); }
}
export function drawParts() { for (const p of parts) { if (p.star) star(p.x, p.y, p.s * 1.4, p.c); else { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s * 0.6, 0, Math.PI * 2); g.fill(); } } }
export const HOOK: { star: ((cx: number, cy: number, r: number, c: string) => boolean) | null } = { star: null };
export function star(cx: number, cy: number, r: number, c: string, edge = true) {
  if (HOOK.star && HOOK.star(cx, cy, r, c)) return;
  const path = () => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.48 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath(); };
  path(); if (edge) { g.lineWidth = Math.max(3, r / 5); g.strokeStyle = C.k; g.lineJoin = "round"; g.stroke(); }
  g.fillStyle = c; g.fill();
}

// ---------- scenes ----------
export interface Scene {
  enter?(): void; layout?(): void; update?(dt: number): void; draw(): void;
  down?(p: Pt): void; move?(p: Pt): void; up?(p: Pt): void; leave?(): void;
}
export type Pt = { x: number; y: number; id: number };
export let scene: Scene;
export const LOCK = { on: false };
export function go(s: Scene) { if (LOCK.on && !(s as any).isRest) return; if (scene && scene.leave) scene.leave(); stopVoice(); vs.stopAll(); scene = s; if (s.enter) s.enter(); if (s.layout) s.layout(); }

export function resize() {
  D.dpr = Math.min(2, window.devicePixelRatio || 1);
  D.W = window.innerWidth; D.H = window.innerHeight;
  cv.width = Math.round(D.W * D.dpr); cv.height = Math.round(D.H * D.dpr);
  cv.style.width = D.W + "px"; cv.style.height = D.H + "px";
  g.setTransform(D.dpr, 0, 0, D.dpr, 0, 0); g.imageSmoothingEnabled = true;
  D.U = Math.max(3, Math.floor(Math.min(D.W, D.H) / 110));
  if (scene && scene.layout) scene.layout();
}
let active = -1;
function pt(e: PointerEvent): Pt { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, id: e.pointerId }; }
// calm input rules: one finger only; a second finger, a resting palm (big touch radius) or a tap on the very screen edge is ignored
const fingers = new Set<number>(); let multi = false, lastPt: Pt | null = null;
export const input = { last: 0, down: () => active !== -1 };
cv.addEventListener("pointerdown", (e) => {
  e.preventDefault(); unlock(); input.last = performance.now();
  if (e.pointerType === "touch") { fingers.add(e.pointerId); if (fingers.size > 1) { multi = true; if (active !== -1) { const a = active; active = -1; scene.up && scene.up(lastPt || pt(e)); void a; } return; } }
  if (multi) return;
  if (active !== -1 && active !== e.pointerId) return; // one finger at a time
  const p = pt(e), M = 10;
  if (e.pointerType === "touch" && Math.max(e.width || 0, e.height || 0) > 90) return; // palm
  if (p.x < M || p.y < M || p.x > D.W - M || p.y > D.H - M) return; // screen edge
  active = e.pointerId; lastPt = p; try { cv.setPointerCapture(e.pointerId); } catch (x) {}
  scene.down && scene.down(p);
});
// Berliku-style tracing asks for every coalesced sample so fast fingers don't skip
cv.addEventListener("pointermove", (e) => { if (e.pointerId === active && !multi) { e.preventDefault(); input.last = performance.now(); const sc: any = scene; const list = sc.coalesce && (e as any).getCoalescedEvents ? (e as any).getCoalescedEvents() : null; if (list && list.length) for (const c of list) { lastPt = pt(c); scene.move && scene.move(lastPt); } else { lastPt = pt(e); scene.move && scene.move(lastPt); } } });
const end = (e: PointerEvent) => { unlock(); input.last = performance.now(); fingers.delete(e.pointerId); if (!fingers.size) multi = false; if (e.pointerId === active) { active = -1; scene.up && scene.up(pt(e)); } };
cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
document.addEventListener("contextmenu", (e) => e.preventDefault());
for (const ev of ["gesturestart", "gesturechange", "gestureend", "dblclick"]) document.addEventListener(ev, (e) => e.preventDefault());
document.addEventListener("selectstart", (e) => { if (!(e.target as HTMLElement)?.closest?.("input,textarea")) e.preventDefault(); });
document.addEventListener("touchmove", (e) => { if ((e as TouchEvent).touches.length > 1 || (e.target as HTMLElement) === cv) e.preventDefault(); }, { passive: false });
document.addEventListener("touchstart", (e) => { if ((e as TouchEvent).touches.length > 1) e.preventDefault(); }, { passive: false });
export const TICK: { fn: ((dt: number) => void) | null } = { fn: null };

let last = performance.now();
export function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; D.t += dt;
  if (TICK.fn) TICK.fn(dt);
  if (scene.update) scene.update(dt);
  stepParts(dt);
  g.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
  try { scene.draw(); drawParts(); drawCue(now); } catch (e) { console.error(e); } // one bad frame (e.g. an image still loading) must never freeze the canvas
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
  heart(cx, cy + k * 0.5, k * 3.2, "#E07A8A");
  g.restore();
}
