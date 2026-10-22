import { g, D, C, R, pcirc, ptri, box, txt, star } from "./core";
export const VW: Record<string, [number, number]> = {
  car: [18, 11], taxi: [18, 12], kancil: [13, 10], bus: [28, 15], lorry: [28, 14], fire: [28, 14], amb: [22, 13],
  tow: [26, 13], jeep: [18, 13], train: [40, 13], police: [18, 12], moto: [14, 11], van: [22, 13], build: [24, 12],
};
export type VOpt = { flip?: boolean; lights?: boolean; flash?: boolean; body?: boolean; wheels?: number; roof?: boolean; ghost?: boolean };
/** draw a vehicle standing on ground y=gy, centred on cx, block size u. */
export function veh(kind: string, cx: number, gy: number, u: number, col: string, o: VOpt = {}) {
  const [w, h] = VW[kind] || VW.car;
  g.save();
  if (o.flip) { g.translate(cx * 2, 0); g.scale(-1, 1); }
  if (o.ghost) g.globalAlpha = 0.25;
  const x0 = cx - (w * u) / 2, y0 = gy - h * u;
  const P = (ix: number, iy: number, ww: number, hh: number, c: string) => R(x0 + ix * u, y0 + iy * u, ww * u, hh * u, c);
  const O = (ix: number, iy: number, ww: number, hh: number, c: string) => { P(ix, iy, ww, hh, C.k); P(ix + 1, iy + 1, ww - 2, hh - 2, c); P(ix + 1, iy + 1, ww - 2, 1, "rgba(255,255,255,.35)"); };
  const W = (ix: number, iy: number) => { pcirc(x0 + ix * u, y0 + iy * u, 2.2 * u, C.k, u); pcirc(x0 + ix * u, y0 + iy * u, 1 * u, C.grey, u); };
  const lamp = (ix: number, iy: number) => { P(ix, iy, 1, 1, C.yellow); if (o.lights) { g.fillStyle = "rgba(255,240,120,.55)"; g.fillRect(x0 + (ix + 1) * u, y0 + (iy - 2) * u, 6 * u, 5 * u); } };
  const fl = true;
  const siren = (ix: number, iy: number) => { P(ix - 1, iy - 1, 6, 3, C.k); P(ix, iy, 2, 1, fl ? C.red : "#7a2030"); P(ix + 2, iy, 2, 1, fl ? "#1d3f8a" : C.blue); };
  switch (kind) {
    case "car": case "taxi": case "police": {
      const top = kind === "car" ? 0 : 1;
      if (kind === "taxi") { P(7, 0, 4, 2, C.k); P(8, 0, 2, 1, C.yellow); }
      if (kind === "police") siren(7, 0);
      O(3, top, 12, 6, col); P(5, top + 1, 3, 3, C.win); P(10, top + 1, 3, 3, C.win); P(9, top + 1, 1, 4, col);
      O(0, top + 4, 18, 6, col); lamp(16, top + 5); P(1, top + 5, 1, 1, "#ff6b6b");
      if (kind === "police") { P(1, top + 7, 16, 1, C.blue); }
      if (kind === "taxi") { P(1, top + 7, 16, 1, C.k); }
      W(4.5, top + 9); W(13.5, top + 9); break;
    }
    case "jeep": O(3, 0, 11, 6, col); P(5, 1, 3, 3, C.win); P(9, 1, 3, 3, C.win); O(0, 5, 18, 6, col); P(1, 6, 16, 1, "rgba(0,0,0,.12)"); lamp(16, 6); pcirc(x0 + 0.5 * u, y0 + 7.5 * u, 2 * u, C.k, u); W(4.5, 11); W(13.5, 11); break;
    case "train": { O(28, 0, 12, 11, col); P(30, 2, 5, 3, C.win); P(25, 1, 3, 3, C.k); lamp(39, 7); for (let c = 0; c < 2; c++) { O(c * 14, 2, 13, 9, c ? C.lav : C.yellow); P(c * 14 + 2, 4, 4, 3, C.win); P(c * 14 + 7, 4, 4, 3, C.win); } P(0, 10, 40, 1, C.k); for (const wx of [3, 10, 17, 24, 31, 37]) W(wx, 11); break; }
    case "kancil": O(2, 0, 8, 6, col); P(3, 1, 5, 3, C.win); O(0, 4, 13, 5, col); lamp(11, 5); W(3.5, 8); W(9.5, 8); break;
    case "bus": O(0, 0, 28, 13, col); for (let i = 0; i < 5; i++) P(2 + i * 5, 2, 4, 4, C.win); P(1, 8, 26, 1, C.white); P(23, 7, 3, 5, C.win); lamp(26, 10); W(6, 13); W(22, 13); break;
    case "lorry": case "fire": case "tow": {
      if (kind === "tow") { O(0, 6, 17, 5, col); P(2, 1, 12, 1, C.k); P(13, 1, 1, 6, C.k); P(2, 1, 1, 5, C.k); P(1, 5, 3, 2, C.k); }
      else O(0, 0, 19, 12, col);
      if (kind === "fire") { P(2, 2, 15, 1, C.grey); for (let i = 0; i < 8; i++) P(2 + i * 2, 1, 1, 3, C.grey); P(1, 7, 17, 1, C.yellow); siren(21, 1); }
      if (kind === "tow") siren(18, 1);
      O(17, 3, 11, 9, kind === "lorry" ? C.yellow : col); P(21, 5, 5, 3, C.win); lamp(26, 9); P(0, 11, 28, 1, C.k);
      W(5, 12); W(10, 12); W(23, 12); break;
    }
    case "amb": case "van": {
      O(0, 1, 22, 11, kind === "amb" ? C.white : col); P(16, 3, 5, 3, C.win); P(2, 3, 5, 3, C.win); lamp(20, 8);
      if (kind === "amb") { P(9, 4, 4, 2, C.red); P(10, 3, 2, 4, C.red); P(1, 8, 20, 1, C.red); siren(9, 0); }
      W(5, 11); W(17, 11); break;
    }
    case "moto": W(3, 9); W(11, 9); O(3, 5, 9, 3, col); P(10, 3, 2, 3, C.k); P(5, 0, 4, 3, C.k); P(6, 1, 3, 1, col); P(6, 3, 3, 3, C.blue); lamp(12, 5); break;
    case "build": {
      if (o.roof) { O(5, 0, 13, 6, col); P(7, 1, 4, 3, C.win); P(12, 1, 4, 3, C.win); }
      if (o.body) { O(0, 4, 24, 6, col); lamp(22, 5); P(1, 5, 1, 1, "#ff6b6b"); }
      const ws = [3.5, 8.5, 15.5, 20.5];
      for (let i = 0; i < 4; i++) { if ((o.wheels || 0) > i) W(ws[i], 10); }
      break;
    }
  }
  g.restore();
  return { w: w * u, h: h * u };
}
export function sky(top = C.sky, bot = C.sky2) {
  const { W, H, U } = D; const bands = 6;
  for (let i = 0; i < bands; i++) R(0, (H * i) / bands, W, H / bands + 1, i < 3 ? top : bot);
  cloud(W * 0.18 + Math.sin(D.t / 5) * 20, H * 0.12, U * 3); cloud(W * 0.75 + Math.cos(D.t / 6) * 20, H * 0.18, U * 2.5);
}
export function cloud(x: number, y: number, u: number) { R(x, y, 14 * u, 4 * u, C.white); R(x + 3 * u, y - 3 * u, 6 * u, 3 * u, C.white); R(x + 8 * u, y - 2 * u, 4 * u, 2 * u, C.white); }
export function ground(y: number, c1 = C.grass, c2 = C.grass2) { const { W, H, U } = D; R(0, y, W, H - y, c1); for (let x = 0; x < W; x += U * 8) R(x + ((y / U) % 2) * U * 4, y, U * 4, U, c2); }
export function road(y: number, h: number, scroll = 0) {
  const { W, U } = D; R(0, y, W, h, C.road); R(0, y, W, U, C.k); R(0, y + h - U, W, U, C.k);
  const d = U * 10; for (let x = -((scroll % (d * 2)) + d * 2); x < W + d; x += d * 2) R(x, y + h / 2 - U / 2, d, U, C.line);
}
export function sun(x: number, y: number, r: number) { pcirc(x, y, r, C.yellow); pcirc(x - r * 0.3, y - r * 0.3, r * 0.3, "#fff6a8"); }
export function face(x: number, y: number, u: number, happy = true) { R(x - 3 * u, y, u, u, C.k); R(x + 2 * u, y, u, u, C.k); if (happy) { R(x - 2 * u, y + 2 * u, 4 * u, u, C.k); R(x - 3 * u, y + u, u, u, C.k); R(x + 2 * u, y + u, u, u, C.k); } }

