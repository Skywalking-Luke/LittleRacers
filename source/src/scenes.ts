// per-game storybook scenery (art-direction.md). static or very slow motion only.
import { g, D, C, R, sk, skLine, rrPts, elPts, polyPts, grad, mix, seed, rand } from "./core";
import { face, place, palm } from "./art";
const lw = (u: number) => Math.max(1.2, u * 0.55);
/** crescent moon without a visible cut-out disc: clip away the bite instead of painting over it */
export function moon(cx: number, cy: number, r: number, col: string) {
  g.save(); g.beginPath(); g.rect(cx - r * 2, cy - r * 2, r * 4, r * 4); g.arc(cx + r * 0.45, cy - r * 0.3, r * 0.85, 0, Math.PI * 2, true); g.clip("evenodd");
  const gl = g.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * 1.8); gl.addColorStop(0, "rgba(242,216,148,.25)"); gl.addColorStop(1, "rgba(242,216,148,0)"); g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, r * 1.8, 0, 7); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); g.restore();
}
/** round leafy tree, optional face (the "cheering crowd of trees") */
export function tree(x: number, gy: number, u: number, col = "#8DB07A", o: { face?: boolean; bob?: number; night?: boolean } = {}) {
  const b = o.bob ? Math.sin(D.t * 1.2 + o.bob) * u * 0.6 : 0, trunk = o.night ? "#5b4a3a" : "#A07F5E";
  sk(rrPts(x - u * 1.2, gy - 9 * u, u * 2.4, 9 * u, u * 0.6), trunk, lw(u));
  sk(elPts(x, gy - 13 * u + b, 7 * u, 6.5 * u, 16), col, lw(u));
  g.fillStyle = "rgba(255,255,255,.18)"; g.beginPath(); g.ellipse(x - 2.5 * u, gy - 16 * u + b, 2.6 * u, 1.8 * u, -0.4, 0, 7); g.fill();
  if (o.face) face(x, gy - 13 * u + b, u * 0.8);
}
/** rain tree: wide umbrella canopy with soft pink puffs */
export function rainTree(x: number, gy: number, u: number) {
  skLine([[x, gy], [x - u, gy - 10 * u], [x + u * 0.5, gy - 20 * u]], u * 2.6); g.strokeStyle = "#A07F5E"; g.lineWidth = u * 1.6; g.beginPath(); g.moveTo(x, gy); g.lineTo(x - u, gy - 10 * u); g.lineTo(x + u * 0.5, gy - 20 * u); g.stroke();
  skLine([[x - u, gy - 12 * u], [x - 9 * u, gy - 20 * u]], u * 1.4); skLine([[x, gy - 14 * u], [x + 10 * u, gy - 21 * u]], u * 1.4);
  const pts: [number, number][] = []; for (let i = 0; i <= 20; i++) { const a = Math.PI + (i / 20) * Math.PI; pts.push([x + Math.cos(a) * 24 * u, gy - 20 * u + Math.sin(a) * 9 * u - (i % 2 ? 0 : u * 1.4)]); }
  for (let i = 20; i >= 0; i--) { const a = Math.PI + (i / 20) * Math.PI; pts.push([x + Math.cos(a) * 22 * u, gy - 18 * u + Math.sin(a) * 2 * u]); }
  sk(pts, "#86AE76", lw(u));
  seed(x, gy); for (let i = 0; i < 14; i++) { const a = Math.PI + 0.15 + rand() * (Math.PI - 0.3), rr = rand() * 0.8; g.fillStyle = "rgba(232,180,196,.85)"; g.beginPath(); g.arc(x + Math.cos(a) * 20 * u * rr, gy - 20 * u + Math.sin(a) * 7 * u * rr - u, u * 0.9, 0, 7); g.fill(); }
  g.fillStyle = "rgba(60,80,50,.12)"; g.beginPath(); g.ellipse(x, gy + u, 20 * u, 2.5 * u, 0, 0, 7); g.fill();
}
/** row of taman terrace houses on the horizon */
export function terrace(x0: number, x1: number, gy: number, u: number) {
  const w = 14 * u, cols = [C.cream, "#F3E1C7", "#E6EEDF", "#F2DCD4"];
  for (let i = 0, x = x0; x < x1; i++, x += w) {
    sk(rrPts(x, gy - 11 * u, w, 11 * u, u * 0.5), cols[i % 4], lw(u));
    sk(polyPts([[x - u, gy - 10.5 * u], [x + w / 2, gy - 17 * u], [x + w + u, gy - 10.5 * u]], 2), i % 2 ? C.red : C.orange, lw(u));
    sk(rrPts(x + 2 * u, gy - 8 * u, 4 * u, 3.5 * u, u * 0.4), C.win, lw(u) * 0.7); sk(rrPts(x + 8 * u, gy - 7 * u, 3.4 * u, 7 * u, u * 0.4), C.brown, lw(u) * 0.7);
  }
  R(0, gy - u * 0.2, D.W, u * 2.2, "#D9D3C6"); skLine([[0, gy + u * 2], [D.W, gy + u * 2]], lw(u) * 0.7);
}
export function lampPost(x: number, gy: number, u: number) { skLine([[x, gy], [x, gy - 20 * u], [x + 4 * u, gy - 21 * u]], u * 1.1); sk(elPts(x + 4.5 * u, gy - 20 * u, 1.6 * u, 1.1 * u, 10), "#F6DE8A", lw(u) * 0.7); }
/** kampung yard: low wooden fence + hibiscus bush */
export function fence(gy: number, u: number) {
  const { W } = D; R(0, gy - 6 * u, W, u * 1.2, "#C9A27C"); R(0, gy - 3 * u, W, u * 1.2, "#C9A27C");
  for (let x = u * 2; x < W; x += 6 * u) sk(polyPts([[x, gy], [x, gy - 7 * u], [x + 1.2 * u, gy - 8.4 * u], [x + 2.4 * u, gy - 7 * u], [x + 2.4 * u, gy]], 1), "#D8B48E", lw(u) * 0.7);
  for (const bx of [W * 0.02, W * 0.95]) { sk(elPts(bx, gy - 3 * u, 6 * u, 4.5 * u, 14), "#86AE76", lw(u)); for (let k = 0; k < 4; k++) { g.fillStyle = C.red; g.beginPath(); g.arc(bx - 3 * u + k * 2 * u, gy - 4 * u - (k % 2) * 2 * u, u * 0.9, 0, 7); g.fill(); } }
}
/** shopping-mall front for the car park */
export function mall(gy: number, u: number) {
  const { W } = D, x = W * 0.12, w = W * 0.76, h = Math.min(22 * u, gy * 0.45);
  sk(rrPts(x, gy - h, w, h, u), "#EDE6F2", lw(u)); sk(rrPts(x - u, gy - h - 3 * u, w + 2 * u, 4 * u, u), C.lav, lw(u));
  const n = Math.max(4, Math.floor(w / (12 * u))); for (let i = 0; i < n; i++) sk(rrPts(x + (i + 0.2) * (w / n), gy - h * 0.72, (w / n) * 0.6, h * 0.42, u * 0.5), C.win, lw(u) * 0.6);
  for (let i = 0; i < 7; i++) { g.fillStyle = [C.red, C.yellow, C.green, C.lav][i % 4]; g.beginPath(); g.moveTo(x + (i / 7) * w, gy - h - u); g.lineTo(x + ((i + 1) / 7) * w, gy - h - u); g.lineTo(x + ((i + 0.5) / 7) * w, gy - h + 2.5 * u); g.fill(); }
  g.fillStyle = "#D6D1C7"; g.fillRect(0, gy, W, D.H - gy); seed(W, 11); g.fillStyle = "rgba(120,110,100,.12)"; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(rand() * W, gy + rand() * (D.H - gy), u * 0.5, 0, 7); g.fill(); }
  skLine([[0, gy], [W, gy]], lw(u));
}
export function zebra(x: number, y: number, h: number, u: number) { const s = h / 7; for (let i = 0; i < 6; i++) R(x - 5 * u, y + s * (i + 0.5), 10 * u, s * 0.55, "rgba(255,255,255,.95)"); }
/** cosy workshop wall with pegboard tools and a wooden floor */
export function workshop(gy: number) {
  const { W, H, U: u } = D;
  g.fillStyle = grad("#EBDCC5", 0, gy); g.fillRect(0, 0, W, gy);
  const pw = Math.min(W * 0.5, 70 * u), px = W * 0.5 - pw / 2, py = gy * 0.18, ph = gy * 0.5;
  sk(rrPts(px, py, pw, ph, u), "#D8B48E", lw(u)); g.fillStyle = "rgba(120,85,55,.35)"; for (let x = px + 3 * u; x < px + pw - u; x += 4 * u) for (let y = py + 3 * u; y < py + ph - u; y += 4 * u) { g.beginPath(); g.arc(x, y, u * 0.35, 0, 7); g.fill(); }
  const tx = (f: number) => px + pw * f, ty = py + ph * 0.25;
  // wrench
  skLine([[tx(0.15), ty], [tx(0.15), ty + ph * 0.5]], u * 1.6, "#9AA4AE"); sk(elPts(tx(0.15), ty, 2.4 * u, 2.4 * u, 10), "#B9C2CA", lw(u));
  // hammer
  skLine([[tx(0.35), ty], [tx(0.35), ty + ph * 0.55]], u * 1.6, "#B08A68"); sk(rrPts(tx(0.35) - 4 * u, ty - 1.5 * u, 8 * u, 3 * u, u * 0.6), "#9AA4AE", lw(u));
  // screwdriver
  sk(rrPts(tx(0.55) - 1.4 * u, ty, 2.8 * u, ph * 0.22, u), C.red, lw(u)); skLine([[tx(0.55), ty + ph * 0.22], [tx(0.55), ty + ph * 0.5]], u * 0.8, "#9AA4AE");
  // tyre + spanner
  sk(elPts(tx(0.8), ty + ph * 0.25, 6 * u, 6 * u, 16), "#55514d", lw(u)); g.fillStyle = "#EDE6D6"; g.beginPath(); g.arc(tx(0.8), ty + ph * 0.25, 2.6 * u, 0, 7); g.fill();
  // shelf + lamp glow
  sk(rrPts(W * 0.04, gy * 0.45, W * 0.16, 2 * u, u * 0.5), C.brown, lw(u)); for (let i = 0; i < 3; i++) sk(rrPts(W * 0.05 + i * 5 * u, gy * 0.45 - 5 * u, 4 * u, 5 * u, u * 0.6), [C.blue, C.yellow, C.green][i], lw(u) * 0.7);
  const lg = g.createRadialGradient(W * 0.85, 0, 0, W * 0.85, 0, gy * 0.6); lg.addColorStop(0, "rgba(255,235,170,.45)"); lg.addColorStop(1, "rgba(255,235,170,0)"); g.fillStyle = lg; g.fillRect(0, 0, W, gy);
  skLine([[W * 0.85, 0], [W * 0.85, 6 * u]], lw(u)); sk(polyPts([[W * 0.85 - 4 * u, 10 * u], [W * 0.85, 6 * u], [W * 0.85 + 4 * u, 10 * u]], 2), C.yellow, lw(u));
  g.fillStyle = grad("#CDB08E", gy, H); g.fillRect(0, gy, W, H - gy); g.strokeStyle = "rgba(120,85,55,.25)"; g.lineWidth = Math.max(1, u * 0.4); g.beginPath(); for (let y = gy + 6 * u; y < H; y += 8 * u) { g.moveTo(0, y); g.lineTo(W, y); } g.stroke(); skLine([[0, gy], [W, gy]], lw(u));
  return gy;
}
/** toll plaza canopy across several booths */
export function tollPlaza(tx: number, gy: number, u: number) {
  for (const dx of [-24, 24]) place("toll", tx + dx * u, gy - 2 * u, u * 0.9);
  sk(rrPts(tx - 36 * u, gy - 27 * u, 72 * u, 4 * u, u), "#E8AE7E", lw(u)); for (const dx of [-34, 34]) sk(rrPts(tx + dx * u - u, gy - 23 * u, 2 * u, 23 * u, u * 0.5), C.grey, lw(u));
}
/** hillside mound behind the shape tunnels */
export function hillside(cx: number, top: number, gy: number, u: number) {
  const { W } = D; const pts: [number, number][] = [[-u * 4, gy]]; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([-u * 4 + t * (W + 8 * u), gy - (gy - top) * Math.pow(Math.sin(t * Math.PI), 0.7)]); } sk(pts, "#A9C998", lw(u));
  seed(cx, top); for (let i = 0; i < 10; i++) { const x = rand() * W, y = top + (gy - top) * (0.3 + rand() * 0.6); g.fillStyle = "rgba(255,253,246,.8)"; g.beginPath(); g.arc(x, y, u * 0.7, 0, 7); g.fill(); }
}
/** top-down little town for the road maze; avoids the road path */
export function townMap(path: { x: number; y: number }[], clear: number, top: number) {
  const { W, H, U: u } = D, s = Math.max(14 * u, Math.min(W, H) / 9); seed(W, H, 5);
  for (let y = top + s * 0.6; y < H - s * 0.4; y += s) for (let x = s * 0.6; x < W - s * 0.4; x += s) {
    const jx = x + (rand() - 0.5) * s * 0.4, jy = y + (rand() - 0.5) * s * 0.4, k = rand();
    if (path.some((p) => Math.hypot(p.x - jx, p.y - jy) < clear + s * 0.35)) continue;
    if (k < 0.45) { sk(elPts(jx, jy, s * 0.22, s * 0.22, 12), k < 0.2 ? "#86AE76" : "#9BBF8A", lw(u) * 0.7); }
    else if (k < 0.8) { const w = s * 0.42; sk(rrPts(jx - w / 2, jy - w / 2, w, w, u), [C.red, C.orange, C.lav, C.blue][Math.floor(k * 40) % 4], lw(u) * 0.7); skLine([[jx - w / 2, jy], [jx + w / 2, jy]], lw(u) * 0.5); }
  }
}
/** padi fields: soft green rows, a winding kampung path, tiny scarecrow-free and calm */
export function padi(y0: number, y1: number, u: number) {
  const { W } = D; g.fillStyle = grad("#BFD89A", y0, y1); g.fillRect(0, y0, W, y1 - y0);
  const rows = Math.max(3, Math.floor((y1 - y0) / (5 * u))); g.strokeStyle = "#8FB46E"; g.lineWidth = Math.max(1, u * 0.45); g.lineCap = "round";
  for (let r = 0; r < rows; r++) { const y = y0 + ((r + 0.7) / rows) * (y1 - y0), sp = 3 * u + r * u * 0.6; g.beginPath(); for (let x = (r % 2) * sp * 0.5; x < W; x += sp) { const sw = Math.sin(D.t * 0.8 + x * 0.02) * u * 0.4, h = u * (1.4 + r * 0.25); g.moveTo(x, y); g.lineTo(x - u * 0.5 + sw, y - h); g.moveTo(x, y); g.lineTo(x + u * 0.5 + sw, y - h); } g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = Math.max(1, u * 0.5); for (let r = 1; r < 3; r++) { const y = y0 + (r / 3) * (y1 - y0); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.strokeStyle = "#E3D1AE"; g.lineWidth = Math.max(2, u * 1.6); g.beginPath(); g.moveTo(W * 0.55, y0); g.bezierCurveTo(W * 0.75, y0 + (y1 - y0) * 0.3, W * 0.5, y0 + (y1 - y0) * 0.7, W * 0.7, y1); g.stroke();
}
/** soft bunting between two poles; sways slowly */
export function bunting(x0: number, x1: number, y: number, u: number) {
  skLine([[x0, y + 14 * u], [x0, y - u]], u); skLine([[x1, y + 14 * u], [x1, y - u]], u);
  const n = Math.max(6, Math.floor((x1 - x0) / (6 * u))), cols = [C.red, C.yellow, C.green, C.blue, C.lav];
  const at = (t: number) => [x0 + t * (x1 - x0), y + Math.sin(t * Math.PI) * 5 * u + Math.sin(D.t * 0.7) * u * 0.5 * Math.sin(t * Math.PI)];
  skLine(Array.from({ length: 11 }, (_, i) => at(i / 10) as [number, number]), lw(u) * 0.6);
  for (let i = 0; i < n; i++) { const [ax, ay] = at((i + 0.15) / n), [bx, by] = at((i + 0.85) / n); g.fillStyle = cols[i % 5]; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineTo((ax + bx) / 2, (ay + by) / 2 + 4 * u); g.closePath(); g.fill(); }
}
/** friendly racetrack: chequered finish flag, grandstand, crowd of smiling trees */
export function raceCrowd(gy: number, u: number) {
  const { W } = D; sk(rrPts(W * 0.3, gy - 9 * u, W * 0.4, 9 * u, u), "#E6EEDF", lw(u)); sk(rrPts(W * 0.29, gy - 12 * u, W * 0.42, 3 * u, u), C.red, lw(u));
  for (let i = 0, n = Math.floor(W * 0.4 / (5 * u)); i < n; i++) { const x = W * 0.3 + (i + 0.5) * (W * 0.4 / n); g.fillStyle = [C.yellow, C.pink, C.blue, C.green][i % 4]; g.beginPath(); g.arc(x, gy - 5 * u + Math.sin(D.t * 1.3 + i) * u * 0.4, u * 1.4, 0, 7); g.fill(); }
  const tc = ["#8DB07A", "#9BBF8A", "#86AE76"]; for (let i = 0, n = 6; i < n; i++) { const x = i < 3 ? W * (0.04 + i * 0.085) : W * (0.79 + (i - 3) * 0.085); tree(x, gy, u * 0.9, tc[i % 3], { face: true, bob: i }); }
  bunting(W * 0.08, W * 0.92, gy - 30 * u, u);
}
/** small town shophouses for the helper trucks */
export function shophouses(x0: number, x1: number, gy: number, u: number) {
  const w = 12 * u, cols = ["#F3E1C7", "#E6EEDF", "#F2DCD4", "#E4E0F0"];
  for (let i = 0, x = x0; x + w <= x1; i++, x += w) { sk(rrPts(x, gy - 18 * u, w, 18 * u, u * 0.4), cols[i % 4], lw(u)); sk(rrPts(x - u * 0.5, gy - 10 * u, w + u, 2.4 * u, u * 0.5), [C.green, C.red, C.blue][i % 3], lw(u) * 0.7);
    sk(rrPts(x + 2 * u, gy - 16 * u, 3 * u, 4 * u, u * 0.4), C.win, lw(u) * 0.6); sk(rrPts(x + 7 * u, gy - 16 * u, 3 * u, 4 * u, u * 0.4), C.win, lw(u) * 0.6); sk(rrPts(x + 3 * u, gy - 7 * u, 6 * u, 7 * u, u * 0.4), "#C9B79C", lw(u) * 0.6); }
}
/** highway signboard to the kampung */
export function kampungSign(x: number, gy: number, u: number, label: string) {
  skLine([[x - 6 * u, gy], [x - 6 * u, gy - 14 * u]], u); skLine([[x + 6 * u, gy], [x + 6 * u, gy - 14 * u]], u);
  sk(rrPts(x - 9 * u, gy - 21 * u, 18 * u, 8 * u, u), "#7FB7B0", lw(u)); g.fillStyle = "#FFFFFF"; g.font = `600 ${Math.round(3.2 * u)}px Fredoka, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(label, x, gy - 17 * u);
}
export { palm, mix };
/** top-down car park: asphalt speckle, kerb planters with round trees, mall awning along the top */
export function carparkTop() {
  const { W, H, U: u } = D; seed(W, H, 21); g.fillStyle = "rgba(120,110,100,.10)"; for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(rand() * W, rand() * H, u * 0.5, 0, 7); g.fill(); }
  const aw = Math.max(5 * u, H * 0.05); R(0, 0, W, aw * 1.6, "#EDE6F2"); for (let x = 0, i = 0; x < W; x += 8 * u, i++) { g.fillStyle = i % 2 ? C.lav : C.cream; g.fillRect(x, aw * 1.6, 8 * u, aw * 0.5); }
  skLine([[0, aw * 2.1], [W, aw * 2.1]], lw(u));
  const pw = Math.max(6 * u, W * 0.045); for (const x of [0, W - pw]) { sk(rrPts(x - u, aw * 2.4, pw + u, H, u), "#B9D3A8", lw(u)); for (let y = aw * 2.4 + pw; y < H; y += pw * 2.2) sk(elPts(x + pw / 2, y, pw * 0.42, pw * 0.42, 12), "#86AE76", lw(u) * 0.7); }
}
