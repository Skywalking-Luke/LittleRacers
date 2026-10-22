import { cur } from "./core";
import { g, D, C, R, MIN, hit, Rect, Scene, Pt, go, resize, loop, sfx, say, box, txt, star, fullscreen, ptri, pcirc } from "./core";
import { veh, place, garage, shape, btnBox, speakerIcon, backdrop } from "./art";
import { setHome, drizzle } from "./game";
import { S, setLang, setMute, setMusic, setRain, unlock } from "./audio";
import { Beep, Wash, Peek, ColourPark, Light, Build } from "./games1";
import { Bedtime } from "./bedtime";
import { Count, Maze, ShapeGarage, LetterRoad, Race, Helper, Kampung } from "./games2";

type GDef = { id: string; age: number; name: string; col: string; make: () => Scene; icon: (x: number, y: number, s: number) => void };
const U = (s: number, n: number) => Math.max(2, Math.floor(s / n));
const GAMES: GDef[] = [
  { id: "beep", age: 2, name: "g_beep", col: C.yellow, make: () => new Beep(), icon: (x, y, s) => { veh("car", x + s / 2, y + s * 0.72, U(s, 24), C.red); txt("!", x + s * 0.82, y + s * 0.25, s * 0.2, C.white); } },
  { id: "wash", age: 2, name: "g_wash", col: C.blue, make: () => new Wash(), icon: (x, y, s) => { veh("car", x + s / 2, y + s * 0.72, U(s, 24), C.green); for (let i = 0; i < 4; i++) pcirc(x + s * (0.25 + i * 0.17), y + s * 0.25 + (i % 2) * s * 0.08, s * 0.06, C.white); } },
  { id: "peek", age: 2, name: "g_peek", col: C.green, make: () => new Peek(), icon: (x, y, s) => garage(x + s * 0.18, y + s * 0.32, s * 0.64, s * 0.5, C.lav, 0.5, U(s, 40)) },
  { id: "colour", age: 3, name: "g_colour", col: C.pink, make: () => new ColourPark(), icon: (x, y, s) => { const c = [C.red, C.yellow, C.blue]; for (let i = 0; i < 3; i++) R(x + s * (0.12 + i * 0.27), y + s * 0.2, s * 0.22, s * 0.6, c[i]); veh("car", x + s * 0.5, y + s * 0.7, U(s, 34), C.yellow); } },
  { id: "light", age: 3, name: "g_light", col: C.lav, make: () => new Light(), icon: (x, y, s) => { box(x + s * 0.35, y + s * 0.1, s * 0.3, s * 0.78, C.k, U(s, 30), C.k); pcirc(x + s * 0.5, y + s * 0.25, s * 0.09, "#E07A6E"); pcirc(x + s * 0.5, y + s * 0.49, s * 0.09, C.yellow); pcirc(x + s * 0.5, y + s * 0.73, s * 0.09, "#8CD3A0"); } },
  { id: "build", age: 3, name: "g_build", col: C.orange, make: () => new Build(), icon: (x, y, s) => { veh("build", x + s / 2, y + s * 0.7, U(s, 28), C.blue, { body: true, wheels: 3 }); shape("circle", x + s * 0.8, y + s * 0.25, s * 0.08, C.k, U(s, 40)); } },
  { id: "count", age: 4, name: "g_count", col: C.yellow, make: () => new Count(), icon: (x, y, s) => { txt("123", x + s / 2, y + s * 0.3, s * 0.18, C.white); veh("car", x + s * 0.3, y + s * 0.8, U(s, 44), C.red); veh("car", x + s * 0.7, y + s * 0.8, U(s, 44), C.blue); } },
  { id: "maze", age: 4, name: "g_maze", col: C.green, make: () => new Maze(), icon: (x, y, s) => { g.strokeStyle = C.road; g.lineWidth = s * 0.12; g.beginPath(); g.moveTo(x + s * 0.15, y + s * 0.8); g.lineTo(x + s * 0.4, y + s * 0.8); g.lineTo(x + s * 0.4, y + s * 0.4); g.lineTo(x + s * 0.8, y + s * 0.4); g.stroke(); place("home", x + s * 0.78, y + s * 0.42, U(s, 70)); veh("car", x + s * 0.22, y + s * 0.84, U(s, 60), C.red); } },
  { id: "shape", age: 4, name: "g_shape", col: C.blue, make: () => new ShapeGarage(), icon: (x, y, s) => { const u = U(s, 40); shape("circle", x + s * 0.25, y + s * 0.35, s * 0.1, C.red, u); shape("square", x + s * 0.5, y + s * 0.35, s * 0.1, C.yellow, u); shape("triangle", x + s * 0.75, y + s * 0.35, s * 0.1, C.green, u); veh("car", x + s / 2, y + s * 0.85, U(s, 36), C.lav); } },
  { id: "letter", age: 5, name: "g_letter", col: C.pink, make: () => new LetterRoad(), icon: (x, y, s) => { txt("ABC", x + s / 2, y + s * 0.32, s * 0.2, C.white); veh("car", x + s / 2, y + s * 0.82, U(s, 30), C.red); } },
  { id: "race", age: 5, name: "g_race", col: C.lav, make: () => new Race(), icon: (x, y, s) => { veh("kancil", x + s * 0.22, y + s * 0.8, U(s, 50), C.red); veh("car", x + s * 0.5, y + s * 0.8, U(s, 44), C.yellow); veh("bus", x + s * 0.5, y + s * 0.45, U(s, 40), C.blue); } },
  { id: "help", age: 5, name: "g_help", col: C.orange, make: () => new Helper(), icon: (x, y, s) => { veh("fire", x + s / 2, y + s * 0.5, U(s, 34), C.red); veh("amb", x + s / 2, y + s * 0.88, U(s, 44), C.white); } },
  { id: "kampung", age: 5, name: "g_kampung", col: C.green, make: () => new Kampung(), icon: (x, y, s) => { place("atuk", x + s * 0.55, y + s * 0.82, U(s, 36)); } },
];