// ---- places: (cx, ground y, u) ----
export function place(kind: string, cx: number, gy: number, u: number) {
  const P = (ix: number, iy: number, w: number, h: number, c: string) => R(cx + ix * u, gy - iy * u, w * u, h * u, c);
  switch (kind) {
    case "atuk": case "home": { // kampung house on stilts
      const roof = kind === "atuk" ? C.red : C.orange;
      for (const s of [-9, -3, 3, 8]) P(s, 5, 1, 5, C.k);
      box(cx - 11 * u, gy - 15 * u, 22 * u, 10 * u, kind === "atuk" ? "#e8b878" : C.cream, u);
      ptri(cx - 13 * u, gy - 23 * u, 26 * u, 9 * u, C.k, u); ptri(cx - 11 * u, gy - 22 * u, 22 * u, 7 * u, roof, u);
      P(-3, 14, 5, 8, C.brown); P(4, 13, 5, 4, C.win); P(-9, 13, 4, 4, C.win); P(-5, 5, 9, 1, C.k); P(-4, 4, 1, 4, C.k); P(2, 4, 1, 4, C.k);
      if (kind === "atuk") { P(-14, 4, 2, 1, C.k); face(cx + 14 * u, gy - 8 * u, u * 0.8); pcirc(cx + 14 * u, gy - 10 * u, 3.5 * u, "#e9c39b", u); face(cx + 14 * u, gy - 11 * u, u * 0.7); P(12, 15, 5, 2, C.white); P(13, 7, 3, 4, C.green); }
      break;
    }
    case "school": box(cx - 13 * u, gy - 16 * u, 26 * u, 16 * u, C.yellow, u); for (let i = 0; i < 3; i++) P(-10 + i * 8, 13, 4, 4, C.win); P(-2, 7, 4, 7, C.brown); P(12, 26, 1, 10, C.k); P(13, 26, 6, 4, C.red); P(13, 24, 6, 2, C.white); P(-14, 17, 28, 2, C.red); break;
    case "petrol": P(-13, 17, 26, 3, C.k); P(-12, 16, 24, 2, C.red); P(-12, 14, 24, 1, C.white); P(-10, 14, 2, 14, C.grey); P(8, 14, 2, 14, C.grey); box(cx - 4 * u, gy - 9 * u, 7 * u, 9 * u, C.green, u); P(-2, 7, 3, 2, C.win); P(3, 6, 2, 1, C.k); P(4, 6, 1, 4, C.k); break;
    case "durian": { P(-12, 18, 24, 2, C.k); for (let i = 0; i < 6; i++) P(-12 + i * 4, 17, 4, 3, i % 2 ? C.white : C.green); P(-1, 15, 2, 15, C.brown); box(cx - 12 * u, gy - 7 * u, 24 * u, 4 * u, C.brown, u); P(-10, 3, 2, 3, C.k); P(8, 3, 2, 3, C.k);
      for (const dx of [-8, -2, 4]) { pcirc(cx + dx * u + 2 * u, gy - 9 * u, 2.6 * u, "#8ac13a", u); P(dx + 1, 12, 1, 1, C.k); P(dx + 3, 11, 1, 1, C.k); } break; }
    case "pasar": for (let s = 0; s < 3; s++) { const ox = -15 + s * 10; P(ox, 14, 9, 2, C.k); for (let i = 0; i < 3; i++) P(ox + i * 3, 13, 3, 2, s % 2 ? (i % 2 ? C.white : C.purple) : (i % 2 ? C.white : C.orange)); box(cx + ox * u, gy - 7 * u, 9 * u, 7 * u, C.cream, u); P(ox + 1, 12, 1, 6, C.k); P(ox + 7, 12, 1, 6, C.k); pcirc(cx + (ox + 4.5) * u, gy - 5 * u, 1.5 * u, [C.red, C.yellow, C.green][s], u); }
      for (let i = 0; i < 8; i++) pcirc(cx + (-15 + i * 4) * u, gy - 17 * u, 0.9 * u, i % 2 ? C.yellow : C.pink, u); break;
    case "toll": P(-6, 20, 14, 3, C.k); P(-5, 19, 12, 2, C.blue); box(cx - 3 * u, gy - 14 * u, 7 * u, 14 * u, C.cream, u); P(-1, 11, 3, 3, C.win); P(-5, 17, 1, 17, C.grey); break;
  }
}
export function garage(x: number, y: number, w: number, h: number, col: string, open = 0, u = D.U) {
  // roof
  ptri(x - u, y - h * 0.3, w + 2 * u, h * 0.32, C.k, u); ptri(x + u, y - h * 0.26, w - 2 * u, h * 0.26, col, u);
  box(x, y, w, h, col, u); R(x + 3 * u, y + 3 * u, w - 6 * u, h - 3 * u, C.k);
  const dh = (h - 4 * u) * (1 - open);
  R(x + 4 * u, y + 4 * u, w - 8 * u, h - 4 * u, "#3a3450");
  for (let yy = 0; yy < dh; yy += 3 * u) R(x + 4 * u, y + 4 * u + yy, w - 8 * u, Math.min(2 * u, dh - yy), "#e9e6f5");
}
export function shape(kind: string, cx: number, cy: number, r: number, col: string, u = D.U, hole = false) {
  const c1 = hole ? "rgba(43,33,64,.35)" : C.k;
  if (kind === "circle") { pcirc(cx, cy, r + u, c1, u); if (!hole) pcirc(cx, cy, r, col, u); }
  else if (kind === "square") { R(cx - r - u, cy - r - u, 2 * r + 2 * u, 2 * r + 2 * u, c1); if (!hole) R(cx - r, cy - r, 2 * r, 2 * r, col); }
  else { ptri(cx - r - 2 * u, cy - r - 2 * u, 2 * r + 4 * u, 2 * r + 3 * u, c1, u); if (!hole) ptri(cx - r, cy - r, 2 * r, 2 * r, col, u); }
}
export function btnBox(x: number, y: number, w: number, h: number, col: string, pressed = false) { const u = D.U; R(x + u, y + u * 2, w, h, "rgba(0,0,0,.25)"); box(x + (pressed ? u : 0), y + (pressed ? u : 0), w, h, col, u); }
export function homeIcon(x: number, y: number, s: number) {
  const u = Math.max(2, Math.round(s / 12)); ptri(x + s * 0.1, y + s * 0.12, s * 0.8, s * 0.38, C.k, u); ptri(x + s * 0.18, y + s * 0.18, s * 0.64, s * 0.3, C.red, u);
  R(x + s * 0.24, y + s * 0.48, s * 0.52, s * 0.4, C.k); R(x + s * 0.28, y + s * 0.5, s * 0.44, s * 0.34, C.cream); R(x + s * 0.43, y + s * 0.62, s * 0.14, s * 0.22, C.brown);
}
export function speakerIcon(x: number, y: number, s: number, on = true) {
  R(x + s * 0.18, y + s * 0.38, s * 0.18, s * 0.26, C.k); ptri(x + s * 0.18, y + s * 0.2, s * 0.36, s * 0.6, C.k);
  R(x + s * 0.3, y + s * 0.2, s * 0.24, s * 0.62, C.k);
  if (on) { R(x + s * 0.62, y + s * 0.38, s * 0.06, s * 0.26, C.k); R(x + s * 0.74, y + s * 0.28, s * 0.06, s * 0.46, C.k); }
  else { for (let i = 0; i < 5; i++) { R(x + s * (0.6 + i * 0.06), y + s * (0.36 + i * 0.06), s * 0.07, s * 0.07, C.red); R(x + s * (0.84 - i * 0.06), y + s * (0.36 + i * 0.06), s * 0.07, s * 0.07, C.red); } }
}
export { txt, star };

