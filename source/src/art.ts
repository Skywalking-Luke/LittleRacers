import { HOOK, g, D, C, R, pcirc, ptri, box, txt, star, sk, skLine, rrPts, elPts, polyPts, grad, mix, seed, rand } from "./core";
import SZ from "./artsizes.json";
export const VW: Record<string, [number, number]> = {
  car: [18, 11], taxi: [18, 12], bus: [28, 15], lorry: [28, 14], fire: [28, 14], amb: [22, 13],
  tow: [26, 13], jeep: [18, 13], train: [40, 13], police: [18, 12], moto: [14, 11], van: [22, 13], build: [24, 12],
};
const IW: Record<string, number> = { car: 18, van: 21, lorry: 25, bus: 32, moto: 15, fire: 26, amb: 22, tow: 26, taxi: 18 };
for (const k in IW) if (!(SZ as any)[k]) delete IW[k];
VW.build = [24, +(24 * (SZ as any).car[1] / (SZ as any).car[0]).toFixed(1)];
for (const k in IW) { const z = (SZ as any)[k]; VW[k] = [IW[k], +(IW[k] * z[1] / z[0]).toFixed(1)]; }
/** Sylphy's painted vehicles (self-hosted WebP, mirrored to face right). recoloured per colour on demand. */
const IMG: Record<string, HTMLImageElement> = {}, TINT: Record<string, HTMLCanvasElement> = {}, BASEHUE: Record<string, number> = {};
const rgb2hsl = (r: number, g2: number, b: number) => { r /= 255; g2 /= 255; b /= 255; const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s2 = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g2 - b) / d + (g2 < b ? 6 : 0) : mx === g2 ? (b - r) / d + 2 : (r - g2) / d + 4; return [h * 60, s2, l]; };
const hsl2rgb = (h: number, s2: number, l: number) => { const k = (n: number) => (n + h / 30) % 12, a2 = s2 * Math.min(l, 1 - l), f = (n: number) => l - a2 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return [f(0) * 255, f(8) * 255, f(4) * 255]; };
let onArt: (() => void) | null = null; export function whenArt(f: () => void) { onArt = f; }
const PARTS = ["car_body", "car_roof", "car_w0", "car_w1", "car_w2", "wheel"];
for (const k of PARTS) { const im = new Image(); im.onload = () => { IMG[k] = im; onArt && onArt(); }; im.src = "/LittleRacers/art/" + k + ".webp"; }
import AL from "./artlist.json";
for (const k in AL as any) { const im = new Image(); im.onload = () => { IMG[k] = im; onArt && onArt(); }; im.src = "/LittleRacers/art/" + k + ".webp"; }
/** a painted asset by name if it has loaded (else null -> caller falls back to code drawing) */
export const pic = (k: string): HTMLImageElement | null => IMG[k] || null;
/** draw an opaque painted background covering the screen (centre-cropped) */
export function cover(k: string) { const im = IMG[k]; if (!im) return false; const s = Math.max(D.W / im.naturalWidth, D.H / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; g.drawImage(im, (D.W - w) / 2, (D.H - h) / 2, w, h); return true; }
/** bottom-centred painted prop of height h (px) standing on gy */
/** like prop() but never wider than maxW */
export function propFit(k: string, cx: number, gy: number, h: number, maxW: number) { const im = IMG[k]; if (!im) return false; const a = im.naturalWidth / im.naturalHeight; return prop(k, cx, gy, Math.min(h, maxW / a)); }
export function prop(k: string, cx: number, gy: number, h: number) { const im = IMG[k]; if (!im) return false; const w = h * im.naturalWidth / im.naturalHeight; g.drawImage(im, cx - w / 2, gy - h, w, h); return true; }
/** painted asset fitted (contain) into a box, centred */
export function fitPic(k: string, x: number, y: number, w: number, h: number, src?: CanvasImageSource) { const im = IMG[k]; if (!im) return false; const a = im.naturalWidth / im.naturalHeight, ww = Math.min(w, h * a), hh = ww / a; g.drawImage(src || im, x + (w - ww) / 2, y + (h - hh) / 2, ww, hh); return true; }
const MUL: Record<string, HTMLCanvasElement> = {};
/** neutral cream asset recoloured by multiply, alpha kept */
export function tmul(k: string, col: string): CanvasImageSource { const im = IMG[k], key = k + col; if (MUL[key]) return MUL[key]; const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d")!; x.drawImage(im, 0, 0); x.globalCompositeOperation = "multiply"; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = "destination-in"; x.drawImage(im, 0, 0); return (MUL[key] = c); }
// painted star for the warm yellow stars (score, rewards, bedtime count); other colours keep the code star
HOOK.star = (cx, cy, r, c) => { const im = IMG.star; if (!im || !/^(#F2D894|#E8C25A|#F6DE8A)$/i.test(c) && c !== C.yellow) return false; g.drawImage(im, cx - r * 1.15, cy - r * 1.15, r * 2.3, r * 2.3); return true; };
/** screen y of a fraction f of a cover()-drawn background's height (null if not loaded) */
export function coverY(k: string, f: number) { const im = IMG[k]; if (!im) return null; const s = Math.max(D.W / im.naturalWidth, D.H / im.naturalHeight), h = im.naturalHeight * s; return (D.H - h) / 2 + f * h; }
const BED: Record<string, [string, number]> = { jeep: ["bedtime-jeep", 20], bus: ["bedtime-bus", 32], lorry: ["bedtime-lorry", 25], train: ["bedtime-train", 44], moto: ["bedtime-motorbike", 15] };
export function wheelIcon(cx: number, cy: number, r: number) { if (IMG.wheel) g.drawImage(IMG.wheel, cx - r, cy - r, 2 * r, 2 * r); return !!IMG.wheel; }
for (const k in IW) { const im = new Image(); im.onload = () => { IMG[k] = im; onArt && onArt(); }; im.src = "/LittleRacers/art/" + k + ".webp"; }
function tinted(k: string, col: string): CanvasImageSource {
  const im = IMG[k], key = k + col; if (TINT[key]) return TINT[key];
  const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d")!; x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
  if (BASEHUE[k] === undefined) { const hist = new Array(36).fill(0); for (let i = 0; i < p.length; i += 16) { if (p[i + 3] < 200) continue; const [h, s2, l] = rgb2hsl(p[i], p[i + 1], p[i + 2]); if (s2 > 0.3 && l > 0.25 && l < 0.85) hist[Math.floor(h / 10) % 36]++; } BASEHUE[k] = hist.indexOf(Math.max(...hist)) * 10 + 5; }
  const t = /^#([0-9a-f]{6})$/i.exec(col); if (!t) return (TINT[key] = c);
  const n = parseInt(t[1], 16), [th, ts, tl] = rgb2hsl((n >> 16) & 255, (n >> 8) & 255, n & 255), bh = BASEHUE[k];
  for (let i = 0; i < p.length; i += 4) { if (p[i + 3] < 10) continue; const [h, s2, l] = rgb2hsl(p[i], p[i + 1], p[i + 2]); let dh = Math.abs(h - bh); dh = Math.min(dh, 360 - dh); if (dh > 28 || s2 < 0.22) continue;
    const [r, g2, b] = hsl2rgb(th, Math.min(1, ts * (0.6 + s2 * 0.6)), Math.max(0, Math.min(1, l + (tl - 0.62) * 0.8))); p[i] = r; p[i + 1] = g2; p[i + 2] = b; }
  x.putImageData(d, 0, 0); return (TINT[key] = c);
}
export type VOpt = { flip?: boolean; lights?: boolean; flash?: boolean; body?: boolean; wheels?: number; roof?: boolean; ghost?: boolean };
/** bedtime sets this so vehicles get sleepy half-closed eyes */
export const ART = { sleepy: false, bed: false };
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
/** one friendly eye: white, big pupil looking forward, slow blink */
export function eye(x: number, y: number, r: number, ph = 0) {
  const lw = Math.max(1, r * 0.22), blink = ((D.t + ph) % 6) < 0.16;
  if (ART.sleepy || blink) { g.strokeStyle = C.k; g.lineWidth = lw * 1.1; g.lineCap = "round"; g.beginPath(); g.arc(x, y - r * 0.2, r * 0.8, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); if (ART.sleepy) { g.beginPath(); g.moveTo(x - r * 0.9, y + r * 0.05); g.lineTo(x + r * 0.9, y + r * 0.05); g.stroke(); } return; }
  g.fillStyle = "#FFFFFF"; g.beginPath(); g.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = C.k; g.lineWidth = lw; g.stroke();
  g.fillStyle = "#3b3633"; g.beginPath(); g.arc(x + r * 0.22, y + r * 0.12, r * 0.52, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(x + r * 0.38, y - r * 0.08, r * 0.18, 0, Math.PI * 2); g.fill();
}
/** draw a vehicle standing on ground y=gy, centred on cx, unit size u. smooth storybook style with eyes on the windscreen */
export function veh(kind: string, cx: number, gy: number, u: number, col: string, o: VOpt = {}) {
  const [w, h] = VW[kind] || VW.car;
  g.save();
  if (o.flip) { g.translate(cx * 2, 0); g.scale(-1, 1); }
  if (o.ghost) g.globalAlpha = 0.25;
  const x0 = cx - (w * u) / 2, y0 = gy - h * u, lw = Math.max(1.2, u * 0.55), ph = (hash(kind + col) % 50) / 10;
  const X = (i: number) => x0 + i * u, Y = (i: number) => y0 + i * u;
  const B = (ix: number, iy: number, ww: number, hh: number, c: string, r = 2) => sk(rrPts(X(ix), Y(iy), ww * u, hh * u, r * u), c, lw);
  const Win = (ix: number, iy: number, ww: number, hh: number) => { B(ix, iy, ww, hh, C.win, 1); g.strokeStyle = "rgba(255,255,255,.8)"; g.lineWidth = Math.max(1, u * 0.35); g.lineCap = "round"; g.beginPath(); g.moveTo(X(ix + ww * 0.25), Y(iy + hh * 0.75)); g.lineTo(X(ix + ww * 0.5), Y(iy + hh * 0.25)); g.stroke(); };
  const W = (ix: number, iy: number, r = 2.2) => { sk(elPts(X(ix), Y(iy), r * u, r * u, 14), "#55514d", lw, C.k, false); g.fillStyle = "#EDE6D6"; g.beginPath(); g.arc(X(ix), Y(iy), r * u * 0.45, 0, 7); g.fill(); g.fillStyle = "#B9B2A4"; g.beginPath(); g.arc(X(ix), Y(iy), r * u * 0.15, 0, 7); g.fill(); };
  const E = (ix: number, iy: number, s = 0.9) => { eye(X(ix), Y(iy), s * u, ph); eye(X(ix + s * 2.1), Y(iy), s * u, ph); };
  const smile = (ix: number, iy: number, ww = 1.6) => { g.strokeStyle = C.k; g.lineWidth = lw; g.lineCap = "round"; g.beginPath(); g.arc(X(ix), Y(iy) - ww * u * 0.5, ww * u * 0.6, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); };
  const lamp = (ix: number, iy: number) => {
    if (o.lights) { const gr = g.createRadialGradient(X(ix), Y(iy), u, X(ix + 4), Y(iy), u * 7); gr.addColorStop(0, "rgba(255,240,160,.7)"); gr.addColorStop(1, "rgba(255,240,160,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(X(ix), Y(iy)); g.lineTo(X(ix + 8), Y(iy - 3)); g.lineTo(X(ix + 8), Y(iy + 3)); g.closePath(); g.fill(); }
    sk(elPts(X(ix), Y(iy), u * 0.75, u * 0.75, 10), "#F6DE8A", lw * 0.7, C.k, false);
  };
  const tail = (ix: number, iy: number) => { g.fillStyle = "#F09A92"; g.beginPath(); g.ellipse(X(ix), Y(iy), u * 0.45, u * 0.7, 0, 0, 7); g.fill(); };
  const siren = (ix: number, iy: number) => { B(ix, iy, 4.2, 1.7, "#F6F1E6", 0.8); const on = o.flash ? Math.sin(D.t * 4) > 0 : true; g.fillStyle = on ? "#E58C8C" : "#b88"; g.beginPath(); g.arc(X(ix + 1.1), Y(iy + 0.85), u * 0.6, 0, 7); g.fill(); g.fillStyle = on ? "#8DB3E2" : "#89a"; g.beginPath(); g.arc(X(ix + 3.1), Y(iy + 0.85), u * 0.6, 0, 7); g.fill(); };
  // soft ground shadow
  g.fillStyle = "rgba(60,50,40,.13)"; g.beginPath(); g.ellipse(cx, gy + u * 0.2, w * u * 0.5, u * 1.1, 0, 0, 7); g.fill();
  if ((ART.bed || kind === "jeep" || kind === "train") && BED[kind] && IMG[BED[kind][0]]) {
    const im = IMG[BED[kind][0]], bw = BED[kind][1] * u, bh = bw * im.naturalHeight / im.naturalWidth;
    g.drawImage(im, cx - bw / 2, gy - bh, bw, bh);
    if (o.lights) { const lx = cx + bw * 0.48, ly = gy - bh * 0.35, gr = g.createRadialGradient(lx, ly, u, lx + 4 * u, ly, u * 8); gr.addColorStop(0, "rgba(255,240,160,.6)"); gr.addColorStop(1, "rgba(255,240,160,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 9 * u, ly - 3 * u); g.lineTo(lx + 9 * u, ly + 3 * u); g.closePath(); g.fill(); }
    g.restore(); return { w: bw, h: bh };
  }
  if (IMG[kind] && IW[kind]) {
    g.drawImage(["fire", "amb", "tow", "taxi"].includes(kind) ? IMG[kind] : tinted(kind, col), x0, y0, w * u, h * u);
    if (o.lights) { const lx = x0 + w * u * 0.97, ly = y0 + h * u * 0.62, gr = g.createRadialGradient(lx, ly, u, lx + 4 * u, ly, u * 8); gr.addColorStop(0, "rgba(255,240,160,.7)"); gr.addColorStop(1, "rgba(255,240,160,0)"); g.fillStyle = gr; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 9 * u, ly - 3 * u); g.lineTo(lx + 9 * u, ly + 3 * u); g.closePath(); g.fill(); }
    g.restore(); return { w: w * u, h: h * u };
  }
  switch (kind) {
    case "car": case "taxi": case "police": {
      const top = kind === "car" ? 0 : 1;
      if (kind === "taxi") B(7.2, 0, 3.6, 1.8, C.yellow, 0.7);
      if (kind === "police") siren(7, -0.2);
      B(3, top + 0.2, 12, 6.5, col, 3.2); Win(4.6, top + 1.4, 4, 3.4); Win(9.4, top + 1.4, 4.4, 3.4);
      B(0, top + 4, 18, 5.6, col, 2.6); g.strokeStyle = "rgba(255,255,255,.45)"; g.lineWidth = Math.max(1, u * 0.4); g.beginPath(); g.moveTo(X(2), Y(top + 5)); g.lineTo(X(15), Y(top + 5)); g.stroke();
      if (kind === "police") R(X(1), Y(top + 6.6), 16 * u, u * 0.9, C.blue);
      if (kind === "taxi") for (let i = 0; i < 8; i++) R(X(1.5 + i * 2), Y(top + 6.7), u, u * 0.8, i % 2 ? C.k : C.white);
      E(10.4, top + 3, 0.85); lamp(16.9, top + 5.7); tail(0.6, top + 5.7); smile(15, top + 7.6, 1.6);
      W(4.5, top + 9); W(13.5, top + 9); break;
    }
    case "jeep": B(3, 0, 11, 6.5, col, 1.6); Win(4.6, 1.2, 3.8, 3.6); Win(9.2, 1.2, 4, 3.6); sk(elPts(X(0.5), Y(7.6), 2 * u, 2.2 * u, 12), "#55514d", lw, C.k, false);
      B(0, 5, 18, 6.4, col, 1.8); B(2, 8.6, 5, 1.6, mix(col, "#4A4A48", 0.25), 0.8); B(11, 8.6, 5, 1.6, mix(col, "#4A4A48", 0.25), 0.8);
      E(10, 2.9, 0.85); lamp(16.8, 6.8); smile(15, 9, 1.4); W(4.5, 11); W(13.5, 11); break;
    case "train": { for (let c = 0; c < 2; c++) { B(c * 14, 2, 13, 9, c ? C.lav : C.yellow, 2); Win(c * 14 + 2, 4, 4, 3); Win(c * 14 + 7, 4, 4, 3); }
      B(25, 0.5, 3, 3.5, "#6d6763", 1); B(28, 0, 12, 11, col, 2.6); Win(30, 1.8, 6.5, 4); E(31, 3.8, 0.85); lamp(39, 7.5); smile(36.5, 8.6, 1.6);
      R(X(0), Y(10.4), 40 * u, u, C.k); for (const wx of [3, 10, 17, 24, 31, 37]) W(wx, 11, 1.7); break; }
    case "bus": B(0, 0, 28, 13, col, 3); for (let i = 0; i < 4; i++) Win(2 + i * 5, 2, 4, 4); Win(22.2, 1.6, 5, 5.6);
      R(X(1), Y(8.2), 26 * u, u * 0.9, "rgba(255,255,255,.75)"); B(20, 7.2, 1.8, 4.6, C.win, 0.6); E(23, 4.3, 0.9); lamp(27, 10.4); smile(25.6, 10.4, 1.6); W(6, 13); W(22, 13); break;
    case "lorry": case "fire": case "tow": {
      if (kind === "tow") { B(0, 6, 17, 5, col, 1.4); skLine([[X(2.5), Y(6)], [X(4), Y(1.5)], [X(13.5), Y(1.5)], [X(15), Y(6)]], lw * 1.3); skLine([[X(2.5), Y(1.5)], [X(1.5), Y(5)]], lw); g.strokeStyle = C.k; g.lineWidth = lw; g.beginPath(); g.arc(X(1.8), Y(5.6), u * 0.8, 0, Math.PI); g.stroke(); }
      else B(0, 0, 19, 12, col, 1.8);
      if (kind === "fire") { B(2, 1.2, 15, 2, "#E9E4DA", 0.8); for (let i = 1; i < 8; i++) R(X(2 + i * 1.9), Y(1.3), u * 0.5, u * 1.8, "#a49c90"); R(X(1), Y(7), 17 * u, u * 1.1, C.yellow); siren(21, 1); }
      if (kind === "tow") siren(18.5, 1.2);
      B(17, 3, 11, 9, kind === "lorry" ? C.yellow : col, 2.6); Win(21, 4.4, 6.2, 3.8); E(21.9, 6.2, 0.85); lamp(27.3, 9.6); smile(25.6, 10.6, 1.4);
      R(X(0), Y(11.2), 28 * u, u * 0.9, "#5d5955"); W(5, 12); W(10, 12); W(23, 12); break;
    }
    case "amb": case "van": {
      B(0, 1, 22, 11, kind === "amb" ? C.white : col, 3); Win(15.6, 2.6, 5.6, 3.8); Win(2, 3, 5, 3); E(16.4, 4.5, 0.85); lamp(21.2, 8.6); tail(0.6, 8.6); smile(19.6, 9.6, 1.4);
      if (kind === "amb") { R(X(1), Y(8.2), 20 * u, u * 0.9, C.red); R(X(9.2), Y(3.7), 3.6 * u, 1.2 * u, C.red); R(X(10.4), Y(2.5), 1.2 * u, 3.6 * u, C.red); siren(9, -0.3); }
      W(5, 11); W(17, 11); break;
    }
    case "moto": W(3, 9, 1.9); W(11, 9, 1.9); B(3.5, 5, 8.5, 3, col, 1.4); skLine([[X(10.5), Y(5)], [X(11.4), Y(2.8)], [X(10.4), Y(2.4)]], lw * 1.2);
      B(5.4, 2.4, 3.2, 3.6, C.blue, 1.3); sk(elPts(X(7), Y(1.3), 1.7 * u, 1.5 * u, 12), col, lw); B(7, 0.8, 2.2, 1.2, C.win, 0.5); eye(X(8.1), Y(1.4), u * 0.5, ph); lamp(12.3, 5.6); break;
    case "build": {
      if (IMG.car_body && IMG.car_roof && IMG.car_w2) {
        const dw = w * u, dh = h * u, n = o.wheels || 0, L = (k: string) => g.drawImage(tinted(k, col), x0, y0, dw, dh);
        if (n > 2) L("car_w2"); if (o.body) L("car_body"); if (n > 0) L("car_w0"); if (n > 1) L("car_w1"); if (n > 3) { g.save(); g.globalAlpha *= 0.9; L("car_w2"); g.restore(); }
        if (o.roof) L("car_roof"); break;
      }
      if (o.roof) { B(5, 0, 13, 6.4, col, 3); Win(6.8, 1.2, 4.6, 3.4); Win(12.2, 1.2, 4.6, 3.4); E(13, 3, 0.8); }
      if (o.body) { B(0, 4, 24, 6, col, 2.6); lamp(22.8, 5.8); tail(0.6, 5.8); if (o.roof) smile(21, 8.2, 1.6); }
      const ws = [3.5, 8.5, 15.5, 20.5];
      for (let i = 0; i < 4; i++) { if ((o.wheels || 0) > i) W(ws[i], 10); }
      break;
    }
  }
  g.restore();
  return { w: w * u, h: h * u };
}
export function sky(top = C.sky, bot = C.sky2) {
  const { W, H, U } = D; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  cloud(W * 0.18 + Math.sin(D.t / 5) * 20, H * 0.12, U * 3); cloud(W * 0.75 + Math.cos(D.t / 6) * 20, H * 0.18, U * 2.5);
}
export function cloud(x: number, y: number, u: number) {
  { const k = "cloud-" + (1 + (Math.round(Math.abs(y)) % 2)); if (IMG[k]) { g.drawImage(IMG[k], x - u, y - 3.5 * u, 16 * u, 8 * u); return; } }
  const pts: [number, number][] = []; const bumps: [number, number, number][] = [[2.5, 1.5, 2.6], [6, -0.8, 3.6], [10.2, 0.4, 3], [12.8, 2, 2]];
  g.fillStyle = "rgba(255,255,255,.95)"; g.beginPath(); for (const [bx, by, r] of bumps) { g.moveTo(x + (bx + r) * u, y + by * u); g.arc(x + bx * u, y + by * u, r * u, 0, Math.PI * 2); } g.fill();
  g.beginPath(); (g as any).roundRect ? (g as any).roundRect(x, y + 0.6 * u, 14 * u, 3.4 * u, 1.7 * u) : g.rect(x, y + 0.6 * u, 14 * u, 3.4 * u); g.fill();
  g.strokeStyle = "rgba(150,170,190,.35)"; g.lineWidth = Math.max(1, u * 0.35); g.beginPath(); g.moveTo(x + 1 * u, y + 4 * u); g.quadraticCurveTo(x + 7 * u, y + 4.6 * u, x + 13 * u, y + 4 * u); g.stroke(); void pts;
}
export function ground(y: number, c1 = C.grass, c2 = C.grass2) {
  const { W, H, U } = D; g.fillStyle = grad(c1, y, H); g.fillRect(0, y, W, H - y);
  g.strokeStyle = C.k; g.globalAlpha = 0.35; g.lineWidth = Math.max(1, U * 0.45); g.lineCap = "round"; seed(W, 7); g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= W + 20; x += 20) g.lineTo(x, y + (rand() - 0.5) * U * 0.6); g.stroke(); g.globalAlpha = 1;
  seed(W, H, y); g.strokeStyle = c2; g.lineWidth = Math.max(1, U * 0.5);
  const n = Math.min(40, Math.floor(W / (U * 9))); g.beginPath();
  for (let i = 0; i < n; i++) { const tx = rand() * W, ty = y + U * 2 + rand() * Math.max(1, H - y - U * 3); if (ty > H) continue; const s = U * (1 + rand()); g.moveTo(tx - s, ty - s * 1.4); g.lineTo(tx, ty); g.lineTo(tx + s * 0.2, ty - s * 1.8); g.moveTo(tx, ty); g.lineTo(tx + s, ty - s * 1.3); }
  g.stroke();
  for (let i = 0; i < n / 4; i++) { const fx = rand() * W, fy = y + U * 3 + rand() * Math.max(1, H - y - U * 4); if (fy > H - U) continue; g.fillStyle = "#FFFDF6"; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.beginPath(); g.arc(fx + Math.cos(a) * U * 0.7, fy + Math.sin(a) * U * 0.7, U * 0.5, 0, 7); g.fill(); } g.fillStyle = C.yellow; g.beginPath(); g.arc(fx, fy, U * 0.4, 0, 7); g.fill(); }
}
export function road(y: number, h: number, scroll = 0) {
  const { W, U } = D; g.fillStyle = grad(C.road, y, y + h); g.fillRect(0, y, W, h);
  skLine([[0, y], [W * 0.33, y + U * 0.2], [W * 0.66, y - U * 0.2], [W, y]], Math.max(1.2, U * 0.6)); skLine([[0, y + h], [W * 0.5, y + h + U * 0.2], [W, y + h]], Math.max(1.2, U * 0.6));
  const d = U * 10; g.fillStyle = "rgba(255,255,255,.9)"; for (let x = -((scroll % (d * 2)) + d * 2); x < W + d; x += d * 2) { g.beginPath(); (g as any).roundRect ? (g as any).roundRect(x, y + h / 2 - U / 2, d, U, U / 2) : g.rect(x, y + h / 2 - U / 2, d, U); g.fill(); }
}
export function sun(x: number, y: number, r: number) { if (IMG.sun) { g.drawImage(IMG.sun, x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2); return; } const gr = g.createRadialGradient(x, y, r * 0.6, x, y, r * 2); gr.addColorStop(0, "rgba(255,236,170,.55)"); gr.addColorStop(1, "rgba(255,236,170,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2, 0, 7); g.fill(); sk(elPts(x, y, r, r, 18), C.yellow, Math.max(1.2, r * 0.06)); }
export function face(x: number, y: number, u: number, happy = true) { g.fillStyle = C.k; g.beginPath(); g.arc(x - 2.5 * u, y + u * 0.5, u * 0.7, 0, 7); g.arc(x + 2.5 * u, y + u * 0.5, u * 0.7, 0, 7); g.fill(); if (happy) { g.strokeStyle = C.k; g.lineWidth = Math.max(1, u * 0.7); g.lineCap = "round"; g.beginPath(); g.arc(x, y + u * 0.6, u * 2, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); } }

// ---- places: (cx, ground y, u) ----
export function place(kind: string, cx: number, gy: number, u: number) {
  { const m: Record<string, [string, number]> = { home: ["house-stilt", 24], toll: ["toll-booth", 20], petrol: ["petrol-station", 24], durian: ["fruit-stall", 20], atuk: ["house-atuk", 24] }; const q = m[kind];
    if (q && IMG[q[0]]) { if (kind === "atuk" && IMG["atuk-wave"]) { propFit(q[0], cx - 4 * u, gy, q[1] * u, 23 * u); g.save(); g.translate(cx + 11 * u, gy); g.rotate(Math.sin(D.t * 1.6) * 0.04); propFit("atuk-wave", 0, 0, 15 * u, 8 * u); g.restore(); } else propFit(q[0], cx, gy, q[1] * u, 31 * u); return; } }
  const X = (i: number) => cx + i * u, Y = (i: number) => gy - i * u, lw = Math.max(1.2, u * 0.6);
  const B = (ix: number, iy: number, w: number, h: number, c: string, r = 1) => sk(rrPts(X(ix), Y(iy), w * u, h * u, r * u), c, lw);
  const Win = (ix: number, iy: number, w: number, h: number) => { B(ix, iy, w, h, C.win, 0.6); skLine([[X(ix + w / 2), Y(iy)], [X(ix + w / 2), Y(iy - h)]], lw * 0.6); };
  const roof = (ix: number, iy: number, w: number, h: number, c: string) => sk(polyPts([[X(ix + w * 0.5), Y(iy)], [X(ix + w), Y(iy - h)], [X(ix), Y(iy - h)]], 3), c, lw);
  switch (kind) {
    case "atuk": case "home": { // kampung house on stilts
      const rc = kind === "atuk" ? C.red : C.orange, wall = kind === "atuk" ? "#E3B98A" : "#EFD9B4";
      for (const s of [-9, -3, 3, 8]) B(s, 5.4, 1.2, 5.4, "#9b7656", 0.4);
      B(-11, 15, 22, 10, wall, 1); g.strokeStyle = "rgba(120,85,55,.35)"; g.lineWidth = Math.max(1, u * 0.3); g.beginPath(); for (let i = 1; i < 5; i++) { g.moveTo(X(-10.5), Y(15 - i * 2)); g.lineTo(X(10.5), Y(15 - i * 2)); } g.stroke();
      roof(-13.5, 23.5, 27, 9, rc); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = Math.max(1, u * 0.35); g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(X(0), Y(23.2)); g.lineTo(X(-13 + i * 6.5), Y(14.6)); } g.stroke();
      B(-3, 13.6, 5, 8.6, "#B08A68", 1.2); Win(4, 13, 5, 4); Win(-9.5, 13, 4, 4);
      for (let i = 0; i < 3; i++) R(X(-4.5 + i * 0.6), Y(5 - i * 1.6), 7 * u, u * 0.7, "#9b7656");
      if (kind === "atuk") { const wave = Math.sin(D.t * 1.6) * 0.35;
        B(13.6, 3, 1, 3, C.k, 0.4); B(15.4, 3, 1, 3, C.k, 0.4); B(12.6, 8.5, 5, 5.6, C.green, 1.2); B(12.4, 13.5, 5.4, 5.4, C.white, 1.6);
        skLine([[X(17.4), Y(12.2)], [X(19 + wave), Y(15.2)]], u * 0.9, "#c79a72"); pcirc(X(19 + wave), Y(15.6), u * 0.8, "#E9C39B");
        sk(elPts(X(15.1), Y(16.6), 2.7 * u, 2.7 * u, 14), "#E9C39B", lw); B(13.1, 19.6, 4, 1.6, "#4A4A48", 0.4); face(X(15.1), Y(16.8), u * 0.5); R(X(13.6), Y(15), 3 * u, u * 0.5, "rgba(255,255,255,.9)"); }
      break;
    }
    case "school": B(-13, 16, 26, 16, C.yellow, 1); sk(rrPts(X(-14.5), Y(18.2), 29 * u, 3 * u, u), C.red, lw); for (let i = 0; i < 3; i++) Win(-10 + i * 8, 13, 4, 4); B(-2, 7, 4, 7, C.brown, 1);
      skLine([[X(12.5), Y(0)], [X(12.5), Y(26)]], lw); for (let i = 0; i < 4; i++) R(X(13), Y(26 - i), 6 * u, u, i % 2 ? C.white : C.red); R(X(13), Y(26), 2.5 * u, 2 * u, C.blue); break;
    case "petrol": sk(rrPts(X(-13.5), Y(18), 27 * u, 3.4 * u, u), C.red, lw); R(X(-12), Y(14.8), 24 * u, u * 0.8, C.white); B(-10.5, 14.6, 2, 14.6, C.grey, 0.6); B(8.5, 14.6, 2, 14.6, C.grey, 0.6);
      B(-4, 9, 7, 9, C.green, 1.6); B(-2.6, 7.6, 4, 2.4, C.win, 0.5); skLine([[X(3), Y(6)], [X(4.6), Y(6)], [X(4.6), Y(2)]], lw); break;
    case "durian": { sk(rrPts(X(-12.5), Y(19), 25 * u, 2.4 * u, u), C.k, lw); for (let i = 0; i < 6; i++) R(X(-12 + i * 4), Y(17), 4 * u, 3 * u, i % 2 ? C.white : C.green);
      B(-1, 15, 2, 15, C.brown, 0.5); B(-12, 7, 24, 4, C.brown, 1); B(-10, 3, 2, 3, "#8a6a50", 0.4); B(8, 3, 2, 3, "#8a6a50", 0.4);
      for (const dx of [-7, -1, 5]) { const x = X(dx + 1), y = Y(9.3), r = 2.6 * u; g.fillStyle = "#9BBF5A"; g.beginPath(); for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2, rr = k % 2 ? r : r * 1.18; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9); } g.closePath(); g.fill(); g.strokeStyle = C.k; g.lineWidth = lw * 0.8; g.stroke(); } break; }
    case "pasar": for (let s = 0; s < 3; s++) { const ox = -15 + s * 10; sk(rrPts(X(ox - 0.5), Y(14.4), 10 * u, 2.6 * u, u), s % 2 ? C.purple : C.orange, lw); for (let i = 0; i < 3; i++) R(X(ox + 0.5 + i * 3), Y(13.4), 1.4 * u, 1.5 * u, "rgba(255,255,255,.75)");
        B(ox, 7, 9, 7, C.cream, 1); B(ox + 1, 12, 0.8, 5, "#8a6a50", 0.3); B(ox + 7.2, 12, 0.8, 5, "#8a6a50", 0.3); pcirc(X(ox + 4.5), Y(5), 1.5 * u, [C.red, C.yellow, C.green][s], u); }
      skLine([[X(-15), Y(17)], [X(0), Y(16)], [X(15), Y(17)]], lw * 0.6); for (let i = 0; i < 8; i++) { const lx = X(-15 + i * 4), ly = Y(16.6); const gr = g.createRadialGradient(lx, ly + u, 0, lx, ly + u, u * 2.5); gr.addColorStop(0, "rgba(255,225,150,.6)"); gr.addColorStop(1, "rgba(255,225,150,0)"); g.fillStyle = gr; g.beginPath(); g.arc(lx, ly + u, u * 2.5, 0, 7); g.fill(); sk(elPts(lx, ly + u, u * 0.9, u * 1.1, 10), i % 2 ? C.yellow : C.pink, lw * 0.6); } break;
    case "toll": sk(rrPts(X(-6.5), Y(20.5), 15 * u, 3 * u, u), C.blue, lw); B(-3, 14, 7, 14, C.cream, 1.2); B(-1.4, 11.5, 3.8, 3.2, C.win, 0.6); B(-5.5, 17, 1, 17, C.grey, 0.4); break;
  }
}
export function garage(x: number, y: number, w: number, h: number, col: string, open = 0, u = D.U, layer = 0) {
  if (IMG.garage && IMG["garage-door"]) { // Sylphy's painted garage; layer 1 = building + lit interior, 2 = roller door (drawn after the vehicle)
    const im = IMG.garage, gw = w * 1.08, gh = gw * im.naturalHeight / im.naturalWidth, gx = x + w / 2 - gw / 2, gyy = y + h - gh;
    const ox = gx + gw * 0.143, oy = gyy + gh * 0.45, ow = gw * 0.714, oh = gh * 0.515, e = open * open * (3 - 2 * open);
    if (layer !== 2) g.drawImage(im, gx, gyy, gw, gh);
    if (layer !== 1 && e < 1) { g.save(); g.beginPath(); g.rect(ox, oy, ow, oh); g.clip(); g.drawImage(IMG["garage-door"], ox, oy - e * oh, ow, oh); g.restore(); }
    return;
  }
  if (layer === 2) return;
  const lw = Math.max(1.2, u * 0.7), ink = "rgba(74,64,58,.85)", e = open * open * (3 - 2 * open);
  // walls
  sk(rrPts(x, y, w, h, u * 1.2), mix(col, "#FFF8EC", 0.45), lw, ink);
  // warm lit interior with plank texture and a hanging lamp glow
  const ix = x + 3 * u, iy = y + 3 * u, iw = w - 6 * u, ih = h - 3 * u;
  const gr = g.createLinearGradient(0, iy, 0, iy + ih); gr.addColorStop(0, "#F3D29C"); gr.addColorStop(1, "#E2B47C"); g.fillStyle = gr; g.fillRect(ix, iy, iw, ih);
  g.strokeStyle = "rgba(150,100,60,.18)"; g.lineWidth = Math.max(1, u * 0.3); g.beginPath(); for (let xx = ix + iw / 7; xx < ix + iw; xx += iw / 7) { g.moveTo(xx, iy); g.lineTo(xx, iy + ih); } g.stroke();
  const lg = g.createRadialGradient(ix + iw / 2, iy + u * 2, u, ix + iw / 2, iy + u * 2, iw * 0.6); lg.addColorStop(0, "rgba(255,244,200,.75)"); lg.addColorStop(1, "rgba(255,244,200,0)"); g.fillStyle = lg; g.fillRect(ix, iy, iw, ih);
  g.fillStyle = "rgba(120,80,50,.18)"; g.fillRect(ix, iy + ih - u * 1.6, iw, u * 1.6);
  // roller door: slats, rolls up softly into a drum at the top
  const dh = ih * (1 - e);
  if (dh > 1) {
    sk(rrPts(ix, iy, iw, dh, u * 0.5), "#F1ECE2", Math.max(1, u * 0.45), ink);
    g.strokeStyle = "rgba(140,125,110,.45)"; g.lineWidth = Math.max(1, u * 0.35); g.beginPath();
    for (let yy = dh - 2.4 * u; yy > u; yy -= 2.4 * u) { g.moveTo(ix + u * 0.8, iy + yy); g.lineTo(ix + iw - u * 0.8, iy + yy); } g.stroke();
    sk(rrPts(ix + iw / 2 - 2 * u, iy + dh - 1.8 * u, 4 * u, u * 0.9, u * 0.4), "#B8AC9C", Math.max(1, u * 0.3), ink);
  }
  sk(rrPts(ix - u * 0.5, iy - u * 1.2, iw + u, u * 2, u), mix(col, "#7A6A5E", 0.25), lw, ink);
  // tiled roof with scalloped shingles
  const rx = x - u * 2, rw = w + u * 4, peak = y - h * 0.34, base = y + u * 0.6;
  sk(polyPts([[x + w / 2, peak], [rx + rw, base], [rx, base]], 3), mix(col, "#C0755A", 0.35), lw * 1.1, ink);
  g.save(); g.beginPath(); g.moveTo(x + w / 2, peak); g.lineTo(rx + rw, base); g.lineTo(rx, base); g.closePath(); g.clip();
  g.strokeStyle = "rgba(90,60,45,.35)"; g.lineWidth = Math.max(1, u * 0.35); const st = Math.max(3, (base - peak) / 5), tw = st * 1.4;
  for (let r = 1, yy = peak + st; yy < base; yy += st, r++) { g.beginPath(); for (let xx = rx + (r % 2) * tw / 2 - tw; xx < rx + rw + tw; xx += tw) { g.moveTo(xx, yy); g.arc(xx + tw / 2, yy, tw / 2, Math.PI, 0, true); } g.stroke(); }
  g.restore();
}
export function shape(kind: string, cx: number, cy: number, r: number, col: string, u = D.U, hole = false) {
  { const k = (hole ? "hole-" : "shape-") + kind; if (IMG[k]) { const s2 = r * 2.4; g.drawImage(hole ? IMG[k] : tmul(k, col), cx - s2 / 2, cy - s2 / 2, s2, s2); return; } }
  const pts = kind === "circle" ? elPts(cx, cy, r, r, 18) : kind === "square" ? rrPts(cx - r, cy - r, 2 * r, 2 * r, r * 0.18) : polyPts([[cx, cy - r * 1.1], [cx + r * 1.15, cy + r * 0.9], [cx - r * 1.15, cy + r * 0.9]], 3);
  if (hole) { sk(pts, "rgba(43,33,64,.30)", 0); g.setLineDash([u * 1.5, u * 1.2]); g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = Math.max(1, u * 0.6); smoothStroke(pts); g.setLineDash([]); }
  else sk(pts, col, Math.max(1.4, u * 0.9));
}
function smoothStroke(pts: [number, number][]) { const n = pts.length; g.beginPath(); g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2); for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); } g.closePath(); g.stroke(); }
export function btnBox(x: number, y: number, w: number, h: number, col: string, pressed = false) {
  const u = D.U, o = pressed ? u : 0; g.fillStyle = "rgba(74,60,50,.16)"; g.beginPath(); (g as any).roundRect ? (g as any).roundRect(x + u * 0.6, y + u * 1.6, w, h, Math.min(w, h) * 0.2) : g.rect(x + u, y + 2 * u, w, h); g.fill();
  { const k = w / h > 1.8 ? "btn-wide" : "btn"; if (IMG[k]) { g.drawImage(tmul(k, col), x + o, y + o, w, h); return; } }
  box(x + o, y + o, w, h, col, u);
}
export function homeIcon(x: number, y: number, s: number) {
  if (fitPic("icon-home", x, y, s, s)) return;
  const lw = Math.max(1.2, s / 22);
  sk(rrPts(x + s * 0.24, y + s * 0.44, s * 0.52, s * 0.44, s * 0.06), C.cream, lw);
  sk(polyPts([[x + s * 0.5, y + s * 0.1], [x + s * 0.9, y + s * 0.5], [x + s * 0.1, y + s * 0.5]], 3), C.red, lw);
  sk(rrPts(x + s * 0.43, y + s * 0.62, s * 0.14, s * 0.26, s * 0.05), C.brown, lw * 0.8);
}
export function speakerIcon(x: number, y: number, s: number, on = true) {
  if (fitPic(on ? "icon-sound-on" : "icon-sound-off", x, y, s, s)) return;
  const lw = Math.max(1.5, s / 14); sk(polyPts([[x + s * 0.16, y + s * 0.38], [x + s * 0.34, y + s * 0.38], [x + s * 0.54, y + s * 0.2], [x + s * 0.54, y + s * 0.8], [x + s * 0.34, y + s * 0.62], [x + s * 0.16, y + s * 0.62]], 1), C.k, lw);
  g.strokeStyle = on ? C.k : C.red; g.lineWidth = lw; g.lineCap = "round"; g.beginPath();
  if (on) { g.arc(x + s * 0.56, y + s * 0.5, s * 0.14, -0.9, 0.9); g.moveTo(x + s * 0.56 + Math.cos(-0.9) * s * 0.26, y + s * 0.5 + Math.sin(-0.9) * s * 0.26); g.arc(x + s * 0.56, y + s * 0.5, s * 0.26, -0.9, 0.9); }
  else { g.moveTo(x + s * 0.64, y + s * 0.38); g.lineTo(x + s * 0.86, y + s * 0.62); g.moveTo(x + s * 0.86, y + s * 0.38); g.lineTo(x + s * 0.64, y + s * 0.62); }
  g.stroke();
}
export { txt, star };

export function palm(x: number, gy: number, u: number) {
  if (prop("palm", x + 2 * u, gy, 32 * u)) return;
  const sway = Math.sin(D.t * 0.6 + x) * u * 0.6, tx = x + u * 3 + sway, ty = gy - 29 * u, lw = Math.max(1.2, u * 0.6);
  g.lineCap = "round"; g.strokeStyle = C.k; g.lineWidth = u * 2.6; g.beginPath(); g.moveTo(x + u, gy); g.quadraticCurveTo(x - u * 1.5, gy - 16 * u, tx, ty); g.stroke();
  g.strokeStyle = "#B8946E"; g.lineWidth = u * 1.6; g.stroke();
  g.strokeStyle = "rgba(90,70,50,.4)"; g.lineWidth = Math.max(1, u * 0.3); for (let i = 1; i < 9; i++) { const t = i / 9, px = (1 - t) * (1 - t) * (x + u) + 2 * t * (1 - t) * (x - u * 1.5) + t * t * tx, py = (1 - t) * (1 - t) * gy + 2 * t * (1 - t) * (gy - 16 * u) + t * t * ty; g.beginPath(); g.moveTo(px - u * 0.7, py); g.lineTo(px + u * 0.7, py - u * 0.2); g.stroke(); }
  for (const [a, L] of [[-2.7, 11], [-2.2, 12], [-1.4, 9], [-0.9, 12], [-0.4, 11], [0.3, 9], [3.5, 9]] as [number, number][]) {
    const ex = tx + Math.cos(a) * L * u, ey = ty + Math.sin(a) * L * u * 0.8 + (Math.abs(Math.cos(a)) > 0.5 ? L * u * 0.35 : 0), mx = (tx + ex) / 2, my = Math.min(ty, ey) - u * 2.5;
    const n = -Math.sin(a), m = Math.cos(a); g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(mx + n * u * 2, my + m * u * 2, ex, ey); g.quadraticCurveTo(mx - n * u * 1.2, my - m * u * 1.2 + u * 2, tx, ty);
    g.fillStyle = C.palm; g.fill(); g.strokeStyle = C.k; g.globalAlpha = 0.7; g.lineWidth = lw * 0.8; g.stroke(); g.globalAlpha = 1;
  }
  pcirc(tx + u, ty + 1.6 * u, 1.3 * u, "#9b7656", u);
}
export function playground(x: number, gy: number, u: number) {
  const lw = Math.max(1.2, u * 0.6);
  skLine([[x + u, gy], [x + u, gy - 14 * u], [x + 13 * u, gy - 14 * u], [x + 13 * u, gy]], u * 1.2, C.blue);
  skLine([[x + 5.5 * u, gy - 14 * u], [x + 5.5 * u, gy - 6.5 * u]], lw * 0.6); skLine([[x + 8.5 * u, gy - 14 * u], [x + 8.5 * u, gy - 6.5 * u]], lw * 0.6); sk(rrPts(x + 4.5 * u, gy - 6.8 * u, 5 * u, 1.4 * u, u * 0.5), C.yellow, lw);
  g.lineCap = "round"; g.strokeStyle = C.k; g.lineWidth = u * 2.2; g.beginPath(); g.moveTo(x + 16 * u, gy - 12 * u); g.quadraticCurveTo(x + 22 * u, gy - 10 * u, x + 31 * u, gy - 0.5 * u); g.stroke(); g.strokeStyle = C.red; g.lineWidth = u * 1.4; g.stroke();
  skLine([[x + 16 * u, gy], [x + 16 * u, gy - 12 * u]], lw);
}
/** soft rolling hills along the horizon (seeded, static) */
function hills(gy: number, c: string, amp: number, sd: number) {
  const { W, U } = D; seed(sd, W); const k1 = 1 + rand() * 2, k2 = 3 + rand() * 3, p1 = rand() * 6, p2 = rand() * 6;
  g.beginPath(); g.moveTo(0, gy); for (let x = 0; x <= W + 10; x += 10) { const t = x / W; g.lineTo(x, gy - amp * (0.55 + 0.3 * Math.sin(t * Math.PI * k1 + p1) + 0.15 * Math.sin(t * Math.PI * k2 + p2))); } g.lineTo(W, gy); g.closePath();
  g.fillStyle = c; g.fill(); g.strokeStyle = "rgba(74,74,72,.18)"; g.lineWidth = Math.max(1, U * 0.4); g.stroke();
}
/** scene backdrops from the theme guide */
export function backdrop(kind: "kampung" | "taman" | "dusk" | "pasar" | "plain", horizon = 0.62) {
  const { W, H, U } = D, gy = H * horizon;
  if (kind !== "plain" && cover("bg-" + kind)) return gy;
  const top = kind === "dusk" ? "#E9C9B8" : kind === "pasar" ? "#9C98BC" : C.sky, bot = kind === "dusk" ? "#F6E3C8" : kind === "pasar" ? "#C4B6DE" : "#EEF4EC";
  const gr = g.createLinearGradient(0, 0, 0, gy); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, gy + 1);
  if (kind === "dusk") sun(W * 0.8, gy * 0.72, U * 8);
  else if (kind === "pasar") { for (let i = 0; i < 6; i++) star(W * (0.1 + i * 0.16), H * 0.12 + (i % 2) * U * 3, U * (0.9 + 0.2 * Math.sin(D.t * 0.7 + i)), "#FAF6EE", false); }
  else { cloud(W * 0.14 + Math.sin(D.t / 8) * 12, H * 0.1, U * 2.5); cloud(W * 0.7 + Math.cos(D.t / 9) * 12, H * 0.16, U * 2); }
  if (horizon < 0.9) { hills(gy, kind === "pasar" ? "#8E9AA8" : kind === "dusk" ? "#C9B7A0" : "#C9DCC0", Math.min(H * 0.12, U * 16), 3); hills(gy, kind === "pasar" ? "#97A88E" : kind === "dusk" ? "#B9C29A" : "#B3CDA2", Math.min(H * 0.07, U * 9), 9); }
  ground(gy, kind === "pasar" ? "#A9BD9A" : C.grass, kind === "pasar" ? "#8FA67F" : "#94B583");
  if (kind === "kampung") { palm(W * 0.06, gy, U); palm(W * 0.92, gy, U); }
  if (kind === "taman") { playground(W * 0.04, gy, U); }
  if (kind === "pasar") { skLine([[0, H * 0.05], [W * 0.5, H * 0.07], [W, H * 0.05]], Math.max(1, U * 0.4)); for (let i = 0; i < 9; i++) { const x = W * (i + 0.5) / 9, y = H * 0.06 + U * 3.5; const lg = g.createRadialGradient(x, y, 0, x, y, U * 5); lg.addColorStop(0, "rgba(255,220,150,.55)"); lg.addColorStop(1, "rgba(255,220,150,0)"); g.fillStyle = lg; g.beginPath(); g.arc(x, y, U * 5, 0, 7); g.fill(); sk(elPts(x, y, U * 1.5, U * 1.8, 12), "#F2C27A", Math.max(1, U * 0.45)); } }
  return gy;
}