// break suggestion after ~10 minutes of play
let playSec = 0, breakShown = false;
setInterval(() => { if (document.visibilityState === "visible") playSec++; }, 1000);

class Hub implements Scene {
  btns: { r: Rect; d: GDef }[] = []; ages: { r: Rect; a: number }[] = []; lang: Rect; par: Rect; bed: Rect; hold = 0; holding = false; parent = false; pbtn: Record<string, Rect> = {}; pressed = -1; brk = false; t = 0;
  enter() { if (playSec > 600 && !breakShown) { breakShown = true; this.brk = true; setTimeout(() => say("x_break"), 300); } }
  layout() {
    const land = D.W > D.H, u = D.U, s = Math.max(MIN, Math.round(Math.min(D.W, D.H) * 0.12));
    this.lang = { x: D.W - s * 1.6 - u * 3, y: u * 3, w: s * 1.6, h: s };
    this.par = { x: u * 3, y: D.H - s - u * 3, w: s, h: s };
    this.bed = { x: D.W - s * 2.2 - u * 3, y: D.H - s * 1.1 - u * 3, w: s * 2.2, h: s * 1.1 };
    const top = s + u * 8, bottom = D.H - s - u * 6; this.btns = []; this.ages = [];
    if (land) {
      const cw = D.W / 4, bh = Math.min((cw - u * 6) / 2.1, (bottom - top) / 2.9);
      for (let a = 2; a <= 5; a++) { const gs = GAMES.filter((g) => g.age === a), cx = cw * (a - 2) + cw / 2; this.ages.push({ r: { x: cx - bh * 0.3, y: top, w: bh * 0.6, h: bh * 0.6 }, a });
        gs.forEach((d, i) => this.btns.push({ r: { x: cx - bh * 1.04 + (i % 2) * bh * 1.08, y: top + bh * 0.75 + Math.floor(i / 2) * bh * 1.08, w: bh, h: bh }, d })); }
    } else {
      const rh = (bottom - top) / 4, bw = Math.min(rh * 0.45, D.W * 0.13), bs = Math.min(rh * 0.9, (D.W - bw - u * 10) / 4.25);
      for (let a = 2; a <= 5; a++) { const gs = GAMES.filter((g) => g.age === a), y = top + rh * (a - 2); this.ages.push({ r: { x: u * 2, y: y + rh / 2 - bw / 2, w: bw, h: bw }, a });
        gs.forEach((d, i) => this.btns.push({ r: { x: u * 5 + bw + i * bs * 1.05, y: y + (rh - bs) / 2, w: bs, h: bs }, d })); }
    }
    const keys = ["sound", "music", "rain", "lang", "arcade", "close"], ph = Math.max(MIN, Math.min(80, D.H * 0.095));
    const two = keys.length * (ph + u * 3) + u * 40 > D.H, cols = two ? 2 : 1, rows = keys.length / cols;
    const pw = two ? Math.min(D.W * 0.42, 400) : Math.min(D.W * 0.8, 520), gap = u * 4, tot = pw * cols + gap * (cols - 1), px0 = (D.W - tot) / 2;
    const py0 = Math.max(u * 18, D.H / 2 - (rows * (ph + u * 3)) / 2);
    keys.forEach((k, i) => { const c = two ? i % 2 : 0, r = two ? Math.floor(i / 2) : i; this.pbtn[k] = { x: px0 + c * (pw + gap), y: py0 + r * (ph + u * 3), w: pw, h: ph }; });
  }
  update(dt: number) { this.t += dt; if (this.holding) { this.hold += dt; if (this.hold >= 3) { this.holding = false; this.hold = 0; this.parent = true; sfx.ding(); say("x_parent"); } } }
  draw() {
    const u = D.U; R(0, 0, D.W, D.H, C.bg);
    backdrop("kampung", 0.94);
    txt("LITTLE RACERS", D.W / 2, this.lang.y + this.lang.h / 2, Math.min(34, (D.W - this.lang.w * 2 - u * 8) / 13), C.yellow);
    for (const a of this.ages) { const r = a.r; pcirc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2, C.k); pcirc(r.x + r.w / 2, r.y + r.h / 2, r.w / 2 - u, C.white); txt(String(a.a), r.x + r.w / 2, r.y + r.h / 2 + 2, r.h * 0.5, C.red, "center", false); }
    this.btns.forEach((b, i) => { const r = b.r, p = this.pressed === i; btnBox(r.x, r.y, r.w, r.h, b.d.col, p); g.save(); g.beginPath(); g.rect(r.x + u, r.y + u, r.w - 2 * u, r.h - 2 * u); g.clip(); b.d.icon(r.x + (p ? u : 0), r.y + (p ? u : 0), r.w); g.restore(); });
    const l = this.lang; btnBox(l.x, l.y, l.w, l.h, C.white); txt(S.lang === "en" ? "EN" : "BM", l.x + l.w / 2, l.y + l.h / 2, l.h * 0.32, S.lang === "en" ? C.blue : C.red);
    const p = this.par; btnBox(p.x, p.y, p.w, p.h, C.grey); // lock icon + hold ring
    R(p.x + p.w * 0.3, p.y + p.h * 0.45, p.w * 0.4, p.h * 0.32, C.k); R(p.x + p.w * 0.36, p.y + p.h * 0.22, p.w * 0.06, p.h * 0.25, C.k); R(p.x + p.w * 0.58, p.y + p.h * 0.22, p.w * 0.06, p.h * 0.25, C.k); R(p.x + p.w * 0.36, p.y + p.h * 0.2, p.w * 0.28, p.h * 0.06, C.k);
    if (this.holding) { g.strokeStyle = C.green; g.lineWidth = u * 2; g.beginPath(); g.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.62, -Math.PI / 2, -Math.PI / 2 + (this.hold / 3) * Math.PI * 2); g.stroke(); }
    const bd = this.bed; btnBox(bd.x, bd.y, bd.w, bd.h, "#2E3A59"); pcirc(bd.x + bd.w * 0.25, bd.y + bd.h * 0.45, bd.h * 0.26, "#F2D894"); pcirc(bd.x + bd.w * 0.25 + bd.h * 0.12, bd.y + bd.h * 0.38, bd.h * 0.22, "#2E3A59");
    for (let i = 0; i < 3; i++) star(bd.x + bd.w * (0.55 + i * 0.13), bd.y + bd.h * (0.3 + (i % 2) * 0.2), bd.h * 0.08, "#FAF6EE", false);
    veh("jeep", bd.x + bd.w * 0.7, bd.y + bd.h * 0.88, Math.max(2, Math.floor(bd.h / 26)), C.green);
    if (S.rain) drizzle();
    if (this.parent) this.drawParent();
    if (this.brk) { R(0, 0, D.W, D.H, "rgba(250,246,238,.94)"); const s = Math.min(D.W, D.H); pcirc(D.W / 2, D.H * 0.4, s * 0.16, "#F4D7A0"); R(D.W / 2 - s * 0.06, D.H * 0.36, s * 0.03, s * 0.015, C.k); R(D.W / 2 + s * 0.03, D.H * 0.36, s * 0.03, s * 0.015, C.k); R(D.W / 2 - s * 0.04, D.H * 0.44, s * 0.08, s * 0.015, C.k); txt("z z z", D.W / 2 + s * 0.2, D.H * 0.25, s * 0.05, C.lav, "center", false); txt("TIME FOR A BREAK", D.W / 2, D.H * 0.66, Math.min(D.W / 22, 22), C.k, "center", false); txt("(tap to close)", D.W / 2, D.H * 0.74, Math.min(D.W / 40, 12), C.dark, "center", false); }
  }
  drawParent() {
    R(0, 0, D.W, D.H, "rgba(74,74,72,.6)"); const b = this.pbtn, u = D.U, fs = Math.min(16, D.W / 34);
    const all = Object.values(b); const x0 = Math.min(...all.map((r) => r.x)), x1 = Math.max(...all.map((r) => r.x + r.w)), y1 = Math.max(...all.map((r) => r.y + r.h)); const top = all[0].y - u * 14; box(x0 - u * 4, top, x1 - x0 + u * 8, y1 + u * 14 - top, C.bg, u);
    txt("PARENT CORNER", D.W / 2, top + u * 7, fs, C.k, "center", false);
    const y1b = 0; const row = (k: string, label: string, on?: boolean) => { const r = b[k]; btnBox(r.x, r.y, r.w, r.h, on === undefined ? C.yellow : on ? C.green : C.grey); txt(label, r.x + r.w / 2, r.y + r.h / 2, fs * 0.9, C.k, "center", false); };
    row("sound", "SOUND & VOICE: " + (S.mute ? "OFF" : "ON"), !S.mute);
    row("music", "SOFT MUSIC: " + (S.music ? "ON" : "OFF"), S.music);
    row("rain", "GENTLE RAIN: " + (S.rain ? "ON" : "OFF"), S.rain);
    row("lang", "LANGUAGE: " + (S.lang === "en" ? "ENGLISH" : "BAHASA MELAYU"));
    row("arcade", "LH CARS ARCADE HOME");
    row("close", "CLOSE");
    const ny = y1 + u * 4;
    txt("No ads, no tracking, no data collected.", D.W / 2, ny, fs * 0.6, C.dark, "center", false);
    txt("Tanpa iklan, tanpa jejak, tiada data.", D.W / 2, ny + fs * 1.3, fs * 0.6, C.dark, "center", false);
  }
  down(p: Pt) {
    if (this.brk) { this.brk = false; playSec = 0; return; }
    if (this.parent) {
      const b = this.pbtn; sfx.tap();
      if (hit(p, b.sound)) setMute(!S.mute); else if (hit(p, b.music)) setMusic(!S.music); else if (hit(p, b.rain)) setRain(!S.rain);
      else if (hit(p, b.lang)) { setLang(S.lang === "en" ? "bm" : "en"); say("x_lang"); } else if (hit(p, b.arcade)) { location.href = "https://lhcars.my/"; } else if (hit(p, b.close)) this.parent = false;
      return;
    }
    if (hit(p, this.par, 4)) { this.holding = true; this.hold = 0; return; }
    if (hit(p, this.bed, 4)) { sfx.tap(); go(new Bedtime()); return; }
    if (hit(p, this.lang, 4)) { setLang(S.lang === "en" ? "bm" : "en"); sfx.tap(); say("x_lang"); return; }
    this.btns.forEach((b, i) => { if (hit(p, b.r)) this.pressed = i; });
  }
  up(p: Pt) {
    this.holding = false; this.hold = 0;
    if (this.pressed >= 0) { const b = this.btns[this.pressed]; this.pressed = -1; if (hit(p, b.r, 10)) { sfx.tap(); fullscreen(); const s = b.d.make(); go(s); say(b.d.name, undefined, true).then(() => { if ((window as any).__cur === s) (s as any).prompt && (s as any).prompt(); }); (window as any).__cur = s; } }
  }
}
const hub = new Hub();
setHome(() => hub);
(window as any).__lr = { go, hub, GAMES, D, cur: () => cur() };
addEventListener("resize", resize);
addEventListener("orientationchange", () => setTimeout(resize, 200));
go(hub); resize();
(document as any).fonts && (document as any).fonts.load("16px PS2P").catch(() => {});
requestAnimationFrame(loop);