export function palm(x: number, gy: number, u: number) {
  for (let i = 0; i < 14; i++) R(x + Math.round(Math.sin(i / 5) * 2) * u, gy - (i + 1) * 2 * u, 2 * u, 2 * u, C.brown);
  const tx = x + Math.round(Math.sin(14 / 5) * 2) * u, ty = gy - 29 * u;
  for (const [dx, dy] of [[-8, 2], [-4, -1], [4, -1], [8, 2], [0, -3]]) { R(tx + Math.min(0, dx) * u, ty + Math.min(dy, 0) * u, Math.abs(dx) * u + 2 * u, 2 * u, C.palm); R(tx + dx * u, ty + (dy + 1) * u, 2 * u, 2 * u, C.palm); }
  pcirc(tx + u, ty + 3 * u, 1.2 * u, C.brown, u);
}
export function playground(x: number, gy: number, u: number) {
  R(x, gy - 14 * u, u * 2, 14 * u, C.blue); R(x + 12 * u, gy - 14 * u, 2 * u, 14 * u, C.blue); R(x, gy - 15 * u, 14 * u, 2 * u, C.blue);
  R(x + 5 * u, gy - 13 * u, u, 7 * u, C.k); R(x + 3 * u, gy - 6 * u, 5 * u, u * 1.5, C.yellow);
  for (let i = 0; i < 8; i++) R(x + 16 * u + i * 2 * u, gy - 12 * u + i * 1.5 * u, 3 * u, 2 * u, C.red);
}
/** scene backdrops from the theme guide */
export function backdrop(kind: "kampung" | "taman" | "dusk" | "pasar" | "plain", horizon = 0.62) {
  const { W, H, U } = D, gy = H * horizon;
  if (kind === "dusk") { R(0, 0, W, gy * 0.5, "#E9C9B8"); R(0, gy * 0.5, W, gy * 0.5, "#F2DCC6"); pcirc(W * 0.8, gy * 0.75, U * 8, "#F4D7A0"); }
  else if (kind === "pasar") { R(0, 0, W, gy * 0.5, "#9C98BC"); R(0, gy * 0.5, W, gy * 0.5, "#B7A9D6"); for (let i = 0; i < 6; i++) pcirc(W * (0.1 + i * 0.16), H * 0.12 + (i % 2) * U * 3, U * 0.8, "#FAF6EE"); }
  else { R(0, 0, W, gy * 0.5, C.sky); R(0, gy * 0.5, W, gy * 0.5, C.sky2); cloud(W * 0.14 + Math.sin(D.t / 8) * 12, H * 0.1, U * 2.5); cloud(W * 0.7 + Math.cos(D.t / 9) * 12, H * 0.16, U * 2); }
  ground(gy, kind === "pasar" ? "#A9BD9A" : C.grass, kind === "pasar" ? "#9AAF8B" : C.grass2);
  if (kind === "kampung") { palm(W * 0.06, gy, U); palm(W * 0.92, gy, U); }
  if (kind === "taman") { playground(W * 0.04, gy, U); }
  if (kind === "pasar") { for (let i = 0; i < 9; i++) { const x = W * (i + 0.5) / 9; R(x, H * 0.05, U / 2, U * 3, C.k); pcirc(x, H * 0.05 + U * 4, U * 1.6, "#F2C27A"); } R(0, H * 0.05, W, U / 2, C.k); }
  return gy;
}
